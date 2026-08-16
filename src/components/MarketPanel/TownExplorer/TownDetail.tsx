import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { climateRiskFor } from "../../../data/climateRisk";
import { closingCosts } from "../../../data/closingCosts";
import { SALE_STALE_LABEL, isSaleStale, medianOf, salesIn } from "../../../data/recentSales";
import { districtFor, ratingSummary } from "../../../data/schools";
import { cashToClose } from "../../../engine/affordability";
import {
  costOfTownAtPrice,
  type RankedTown,
} from "../../../hooks/useRankedTowns";
import { money, monthLabel, pct } from "../../../lib/format";
import type { Assumptions } from "../../../model/types";
import { Table, Td, Th } from "../../ui";
import { REACH_LABEL, REACH_STYLE } from "./reach";

const REACH_KEY: Record<string, string> = {
  comfortable: "marketPanel.townCard.reach.comfortable",
  stretch: "marketPanel.townCard.reach.stretch",
  "out-of-reach": "marketPanel.townCard.reach.outOfReach",
  unknown: "marketPanel.townCard.reach.unknown",
};

const COUNTY_KEY_LABEL: Record<string, string> = {
  delaware: "marketPanel.townCard.county.delaware",
  montgomery: "marketPanel.townCard.county.montgomery",
};

function saleDateLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return monthLabel(`${y}-${String(m).padStart(2, "0")}`, 1);
}

function bathsLabel(
  t: TFunction,
  baths?: number,
  halfBaths?: number,
): string {
  if (!baths && !halfBaths) return "—";
  return halfBaths
    ? t("marketPanel.townDetail.bathsHalf", "{{baths}} + {{half}} half", {
        baths: baths ?? 0,
        half: halfBaths,
      })
    : `${baths}`;
}

