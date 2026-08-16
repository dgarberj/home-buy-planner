import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        <span className="text-slate-500">
          {t("marketPanel.allTowns.sortBy", "Sort by")}
        </span>
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
            {t("marketPanel.allTowns.sortCost", "Monthly cost")}
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
            {t("marketPanel.allTowns.sortValue", "Value score")}
          </button>
        </div>
        <InfoTip
          placement="bottom"
          text={t(
            "marketPanel.allTowns.sortHint",
            "School quality (mean maths/reading proficiency) per $1,000/month of all-in ownership cost, pricing the SAME reference house everywhere so every municipality is ranked, not just the ones with a sourced median price. Towns whose district isn't sourced sort last.",
          )}
        />
      </div>

      <Table minWidthClassName="min-w-[1080px]" className="mt-2">
        <thead>
          <tr className="border-b border-slate-200">
            <Th sticky className="bg-white pb-2 pr-4">
              {t("marketPanel.allTowns.columns.town", "Town")}
            </Th>
            <Th className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.county", "County")}
            </Th>
            <Th align="right" className="pb-2 pr-4">
              <span className="inline-flex items-center">
                {t("marketPanel.allTowns.columns.medianPrice", "Median price")}
                <InfoTip
                  placement="bottom"
                  text={t(
                    "marketPanel.allTowns.columns.medianPriceHint",
                    "Typical home value from Zillow or Redfin, 2026. Towns with no sourced price are listed at the bottom rather than guessed at.",
                  )}
                />
              </span>
            </Th>
            <Th align="right" className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.taxRate", "Tax rate")}
            </Th>
            <Th align="right" className="pb-2 pr-4">
              <span className="inline-flex items-center">
                {t("marketPanel.allTowns.columns.allInPerMonth", "All-in / month")}
                <InfoTip
                  placement="bottom"
                  text={t(
                    "marketPanel.allTowns.columns.allInPerMonthHint",
                    "What the typical house here would cost you monthly: loan, property and school tax, insurance, mortgage insurance and upkeep.",
                  )}
                />
              </span>
            </Th>
            <Th align="right" className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.cashToClose", "Cash to close")}
            </Th>
            <Th className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.reach", "Reach")}
            </Th>
            <Th className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.schools", "Schools")}
            </Th>
            <Th align="right" className="pb-2 pr-4">
              {t("marketPanel.allTowns.columns.valueScore", "Value score")}
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
                      {t("marketPanel.allTowns.wageTax", "{{rate}} wage tax", {
                        rate: pct(row.m.wageTax, 2),
                      })}
                    </span>
                  )}
                </Td>
                <Td className="py-2 pr-4 capitalize text-slate-500">
                  {t(
                    COUNTY_KEY_LABEL[row.m.countyKey] ?? "",
                    row.m.countyKey,
                  )}
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
                    {t(REACH_KEY[row.reach] ?? "", REACH_LABEL[row.reach])}
                  </span>
                </Td>
                <Td className="py-2 pr-4 text-xs text-slate-500">
                  {ratingSummary(row.m.schoolDistrict) ?? (
                    <span className="text-slate-300">
                      {t("marketPanel.allTowns.notSourced", "not sourced")}
                    </span>
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
                    {isPinned
                      ? t("marketPanel.allTowns.pinned", "Pinned")
                      : t("marketPanel.townCard.pin", "Pin")}
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
          label={t(
            "marketPanel.allTowns.pricedOnly.label",
            "Only show towns with a sourced price",
          )}
          hint={t(
            "marketPanel.allTowns.pricedOnly.hint",
            "On by default to keep the table to towns you can actually compare by cost. The rest still have complete tax and school data — a missing price is a gap in what I could source, not a reason to hide them for good.",
          )}
        />
        <p className="text-xs text-slate-500">
          {t(
            "marketPanel.allTowns.footerCount",
            "Showing {{visible}} of {{total}} municipalities across three counties. {{priced}} have a sourced median price; the rest are sorted by tax rate and show",
            {
              visible: visible.length,
              total: ALL_MUNICIPALITIES.length,
              priced: pricedCount,
            },
          )}{" "}
          <span className="text-slate-400">&mdash;</span>{" "}
          {t("marketPanel.allTowns.footerPriceGoes", "where a price would go.")}
        </p>
      </div>
    </div>
  );
}
