import { useTranslation } from "react-i18next";
import { worstVerdict } from "../Dashboard/verdict";
import { TONE_CLASSES } from "../ui";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";

/**
 * A one-glance headline pinned above the content pane: the worst-case
 * verdict across whichever scenarios are currently switched on, so the
 * answer stays visible no matter which cluster tab is active. Uses the same
 * tone→colour classes as `Callout`, just in a single-line layout instead of
 * a block.
 */
export default function VerdictStrip() {
  const { t } = useTranslation();
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);

  const worst = worstVerdict(summaries, settings.startDate, t);
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
