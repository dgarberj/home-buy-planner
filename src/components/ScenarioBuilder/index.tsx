import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { Button, Card, PercentInput, Toggle } from "../ui";
import ScenarioCard from "./ScenarioCard";

/**
 * The "what if" controls. Everything here is a slider or a switch on purpose:
 * this is the panel meant to be played with, not filled in.
 */
export default function ScenarioBuilder() {
  const { t } = useTranslation();
  const { scenarios, addScenario, assumptions, setAssumptions } = useStore();

  return (
    <Card
      title={t("scenarioBuilder.title", "Scenarios")}
      subtitle={t(
        "scenarioBuilder.subtitle",
        "Each card is one version of the future. Drag the sliders — every chart below updates immediately.",
      )}
      right={
        <Button variant="primary" size="sm" onClick={addScenario}>
          {t("scenarioBuilder.addScenario", "+ Add scenario")}
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t(
              "scenarioBuilder.sharedDefaults.title",
              "Shared job-loss defaults",
            )}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "scenarioBuilder.sharedDefaults.subtitle",
              "Scenarios start from these. Change a slider inside a scenario and it overrides them just for that one.",
            )}
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t("scenarioBuilder.incomeStillComingIn", "Income still coming in")}
          </span>
          <div className="mt-1.5">
            <PercentInput
              value={assumptions.jobLoss.incomeReplacementPct}
              step={5}
              onChange={(v) =>
                setAssumptions({ jobLoss: { incomeReplacementPct: v } })
              }
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            {t("scenarioBuilder.spendingCutBackBy", "Spending cut back by")}
          </span>
          <div className="mt-1.5">
            <PercentInput
              value={assumptions.jobLoss.expenseCutPct}
              step={5}
              onChange={(v) =>
                setAssumptions({ jobLoss: { expenseCutPct: v } })
              }
            />
          </div>
        </label>
        <div className="sm:col-span-2 flex items-end">
          <Toggle
            checked={assumptions.jobLoss.pauseRetirementContributions}
            onChange={(v) =>
              setAssumptions({ jobLoss: { pauseRetirementContributions: v } })
            }
            label={t(
              "scenarioBuilder.pauseRetirementContributions",
              "Pause retirement contributions during a gap",
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {scenarios.map((s) => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </div>
      {scenarios.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          {t(
            "scenarioBuilder.noScenarios",
            "No scenarios yet. Add one to see a projection.",
          )}
        </p>
      )}
    </Card>
  );
}
