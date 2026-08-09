import type { ScenarioConfig } from '../model/types';
import { duration, monthLabel, pct } from '../lib/format';
import { useStore } from '../store/useStore';
import { Button, Card, INLINE_INPUT, PercentInput, Slider, Toggle } from './ui';

/**
 * The "what if" controls. Everything here is a slider or a switch on purpose:
 * this is the panel meant to be played with, not filled in.
 */

function ScenarioCard({ scenario }: { scenario: ScenarioConfig }) {
  const { assumptions, settings, updateScenario, removeScenario } = useStore();
  const horizon = settings.horizonMonths;
  const jl = { ...assumptions.jobLoss, ...(scenario.jobLossOverride ?? {}) };

  const setOverride = (patch: Partial<typeof jl>) =>
    updateScenario(scenario.id, { jobLossOverride: { ...scenario.jobLossOverride, ...patch } });

  const buyMonth = scenario.buyMonth;

  return (
    <div
      className={`rounded-2xl border bg-white transition ${
        scenario.enabled ? 'border-slate-200 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-60'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <input
          type="color"
          value={scenario.color}
          onChange={(e) => updateScenario(scenario.id, { color: e.target.value })}
          title="Line colour on the chart"
          className="h-7 w-7 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5"
        />
        <input
          value={scenario.name}
          onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
          className={`${INLINE_INPUT} min-w-0 flex-1 font-semibold text-slate-900`}
        />
        <button
          type="button"
          onClick={() => updateScenario(scenario.id, { enabled: !scenario.enabled })}
          title={scenario.enabled ? 'Hide from the chart' : 'Show on the chart'}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {scenario.enabled ? 'Shown' : 'Hidden'}
        </button>
        <button
          type="button"
          onClick={() => removeScenario(scenario.id)}
          title="Delete scenario"
          className="shrink-0 rounded-md px-2 py-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        <Toggle
          checked={buyMonth !== null}
          onChange={(v) => updateScenario(scenario.id, { buyMonth: v ? 24 : null })}
          label="Buy a house"
          hint="Turn this off to model carrying on renting for the whole projection."
        />

        {buyMonth !== null && (
          <Slider
            label="Buy in"
            hint="How many months from now you close on the house. Drag it and watch the chart."
            value={buyMonth}
            min={1}
            max={horizon}
            accent={scenario.color}
            onChange={(v) => updateScenario(scenario.id, { buyMonth: v })}
            display={`${monthLabel(settings.startDate, buyMonth)} · month ${buyMonth}`}
          />
        )}

        <div className="border-t border-slate-100 pt-4">
          <Toggle
            checked={scenario.hasJobLoss}
            onChange={(v) => updateScenario(scenario.id, { hasJobLoss: v })}
            label="Someone loses their job"
            hint="Applies the job-loss settings below to this scenario only."
          />
        </div>

        {scenario.hasJobLoss && (
          <div className="space-y-4 rounded-xl bg-amber-50/60 p-3">
            <Slider
              label="Starts"
              hint="When the income stops."
              value={jl.startMonth}
              min={1}
              max={horizon}
              accent={scenario.color}
              onChange={(v) => setOverride({ startMonth: v })}
              display={`${monthLabel(settings.startDate, jl.startMonth)} · month ${jl.startMonth}`}
            />
            <Slider
              label="Lasts"
              hint="How long until income is back to normal."
              value={jl.durationMonths}
              min={0}
              max={24}
              accent={scenario.color}
              onChange={(v) => setOverride({ durationMonths: v })}
              display={duration(jl.durationMonths)}
            />
            <Slider
              label="Income still coming in"
              hint="Severance, unemployment, and the other salary, as a share of normal take-home."
              value={Math.round(jl.incomeReplacementPct * 100)}
              min={0}
              max={100}
              step={5}
              accent={scenario.color}
              onChange={(v) => setOverride({ incomeReplacementPct: v / 100 })}
              display={pct(jl.incomeReplacementPct, 0)}
            />
            <Slider
              label="Spending cut back by"
              hint="Housing is never cut — rent and the mortgage still have to be paid."
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
              label="Pause retirement contributions"
              hint="Both your contribution and the employer match stop, since they come with the job."
            />
            {scenario.jobLossOverride && Object.keys(scenario.jobLossOverride).length > 0 && (
              <button
                type="button"
                onClick={() => updateScenario(scenario.id, { jobLossOverride: undefined })}
                className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
              >
                Reset to the shared job-loss settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScenarioBuilder() {
  const { scenarios, addScenario, assumptions, setAssumptions } = useStore();

  return (
    <Card
      title="Scenarios"
      subtitle="Each card is one version of the future. Drag the sliders — every chart below updates immediately."
      right={
        <Button variant="primary" size="sm" onClick={addScenario}>
          + Add scenario
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Shared job-loss defaults
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Scenarios start from these. Change a slider inside a scenario and it overrides them just
            for that one.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Income still coming in</span>
          <div className="mt-1.5">
            <PercentInput
              value={assumptions.jobLoss.incomeReplacementPct}
              step={5}
              onChange={(v) => setAssumptions({ jobLoss: { incomeReplacementPct: v } })}
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Spending cut back by</span>
          <div className="mt-1.5">
            <PercentInput
              value={assumptions.jobLoss.expenseCutPct}
              step={5}
              onChange={(v) => setAssumptions({ jobLoss: { expenseCutPct: v } })}
            />
          </div>
        </label>
        <div className="sm:col-span-2 flex items-end">
          <Toggle
            checked={assumptions.jobLoss.pauseRetirementContributions}
            onChange={(v) => setAssumptions({ jobLoss: { pauseRetirementContributions: v } })}
            label="Pause retirement contributions during a gap"
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
          No scenarios yet. Add one to see a projection.
        </p>
      )}
    </Card>
  );
}
