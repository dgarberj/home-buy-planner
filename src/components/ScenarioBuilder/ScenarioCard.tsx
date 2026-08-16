import { useTranslation } from "react-i18next";
import type { ScenarioConfig } from "../../model/types";
import { duration, monthLabel, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { INLINE_INPUT, Slider, Toggle } from "../ui";

export default function ScenarioCard({
  scenario,
}: {
  scenario: ScenarioConfig;
}) {
  const { t } = useTranslation();
  const { assumptions, settings, updateScenario, removeScenario } = useStore();
  const horizon = settings.horizonMonths;
  const jl = { ...assumptions.jobLoss, ...scenario.jobLossOverride };

  const setOverride = (patch: Partial<typeof jl>) =>
    updateScenario(scenario.id, {
      jobLossOverride: { ...scenario.jobLossOverride, ...patch },
    });

  const buyMonth = scenario.buyMonth;

  return (
    <div
      className={`rounded-2xl border bg-white transition ${
        scenario.enabled
          ? "border-slate-200 shadow-sm"
          : "border-slate-200 bg-slate-50 opacity-60"
      }`}
    >
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <input
          type="color"
          value={scenario.color}
          onChange={(event_) =>
            updateScenario(scenario.id, { color: event_.target.value })
          }
          title={t("scenarioCard.lineColour", "Line colour on the chart")}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5"
        />
        <input
          value={scenario.name}
          onChange={(event_) =>
            updateScenario(scenario.id, { name: event_.target.value })
          }
          className={`${INLINE_INPUT} min-w-0 flex-1 font-semibold text-slate-900`}
        />
        <button
          type="button"
          onClick={() =>
            updateScenario(scenario.id, { enabled: !scenario.enabled })
          }
          title={
            scenario.enabled
              ? t("scenarioCard.hideFromChart", "Hide from the chart")
              : t("scenarioCard.showOnChart", "Show on the chart")
          }
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {scenario.enabled
            ? t("scenarioCard.shown", "Shown")
            : t("scenarioCard.hidden", "Hidden")}
        </button>
        <button
          type="button"
          onClick={() => removeScenario(scenario.id)}
          title={t("scenarioCard.deleteScenario", "Delete scenario")}
          className="shrink-0 rounded-md px-2 py-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        <Toggle
          checked={buyMonth !== null}
          onChange={(v) =>
            updateScenario(scenario.id, { buyMonth: v ? 24 : null })
          }
          label={t("scenarioCard.buyAHouse", "Buy a house")}
          hint={t(
            "scenarioCard.buyAHouseHint",
            "Turn this off to model carrying on renting for the whole projection.",
          )}
        />

        {buyMonth !== null && (
          <Slider
            label={t("scenarioCard.buyIn", "Buy in")}
            hint={t(
              "scenarioCard.buyInHint",
              "How many months from now you close on the house. Drag it and watch the chart.",
            )}
            value={buyMonth}
            min={1}
            max={horizon}
            accent={scenario.color}
            onChange={(v) => updateScenario(scenario.id, { buyMonth: v })}
            display={t(
              "scenarioCard.monthDisplay",
              "{{date}} · month {{month}}",
              { date: monthLabel(settings.startDate, buyMonth), month: buyMonth },
            )}
          />
        )}

        <div className="border-t border-slate-100 pt-4">
          <Toggle
            checked={scenario.hasJobLoss}
            onChange={(v) => updateScenario(scenario.id, { hasJobLoss: v })}
            label={t("scenarioCard.someoneLosesJob", "Someone loses their job")}
            hint={t(
              "scenarioCard.someoneLosesJobHint",
              "Applies the job-loss settings below to this scenario only.",
            )}
          />
        </div>

        {scenario.hasJobLoss && (
          <div className="space-y-4 rounded-xl bg-amber-50/60 p-3">
            <Slider
              label={t("scenarioCard.starts", "Starts")}
              hint={t("scenarioCard.startsHint", "When the income stops.")}
              value={jl.startMonth}
              min={1}
              max={horizon}
              accent={scenario.color}
              onChange={(v) => setOverride({ startMonth: v })}
              display={t(
                "scenarioCard.monthDisplay",
                "{{date}} · month {{month}}",
                {
                  date: monthLabel(settings.startDate, jl.startMonth),
                  month: jl.startMonth,
                },
              )}
            />
            <Slider
              label={t("scenarioCard.lasts", "Lasts")}
              hint={t(
                "scenarioCard.lastsHint",
                "How long until income is back to normal.",
              )}
              value={jl.durationMonths}
              min={0}
              max={24}
              accent={scenario.color}
              onChange={(v) => setOverride({ durationMonths: v })}
              display={duration(jl.durationMonths, t)}
            />
            <Slider
              label={t(
                "scenarioCard.incomeStillComingIn",
                "Income still coming in",
              )}
              hint={t(
                "scenarioCard.incomeStillComingInHint",
                "Severance, unemployment, and the other salary, as a share of normal take-home.",
              )}
              value={Math.round(jl.incomeReplacementPct * 100)}
              min={0}
              max={100}
              step={5}
              accent={scenario.color}
              onChange={(v) => setOverride({ incomeReplacementPct: v / 100 })}
              display={pct(jl.incomeReplacementPct, 0)}
            />
            <Slider
              label={t("scenarioCard.spendingCutBackBy", "Spending cut back by")}
              hint={t(
                "scenarioCard.spendingCutBackByHint",
                "Housing is never cut — rent and the mortgage still have to be paid.",
              )}
              value={Math.round(jl.expenseCutPct * 100)}
              min={0}
              max={60}
              step={5}
              accent={scenario.color}
              onChange={(v) => setOverride({ expenseCutPct: v / 100 })}
              display={pct(jl.expenseCutPct, 0)}
            />
            <Toggle
              checked={jl.pauseRetirementContributions}
              onChange={(v) => setOverride({ pauseRetirementContributions: v })}
              label={t(
                "scenarioCard.pauseRetirementContributions",
                "Pause retirement contributions",
              )}
              hint={t(
                "scenarioCard.pauseRetirementContributionsHint",
                "Both your contribution and the employer match stop, since they come with the job.",
              )}
            />
            {scenario.jobLossOverride &&
              Object.keys(scenario.jobLossOverride).length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    updateScenario(scenario.id, { jobLossOverride: undefined })
                  }
                  className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
                >
                  {t(
                    "scenarioCard.resetToShared",
                    "Reset to the shared job-loss settings",
                  )}
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
