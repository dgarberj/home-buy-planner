import {
  effectiveRate,
  estimatedMonthlyTax,
  type Municipality,
} from "../../data/localMarket";
import { ratingBand, ratingSummary } from "../../data/schools";
import { money, pct } from "../../lib/format";
import { BAND_COLOUR } from "./countyMapLayout";

/**
Hover tooltip that follows the cursor, showing a quick summary for one tile.
*/
export default function CountyMapTooltip({
  hover,
  cursor,
  price,
}: {
  hover: Municipality;
  cursor: { x: number; y: number };
  price: number;
}) {
  return (
    <div
      className="pointer-events-none fixed z-40 w-64 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white shadow-xl"
      style={{
        // Nudge away from the cursor, and flip near the right/bottom edge.
        left: Math.min(cursor.x + 16, window.innerWidth - 272),
        top: Math.min(cursor.y + 16, window.innerHeight - 150),
      }}
    >
      <div className="text-sm font-semibold">{hover.name}</div>
      <div className="mt-0.5 text-xs text-slate-300">
        {hover.schoolDistrict} schools
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Median home price</dt>
          <dd className="font-semibold tabular-nums">
            {hover.medianPrice ? (
              money(hover.medianPrice)
            ) : (
              <span className="text-slate-500">not sourced</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">
            Property tax {hover.medianPrice ? "on that" : `on ${money(price)}`}
          </dt>
          <dd className="font-semibold tabular-nums">
            {money(estimatedMonthlyTax(hover.medianPrice ?? price, hover))} /
            month
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Tax rate</dt>
          <dd className="tabular-nums">{pct(effectiveRate(hover), 2)} of value</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Total millage</dt>
          <dd className="tabular-nums">{hover.total.toFixed(2)} mills</dd>
        </div>
      </dl>

      <div className="mt-2 border-t border-slate-700 pt-2 text-xs">
        {ratingSummary(hover.schoolDistrict) ? (
          <span className="flex items-start gap-1.5">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: BAND_COLOUR[ratingBand(hover.schoolDistrict)] }}
            />
            <span className="text-slate-200">
              {ratingSummary(hover.schoolDistrict)}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">School performance not sourced</span>
        )}
      </div>

      {hover.wageTax > 0 && (
        <div className="mt-1.5 text-xs text-amber-300">
          {pct(hover.wageTax, 2)} local wage tax
        </div>
      )}
      <div className="mt-2 text-[11px] text-slate-500">
        Click for the full breakdown
      </div>
    </div>
  );
}
