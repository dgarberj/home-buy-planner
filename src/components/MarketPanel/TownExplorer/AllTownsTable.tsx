import { useMemo, useState } from "react";
import {
  ALL_MUNICIPALITIES,
  compareNullableDesc,
} from "../../../data/localMarket";
import { ratingSummary } from "../../../data/schools";
import { cashToClose } from "../../../engine/affordability";
import type { RankedTown } from "../../../hooks/useRankedTowns";
import { money, pct } from "../../../lib/format";
import type { Assumptions } from "../../../model/types";
import { Button, InfoTip, Table, Td, Th, Toggle } from "../../ui";
import { REACH_LABEL, REACH_STYLE } from "./reach";

export default function AllTownsTable({
  assumptions,
  rows,
  pinned,
  onTogglePin,
}: {
  assumptions: Assumptions;
  rows: RankedTown[];
  pinned: string[];
  onTogglePin: (name: string) => void;
}) {
  const [sortMode, setSortMode] = useState<"cost" | "valueScore">("cost");
  const [pricedOnly, setPricedOnly] = useState(true);

  const sorted = useMemo(
    () =>
      sortMode === "valueScore"
        ? rows.toSorted((a, b) =>
            compareNullableDesc(a.valueScore, b.valueScore),
          )
        : rows.toSorted((a, b) => {
            if (a.cost && b.cost) return a.cost.total - b.cost.total;
            if (a.cost) return -1;
            if (b.cost) return 1;
            return a.rate - b.rate;
          }),
    [rows, sortMode],
  );

  const pricedCount = useMemo(
    () => sorted.filter((r) => r.cost).length,
    [sorted],
  );
  const visible = useMemo(
    () => (pricedOnly ? sorted.filter((r) => r.cost) : sorted),
    [sorted, pricedOnly],
  );

  return (
    <div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Sort by</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setSortMode("cost")}
            className={`px-2.5 py-1 font-medium ${
              sortMode === "cost"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Monthly cost
          </button>
          <button
            type="button"
            onClick={() => setSortMode("valueScore")}
            className={`border-l border-slate-200 px-2.5 py-1 font-medium ${
              sortMode === "valueScore"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Value score
          </button>
        </div>
        <InfoTip
          placement="bottom"
          text="School quality (mean maths/reading proficiency) per $1,000/month of all-in ownership cost, pricing the SAME reference house everywhere so every municipality is ranked, not just the ones with a sourced median price. Towns whose district isn't sourced sort last."
        />
      </div>

      <Table minWidthClassName="min-w-[1080px]" className="mt-2">
        <thead>
          <tr className="border-b border-slate-200">
            <Th sticky className="bg-white pb-2 pr-4">
              Town
            </Th>
            <Th className="pb-2 pr-4">County</Th>
            <Th align="right" className="pb-2 pr-4">
              <span className="inline-flex items-center">
                Median price
                <InfoTip
                  placement="bottom"
                  text="Typical home value from Zillow or Redfin, 2026. Towns with no sourced price are listed at the bottom rather than guessed at."
                />
              </span>
            </Th>
            <Th align="right" className="pb-2 pr-4">
              Tax rate
            </Th>
            <Th align="right" className="pb-2 pr-4">
              <span className="inline-flex items-center">
                All-in / month
                <InfoTip
                  placement="bottom"
                  text="What the typical house here would cost you monthly: loan, property and school tax, insurance, mortgage insurance and upkeep."
                />
              </span>
            </Th>
            <Th align="right" className="pb-2 pr-4">
              Cash to close
            </Th>
            <Th className="pb-2 pr-4">Reach</Th>
            <Th className="pb-2 pr-4">Schools</Th>
            <Th align="right" className="pb-2 pr-4">
              Value score
            </Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const isPinned = pinned.includes(row.m.name);
            const rowTint = isPinned ? "bg-blue-50/50" : "";
            return (
              <tr
                key={`${row.m.countyKey}-${row.m.name}`}
                className={`border-b border-slate-100 last:border-0 ${rowTint}`}
              >
                <Td
                  sticky
                  className={`py-2 pr-4 font-medium text-slate-900 ${rowTint || "bg-white"}`}
                >
                  {row.m.name}
                  {row.m.wageTax >= 0.02 && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      {pct(row.m.wageTax, 2)} wage tax
                    </span>
                  )}
                </Td>
                <Td className="py-2 pr-4 capitalize text-slate-500">
                  {row.m.countyKey}
                </Td>
                <Td
                  align="right"
                  className={`py-2 pr-4 tabular-nums ${
                    row.m.medianPrice ? "text-slate-900" : "text-slate-300"
                  }`}
                >
                  {row.m.medianPrice ? money(row.m.medianPrice) : "—"}
                </Td>
                <Td
                  align="right"
                  className="py-2 pr-4 tabular-nums text-slate-600"
                >
                  {pct(row.rate, 2)}
                </Td>
                <Td
                  align="right"
                  className={`py-2 pr-4 font-semibold tabular-nums ${
                    row.cost ? "text-slate-900" : "text-slate-300"
                  }`}
                >
                  {row.cost ? money(row.cost.total) : "—"}
                </Td>
                <Td
                  align="right"
                  className={`py-2 pr-4 tabular-nums ${
                    row.m.medianPrice ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  {row.m.medianPrice
                    ? money(cashToClose(assumptions, row.m.medianPrice))
                    : "—"}
                </Td>
                <Td className="py-2 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${REACH_STYLE[row.reach]}`}
                  >
                    {REACH_LABEL[row.reach]}
                  </span>
                </Td>
                <Td className="py-2 pr-4 text-xs text-slate-500">
                  {ratingSummary(row.m.schoolDistrict) ?? (
                    <span className="text-slate-300">not sourced</span>
                  )}
                </Td>
                <Td
                  align="right"
                  className={`py-2 pr-4 tabular-nums ${
                    row.valueScore === null
                      ? "text-slate-300"
                      : "text-slate-900"
                  }`}
                >
                  {row.valueScore === null ? "—" : row.valueScore.toFixed(1)}
                </Td>
                <Td align="right" className="py-2">
                  <Button size="sm" onClick={() => onTogglePin(row.m.name)}>
                    {isPinned ? "Pinned" : "Pin"}
                  </Button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Toggle
          checked={pricedOnly}
          onChange={setPricedOnly}
          label="Only show towns with a sourced price"
          hint="On by default to keep the table to towns you can actually compare by cost. The rest still have complete tax and school data — a missing price is a gap in what I could source, not a reason to hide them for good."
        />
        <p className="text-xs text-slate-500">
          Showing {visible.length} of {ALL_MUNICIPALITIES.length} municipalities
          across three counties. {pricedCount} have a sourced median price; the
          rest are sorted by tax rate and show{" "}
          <span className="text-slate-400">&mdash;</span> where a price would
          go.
        </p>
      </div>
    </div>
  );
}
