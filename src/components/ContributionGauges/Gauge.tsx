import { money } from "../../lib/format";
import { InfoTip } from "../ui";

function colourForShare(
  share: number,
  redBelow: number,
  greenAbove: number,
): string {
  if (share >= greenAbove) return "bg-emerald-500";
  if (share < redBelow) return "bg-red-500";
  return "bg-amber-500";
}

export default function Gauge({
  label,
  hint,
  actual,
  target,
  redBelow = 0.6,
  greenAbove = 1,
}: {
  label: string;
  hint: string;
  actual: number;
  target: number;
  /**
  Share of target below which the bar shows red. Defaults reproduce the
  gauge's old behaviour (amber past 60%, green only once met).
  */
  redBelow?: number;
  /**
  Share of target at or above which the bar shows green.
  */
  greenAbove?: number;
}) {
  const share = target > 0 ? actual / target : 0;
  const isMet = actual >= target - 1;
  const barColour = colourForShare(share, redBelow, greenAbove);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center text-sm font-medium text-slate-700">
          {label}
          <InfoTip text={hint} />
        </span>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">
          {money(actual)}
          <span className="font-normal text-slate-400"> / {money(target)} a year</span>
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${barColour}`}
          style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {isMet
          ? "On target."
          : `${money(Math.max(target - actual, 0))} a year short — ${money(
              Math.max(target - actual, 0) / 12,
            )} a month.`}
      </p>
    </div>
  );
}
