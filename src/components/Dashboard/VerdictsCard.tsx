import { useTranslation } from "react-i18next";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card } from "../ui";
import { verdict } from "./verdict";

export default function VerdictsCard() {
  const { t } = useTranslation();
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);

  return (
    <Card
      title={t("dashboard.verdict.cardTitle", "What this means")}
      subtitle={t(
        "dashboard.verdict.cardSubtitle",
        "One plain-English read on each scenario you have switched on.",
      )}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {summaries.map((s) => {
          const v = verdict(s, settings.startDate, t);
          return (
            <Callout key={s.scenarioId} tone={v.tone}>
              <span
                className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle"
                style={{ backgroundColor: s.color }}
              />
              <strong>{s.scenarioName}.</strong> {v.text}
            </Callout>
          );
        })}
      </div>
    </Card>
  );
}