export default function TownDetail({
  row,
  assumptions,
  creditScore,
  priceOverride,
}: {
  row: RankedTown;
  assumptions: Assumptions;
  creditScore: number;
  /**
   * "Test this price instead" -- when set, affordability figures below are
   * priced at this hypothetical rather than the town's own median.
   */
  priceOverride: number | null;
}) {
  const { t } = useTranslation();
  const { m, rate } = row;
  const displayPrice = priceOverride ?? m.medianPrice ?? null;
  const cost =
    priceOverride == null
      ? row.cost
      : costOfTownAtPrice(assumptions, rate, priceOverride, creditScore);

  const district = districtFor(m.schoolDistrict);
  const climate = climateRiskFor(m.countyKey);
  const { freshSales, staleCount } = useMemo(() => {
    const sales = salesIn(m.name);
    const fresh = sales
      .filter((s) => !isSaleStale(s))
      .toSorted((a, b) => b.saleDate.localeCompare(a.saleDate));
    return { freshSales: fresh, staleCount: sales.length - fresh.length };
  }, [m.name]);
  const closing = displayPrice ? closingCosts(displayPrice, m.name) : null;

  return (
    <div className="space-y-5 border-t border-slate-100 px-4 py-4">
      {/* Affordability */}
      <section>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("marketPanel.townDetail.affordability", "Affordability")}
        </h5>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${REACH_STYLE[row.reach]}`}
          >
            {t(REACH_KEY[row.reach] ?? "", REACH_LABEL[row.reach])}
          </span>
          {cost && (
            <span className="whitespace-nowrap text-lg font-semibold tabular-nums">
              {t("marketPanel.townDetail.perMonth", "{{amount}}/mo", {
                amount: money(cost.total),
              })}
              {priceOverride != null && (
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {t("marketPanel.townDetail.testPrice", "(test price)")}
                </span>
              )}
            </span>
          )}
        </div>
        {cost ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {t("marketPanel.townDetail.loanPayment", "Loan payment")}
              </dt>
              <dd className="tabular-nums">
                {money(cost.principalAndInterest)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {t(
                  "marketPanel.townDetail.propertyTax",
                  "Property + school tax",
                )}
              </dt>
              <dd className="tabular-nums">{money(cost.tax)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {t(
                  "marketPanel.townDetail.mortgageInsurance",
                  "Mortgage insurance",
                )}
              </dt>
              <dd className="tabular-nums">
                {cost.pmi > 0 ? money(cost.pmi) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {t(
                  "marketPanel.townDetail.insuranceUpkeep",
                  "Insurance + upkeep",
                )}
              </dt>
              <dd className="tabular-nums">
                {money(cost.insurance + cost.maintenance)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            {t(
              "marketPanel.townDetail.noSourcedPrice",
              "No sourced median price for {{name}} -- can't price a specific house here without a \"price to test\" override.",
              { name: m.name },
            )}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {t(
            "marketPanel.townDetail.effectiveTaxRate",
            "Effective tax rate {{rate}}",
            { rate: pct(rate, 2) },
          )}
          {displayPrice != null &&
            ` · ${t(
              "marketPanel.townDetail.cashToClose",
              "cash to close {{amount}}",
              { amount: money(cashToClose(assumptions, displayPrice)) },
            )}`}
        </p>
      </section>

      {/* Schools */}
      <section>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("marketPanel.townDetail.schools", "Schools")}
        </h5>
        <p className="mt-1 text-sm text-slate-600">{m.schoolDistrict}</p>
        {district && district.mathProficiency !== null ? (
          <p className="mt-1 text-sm text-slate-600">
            {ratingSummary(m.schoolDistrict)} {district.note}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            {t(
              "marketPanel.townDetail.schoolsNotSourced",
              "School performance not sourced for {{district}}.",
              { district: m.schoolDistrict },
            )}
          </p>
        )}
      </section>

      {/* Recent sales */}
      {freshSales.length > 0 && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("marketPanel.townDetail.recentSales", "Recent sales")}
          </h5>
          <p className="mt-1 text-xs text-slate-500">
            {t(
              "marketPanel.townDetail.freshSalesCount",
              `{{count}} fresh sale${freshSales.length === 1 ? "" : "s"}`,
              { count: freshSales.length },
            )}
            {staleCount > 0 &&
              ` ${t(
                "marketPanel.townDetail.staleExcluded",
                "({{count}} more excluded as stale, past the {{threshold}} threshold)",
                { count: staleCount, threshold: SALE_STALE_LABEL },
              )}`}
            .
          </p>
          <Table minWidthClassName="min-w-[560px]" className="mt-2">
            <thead>
              <tr className="border-b border-slate-200">
                <Th className="py-2">
                  {t("marketPanel.townDetail.columns.address", "Address")}
                </Th>
                <Th className="py-2">
                  {t("marketPanel.townDetail.columns.sold", "Sold")}
                </Th>
                <Th align="right" className="py-2">
                  {t("marketPanel.townDetail.columns.price", "Price")}
                </Th>
                <Th align="right" className="py-2">
                  {t("marketPanel.townDetail.columns.beds", "Beds")}
                </Th>
                <Th align="right" className="py-2">
                  {t("marketPanel.townDetail.columns.baths", "Baths")}
                </Th>
                <Th align="right" className="py-2">
                  {t("marketPanel.townDetail.columns.sqft", "Sqft")}
                </Th>
                <Th align="right" className="py-2">
                  {t("marketPanel.townDetail.columns.built", "Built")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {freshSales.map((sale) => (
                <tr
                  key={sale.address}
                  className="border-b border-slate-50 last:border-0"
                >
                  <Td className="py-2 text-slate-700">{sale.address}</Td>
                  <Td className="py-2 text-slate-500">
                    {saleDateLabel(sale.saleDate)}
                  </Td>
                  <Td
                    align="right"
                    className="py-2 font-medium tabular-nums text-slate-900"
                  >
                    {money(sale.salePrice)}
                  </Td>
                  <Td align="right" className="py-2 tabular-nums">
                    {sale.beds ?? "—"}
                  </Td>
                  <Td align="right" className="py-2 tabular-nums">
                    {bathsLabel(t, sale.baths, sale.halfBaths)}
                  </Td>
                  <Td align="right" className="py-2 tabular-nums">
                    {sale.sqft ? sale.sqft.toLocaleString() : "—"}
                  </Td>
                  <Td align="right" className="py-2 tabular-nums">
                    {sale.yearBuilt ?? "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {freshSales.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              <Trans
                i18nKey="marketPanel.townDetail.medianOfFreshSales"
                components={{ b: <strong /> }}
                values={{ amount: money(medianOf(freshSales) ?? 0) }}
              >
                Median of the fresh sales shown: {"{{amount}}"}. A handful of
                records, not a market statistic — see <b>Sources</b> below
                for what this is and isn't.
              </Trans>
            </p>
          )}
        </section>
      )}

      {/* Climate */}
      {climate && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("marketPanel.townDetail.climateRisk", "Climate risk")}
          </h5>
          <p className="mt-1 text-xs text-amber-700">
            {t(
              "marketPanel.townDetail.climateCountyWide",
              "County-wide, not town-specific — every town in {{county}} shares these figures.",
              { county: t(COUNTY_KEY_LABEL[m.countyKey] ?? "", m.countyKey) },
            )}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">
                {t("marketPanel.townDetail.flood", "Flood")}
              </dt>
              <dd className="tabular-nums">{climate.floodRiskRating}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">
                {t("marketPanel.townDetail.heat", "Heat")}
              </dt>
              <dd className="tabular-nums">{climate.heatWaveRiskRating}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">
                {t("marketPanel.townDetail.wildfire", "Wildfire")}
              </dt>
              <dd className="tabular-nums">{climate.wildfireRiskRating}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">{climate.note}</p>
        </section>
      )}

      {/* Closing costs */}
      {closing && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("marketPanel.townDetail.closingCosts", "Closing costs")}
          </h5>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              "marketPanel.townDetail.closingCostsSummary",
              "About {{total}} ({{pct}} of price) at {{price}}.",
              {
                total: money(closing.total),
                pct: pct(closing.pctOfPrice, 1),
                price: money(displayPrice ?? 0),
              },
            )}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {closing.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-3">
                <span>{l.label}</span>
                <span className="tabular-nums">{money(l.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
