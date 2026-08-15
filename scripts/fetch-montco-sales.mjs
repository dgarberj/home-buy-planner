#!/usr/bin/env node
/**
 * Regenerates src/data/recentSales.ts from Montgomery County's live parcel
 * feature service.
 *
 * Why this is a script and not just an API call from the app: the app is
 * client-side only with no backend (see CLAUDE.md), so nothing in `src/`
 * should be hitting an external service at runtime -- everything sourced
 * data-wise gets fetched once, reviewed, and committed as a static file, the
 * same way `localMarket.ts` and `schools.ts` already work. This script is
 * that one-time (or periodic) fetch step, run locally, not part of the build.
 *
 * Usage:
 *   node scripts/fetch-montco-sales.mjs                  # last 12 months, all towns
 *   node scripts/fetch-montco-sales.mjs --months=6        # last 6 months
 *   node scripts/fetch-montco-sales.mjs --min-price=75000
 *   node scripts/fetch-montco-sales.mjs --muni="Conshohocken Borough"
 *
 * Default window is 12 months (not, say, 18 or 24) because
 * docs/adr/0001-stale-data-threshold.md sets a 1-year staleness threshold for
 * home sales -- src/data/freshness.ts filters anything older out of the app
 * regardless, so pulling more than that just means reviewing and discarding
 * records that will never be shown.
 *
 * Prints TypeScript for a `RecentSale[]` array to stdout -- review it, then
 * paste the records you want into src/data/recentSales.ts (or pipe to a
 * file and merge by hand). Deliberately not auto-overwriting the committed
 * file: this is real transaction data with real addresses, and the shape of
 * the county's own filtering (arm's-length transfers, condo common elements,
 * commercial parcels) needs a human glance before it ships.
 */

const SERVICE =
  "https://services1.arcgis.com/kOChldNuKsox8qZD/arcgis/rest/services/Montgomery_County_Parcels/FeatureServer/6/query";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const months = Number(args.months ?? 12);
const minPrice = Number(args["min-price"] ?? 50_000);
const singleMuni = typeof args.muni === "string" ? args.muni : null;
const pageSize = 1000; // service's own maxRecordCount

const cutoff = new Date();
cutoff.setMonth(cutoff.getMonth() - months);
const cutoffStr = cutoff.toISOString().slice(0, 10);

async function esriQuery(params) {
  const url = `${SERVICE}?${new URLSearchParams({ f: "json", ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

/**
Distinct Muni_Name values the service actually uses -- these carry
Borough/Township suffixes that don't always match the clean names in
localMarket.ts, so this discovers the real strings rather than guessing them.
*/
async function listMunicipalities() {
  const json = await esriQuery({
    where: "1=1",
    groupByFieldsForStatistics: "Muni_Name",
    outStatistics: JSON.stringify([
      {
        statisticType: "count",
        onStatisticField: "OBJECTID",
        outStatisticFieldName: "n",
      },
    ]),
  });
  return json.features
    .map((f) => f.attributes.Muni_Name)
    .filter(Boolean)
    .sort();
}

/**
Strips the " Borough" / " Township" suffix the county uses so records line
up with `Municipality.name` in localMarket.ts.
*/
function cleanMuniName(raw) {
  return raw.replace(/\s+(Borough|Township)$/i, "").trim();
}

function toEsriDate(str) {
  // ArcGIS date-literal queries want DATE 'YYYY-MM-DD'.
  return `DATE '${str}'`;
}

async function fetchSalesFor(muniName) {
  const where = [
    `Muni_Name='${muniName.replace(/'/g, "''")}'`,
    `CONSIDERAT>${minPrice}`,
    `SALE_DATE_>=${toEsriDate(cutoffStr)}`,
    `CLASS='R'`, // residential only -- drops commercial/common-area/vacant parcels
  ].join(" AND ");

  const records = [];
  let offset = 0;
  for (;;) {
    const json = await esriQuery({
      where,
      outFields: "*",
      returnGeometry: "false",
      orderByFields: "SALE_DATE_ DESC",
      resultRecordCount: String(pageSize),
      resultOffset: String(offset),
    });
    const features = json.features ?? [];
    records.push(...features.map((f) => f.attributes));
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return records;
}

function toRecentSale(attrs, municipality) {
  const num = (v) => {
    const n = Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  return {
    municipality,
    address: String(attrs.ADDR1 ?? "").trim(),
    saleDate: attrs.SALE_DATE_
      ? new Date(attrs.SALE_DATE_).toISOString().slice(0, 10)
      : undefined,
    salePrice: attrs.CONSIDERAT,
    yearBuilt: num(attrs.YEAR_BUILT),
    beds: num(attrs.BEDROOMS),
    baths: num(attrs.BATHS),
    halfBaths: num(attrs.HALF_BATHS),
    sqft: num(attrs.SFLA),
  };
}

function toTsLiteral(sale) {
  const fields = [
    `municipality: ${JSON.stringify(sale.municipality)}`,
    `address: ${JSON.stringify(sale.address)}`,
    `saleDate: ${JSON.stringify(sale.saleDate)}`,
    `salePrice: ${sale.salePrice}`,
  ];
  if (sale.yearBuilt) fields.push(`yearBuilt: ${sale.yearBuilt}`);
  if (sale.beds) fields.push(`beds: ${sale.beds}`);
  if (sale.baths) fields.push(`baths: ${sale.baths}`);
  if (sale.halfBaths) fields.push(`halfBaths: ${sale.halfBaths}`);
  if (sale.sqft) fields.push(`sqft: ${sale.sqft}`);
  return `  { ${fields.join(", ")} },`;
}

async function main() {
  const munis = singleMuni ? [singleMuni] : await listMunicipalities();
  console.error(
    `Fetching sales since ${cutoffStr}, >$${minPrice}, across ${munis.length} municipalities...`,
  );

  const out = [];
  for (const raw of munis) {
    const attrsList = await fetchSalesFor(raw);
    const clean = cleanMuniName(raw);
    for (const attrs of attrsList) {
      const sale = toRecentSale(attrs, clean);
      if (!sale.address || !sale.saleDate) continue; // skip incomplete records
      out.push(sale);
    }
    if (attrsList.length > 0) {
      console.error(`  ${raw}: ${attrsList.length} sale(s)`);
    }
  }

  console.log(
    `// Generated by scripts/fetch-montco-sales.mjs on ${new Date().toISOString().slice(0, 10)}`,
  );
  console.log(
    `// ${out.length} records, >= ${cutoffStr}, > $${minPrice}, residential only.`,
  );
  console.log(
    "// Review before pasting into src/data/recentSales.ts -- this is unfiltered",
  );
  console.log("// beyond CLASS=R and the price/date thresholds above.");
  console.log(
    "// Records older than 1 year are filtered out at read time anyway --",
  );
  console.log(
    "// see docs/adr/0001-stale-data-threshold.md and src/data/freshness.ts.",
  );
  for (const sale of out) {
    console.log(toTsLiteral(sale));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
