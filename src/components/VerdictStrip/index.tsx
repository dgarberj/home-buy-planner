import { worstVerdict } from "../Dashboard/VerdictsCard";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";

/**
 * A one-glance headline pinned above the content pane: the worst-case
 * verdict across whichever scenarios are currently switched on, so the
 * answer stays visible no matter which cluster tab is active.
 */
const TONE_CLASSES = {
  good: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  bad: "bg-red-50 text-red-900 border-red-200",
} as const;

export default function VerdictStrip() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);

  const worst = worstVerdict(summaries, settings.startDate);
  if (!worst) return null;

  return (
    <div
      className={`sticky top-0 z-10 flex items-center gap-2 truncate rounded-xl border px-4 py-2 text-sm shadow-sm ${TONE_CLASSES[worst.tone]}`}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: worst.color }}
      />
      <span className="truncate">
        <strong>{worst.scenarioName}.</strong> {worst.text}
      </span>
    </div>
  );
}
