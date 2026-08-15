import { useMemo } from "react";
import { climateRiskFor } from "../../../data/climateRisk";
import { closingCosts } from "../../../data/closingCosts";
import { isSaleStale, medianOf, salesIn } from "../../../data/recentSales";
import { districtFor, ratingSummary } from "../../../data/schools";
import { STALE_THRESHOLD_LABEL } from "../../../data/freshness";
import { cashToClose } from "../../../engine/affordability";
import {
  costOfTownAtPrice,
  type RankedTown,
} from "../../../hooks/useRankedTowns";
import { money, monthLabel, pct } from "../../../lib/format";
import type { Assumptions } from "../../../model/types";
import { Table, Td, Th } from "../../ui";
import { REACH_LABEL, REACH_STYLE } from "./reach";

function saleDateLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return monthLabel(`${y}-${String(m).padStart(2, "0")}`, 1);
}

function bathsLabel(baths?: number, halfBaths?: number): string {
  if (!baths && !halfBaths) return "—";
  return halfBaths ? `${baths ?? 0} + ${halfBaths} half` : `${baths}`;
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
          Affordability
        </h5>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${REACH_STYLE[row.reach]}`}
          >
            {REACH_LABEL[row.reach]}
          </span>
          {cost && (
            <span className="whitespace-nowrap text-lg font-semibold tabular-nums">
              {money(cost.total)}/mo
              {priceOverride != null && (
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (test price)
                </span>
              )}
            </span>
          )}
        </div>
        {cost ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Loan payment</dt>
              <dd className="tabular-nums">
                {money(cost.principalAndInterest)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Property + school tax</dt>
              <dd className="tabular-nums">{money(cost.tax)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mortgage insurance</dt>
              <dd className="tabular-nums">
                {cost.pmi > 0 ? money(cost.pmi) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Insurance + upkeep</dt>
              <dd className="tabular-nums">
                {money(cost.insurance + cost.maintenance)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            No sourced median price for {m.name} -- can't price a specific house
            here without a "price to test" override.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Effective tax rate {pct(rate, 2)}
          {displayPrice != null &&
            ` · cash to close ${money(cashToClose(assumptions, displayPrice))}`}
        </p>
      </section>

      {/* Schools */}
      <section>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Schools
        </h5>
        <p className="mt-1 text-sm text-slate-600">{m.schoolDistrict}</p>
        {district && district.mathProficiency !== null ? (
          <p className="mt-1 text-sm text-slate-600">
            {ratingSummary(m.schoolDistrict)} {district.note}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            School performance not sourced for {m.schoolDistrict}.
          </p>
        )}
      </section>

      {/* Recent sales */}
      {freshSales.length > 0 && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recent sales
          </h5>
          <p className="mt-1 text-xs text-slate-500">
            {freshSales.length} fresh sale{freshSales.length === 1 ? "" : "s"}
            {staleCount > 0 &&
              ` (${staleCount} more excluded as stale, past the ${STALE_THRESHOLD_LABEL.homeSales} threshold)`}
            .
          </p>
          <Table minWidthClassName="min-w-[560px]" className="mt-2">
            <thead>
              <tr className="border-b border-slate-200">
                <Th className="py-2">Address</Th>
                <Th className="py-2">Sold</Th>
                <Th align="right" className="py-2">
                  Price
                </Th>
                <Th align="right" className="py-2">
                  Beds
                </Th>
                <Th align="right" className="py-2">
                  Baths
                </Th>
                <Th align="right" className="py-2">
                  Sqft
                </Th>
                <Th align="right" className="py-2">
                  Built
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
                    {bathsLabel(sale.baths, sale.halfBaths)}
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
              Median of the fresh sales shown:{" "}
              {money(medianOf(freshSales) ?? 0)}. A handful of records, not a
              market statistic — see <strong>Sources</strong> below for what
              this is and isn't.
            </p>
          )}
        </section>
      )}

      {/* Climate */}
      {climate && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Climate risk
          </h5>
          <p className="mt-1 text-xs text-amber-700">
            County-wide, not town-specific — every town in {m.countyKey} shares
            these figures.
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Flood</dt>
              <dd className="tabular-nums">{climate.floodRiskRating}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Heat</dt>
              <dd className="tabular-nums">{climate.heatWaveRiskRating}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Wildfire</dt>
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
            Closing costs
          </h5>
          <p className="mt-1 text-sm text-slate-600">
            About {money(closing.total)} ({pct(closing.pctOfPrice, 1)} of price)
            at {money(displayPrice ?? 0)}.
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
