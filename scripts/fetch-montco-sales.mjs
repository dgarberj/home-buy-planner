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
 *   node scripts/fetch-montco-sales.mjs --per-town=5      # cap kept per municipality
 *
 * --per-town caps how many sales survive per municipality (most recent
 * first, complete records only -- see isComplete()), so a full-county run
 * produces something a human can actually review and paste in, rather than
 * every record the service returns. Default of 5 is a curation choice, not
 * an app-wide policy (contrast src/config.ts's staleness thresholds, which
 * the app enforces at read time), so it lives here rather than there.
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
const perTown = Number(args["per-town"] ?? 5);
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

// localMarket.ts is inconsistent about whether it keeps the Borough/Township
// suffix: it drops it everywhere EXCEPT where the county has both a Borough
// and a Township of the same base name (Hatfield), where dropping it would
// collide with something else in the SAME county (Montgomery Township), or
// where dropping it would collide with a DIFFERENT county's town of the same
// name (Springfield Township vs. Delaware County's Springfield). Stripping
// blindly would misfile all three. Keep the raw suffix for exactly these
// known-ambiguous names.
const KEEP_SUFFIX_FOR = new Set(["Hatfield", "Montgomery", "Springfield"]);

// The county's own Muni_Name for Norristown carries its legal designation,
// not the plain name localMarket.ts (and everything else in the app) uses.
const NAME_OVERRIDES = {
  "Municipality of Norristown": "Norristown",
};

/**
Strips the " Borough" / " Township" suffix the county uses so records line
up with `Municipality.name` in localMarket.ts -- except for the known
ambiguous/overridden cases above.
*/
function cleanMuniName(raw) {
  if (raw in NAME_OVERRIDES) return NAME_OVERRIDES[raw];
  const stripped = raw.replace(/\s+(Borough|Township)$/i, "").trim();
  return KEEP_SUFFIX_FOR.has(stripped) ? raw.trim() : stripped;
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

/**
Records missing beds/baths/sqft don't give a buyer anything to compare
against -- excluded from the curated output (still present in the raw
service response, just not worth a human's review time here).
*/
function isComplete(sale) {
  return (
    Boolean(sale.address) &&
    Boolean(sale.saleDate) &&
    sale.beds !== undefined &&
    sale.baths !== undefined &&
    sale.sqft !== undefined
  );
}

async function main() {
  const munis = singleMuni ? [singleMuni] : await listMunicipalities();
  console.error(
    `Fetching sales since ${cutoffStr}, >$${minPrice}, across ${munis.length} municipalities, capped at ${perTown}/town...`,
  );

  const out = [];
  for (const raw of munis) {
    const attrsList = await fetchSalesFor(raw);
    const clean = cleanMuniName(raw);
    // fetchSalesFor already orders SALE_DATE_ DESC, so this keeps the most
    // recent complete records per town.
    const kept = attrsList
      .map((attrs) => toRecentSale(attrs, clean))
      .filter(isComplete)
      .slice(0, perTown);
    out.push(...kept);
    if (kept.length > 0) {
      console.error(
        `  ${raw}: ${kept.length} of ${attrsList.length} sale(s) kept`,
      );
    }
  }

  console.log(
    `// Generated by scripts/fetch-montco-sales.mjs on ${new Date().toISOString().slice(0, 10)}`,
  );
  console.log(
    `// ${out.length} records, >= ${cutoffStr}, > $${minPrice}, residential only,`,
  );
  console.log(
    `// capped at ${perTown} most-recent complete record(s) per municipality.`,
  );
  console.log(
    "// Review before pasting into src/data/recentSales.ts -- CLASS=R, the",
  );
  console.log(
    "// price/date/completeness filters above, and the per-town cap are",
  );
  console.log("// mechanical; they don't replace a human glance.");
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
