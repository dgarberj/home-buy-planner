import { useTranslation } from "react-i18next";
import type { RankedTown } from "../../../hooks/useRankedTowns";
import { money } from "../../../lib/format";
import type { Assumptions } from "../../../model/types";
import { REACH_LABEL, REACH_STYLE } from "./reach";
import TownDetail from "./TownDetail";

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

export default function TownCard({
  row,
  assumptions,
  creditScore,
  priceOverride,
  isPinned,
  isExpanded,
  affordabilityScreened = true,
  onToggleExpand,
  onTogglePin,
}: {
  row: RankedTown;
  assumptions: Assumptions;
  creditScore: number;
  priceOverride: number | null;
  isPinned: boolean;
  isExpanded: boolean;
  affordabilityScreened?: boolean;
  onToggleExpand: () => void;
  onTogglePin: () => void;
}) {
  const { t } = useTranslation();
  const { m } = row;
  let caveat: string | null = null;
  if (!affordabilityScreened) {
    caveat =
      row.reach === "unknown"
        ? t(
            "marketPanel.townCard.caveatUnknown",
            "No sourced price — ranked on tax and schools only",
          )
        : t(
            "marketPanel.townCard.caveatOutOfReach",
            "Priced but out of reach — included to fill out the list",
          );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
        >
          <span className="font-semibold text-slate-900">{m.name}</span>
          <span className="text-xs capitalize text-slate-400">
            {t(COUNTY_KEY_LABEL[m.countyKey] ?? "", m.countyKey)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${REACH_STYLE[row.reach]}`}
          >
            {t(REACH_KEY[row.reach] ?? "", REACH_LABEL[row.reach])}
          </span>
          {caveat && <span className="text-xs text-amber-700">{caveat}</span>}
          <span className="ml-auto text-sm text-slate-500">
            {row.cost
              ? t("marketPanel.townCard.perMonth", "{{amount}}/mo", {
                  amount: money(row.cost.total),
                })
              : "—"}
            {row.valueScore !== null &&
              ` · ${t("marketPanel.townCard.value", "value {{score}}", {
                score: row.valueScore.toFixed(1),
              })}`}
          </span>
        </button>
        <button
          type="button"
          onClick={onTogglePin}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            isPinned
              ? "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          title={
            isPinned
              ? t("marketPanel.townCard.unpin", "Unpin")
              : t("marketPanel.townCard.pin", "Pin")
          }
        >
          {isPinned
            ? t("marketPanel.townCard.pinnedBadge", "Pinned ✕")
            : t("marketPanel.townCard.pin", "Pin")}
        </button>
      </div>

      {isExpanded && (
        <TownDetail
          row={row}
          assumptions={assumptions}
          creditScore={creditScore}
          priceOverride={priceOverride}
        />
      )}
    </div>
  );
}
