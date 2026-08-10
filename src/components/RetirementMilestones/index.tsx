import { useState } from "react";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card, InfoTip } from "../ui";

/**
 * Where each scenario lands at retirement age.
 *
 * This is the view that answers "does buying early cost us at 65?" -- and the
 * honest answer is subtle enough to be worth spelling out on screen rather than
 * leaving someone to infer it from a chart.
 */

const METRICS = [
  {
    key: "netWorthAtAge" as const,
    label: "Net worth",
    hint: "Everything added up: cash, investments, retirement accounts and home equity.",
  },
  {
    key: "retirementAtAge" as const,
    label: "Retirement accounts",
    hint: "The 401(k)s and IRAs on their own.",
  },
  {
    key: "investmentsAtAge" as const,
    label: "Investments",
    hint: "The taxable brokerage pot outside retirement — this is where buying early shows up most.",
  },
  {
    key: "homeEquityAtAge" as const,
    label: "Home equity",
    hint: "What the house is worth minus what is still owed on it.",
  },
];

/**
Do the scenarios differ on this measure by enough to be worth remarking on?
*/
function spread(values: number[]): number {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

export default function RetirementMilestones() {
  const { summaries, assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const [metric, setMetric] =
    useState<(typeof METRICS)[number]["key"]>("netWorthAtAge");

  const active = METRICS.find((m) => m.key === metric)!;

  // Only show ages the projection actually reaches.
  const ages = settings.milestoneAges.filter((age) =>
    summaries.some((s) => s[metric][age] !== undefined),
  );

  if (summaries.length === 0) return null;

  if (ages.length === 0) {
    const primaryAge = assumptions.household.primaryAge;
    const endAge = primaryAge + Math.floor(settings.horizonMonths / 12);
    return (
      <Card title="At retirement">
        <Callout tone="neutral">
          The projection only runs to age {endAge}, so none of your milestone
          ages are reached yet. Stretch the projection window in Assumptions —
          the <strong>To 65</strong> or <strong>To 70</strong> preset is the
          quickest way.
        </Callout>
      </Card>
    );
  }

  const bestByAge: Record<number, number> = {};
  for (const age of ages) {
    bestByAge[age] = Math.max(
      ...summaries.map((s) => s[metric][age] ?? -Infinity),
    );
  }

  // The headline comparison: how far apart the scenarios end up at the last age.
  const finalAge = ages.at(-1)!;
  const finalValues = summaries.map((s) => s[metric][finalAge] ?? 0);
  const gap = spread(finalValues);
  const retirementGap = spread(
    summaries.map((s) => s.retirementAtAge[finalAge] ?? 0),
  );

  const partnerAgeAt = (age: number) =>
    age - assumptions.household.primaryAge + assumptions.household.partnerAge;

  return (
    <Card
      title="At retirement"
      subtitle={`Where each scenario lands as you age. ${active.hint}`}
      right={
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                metric === m.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scenario
              </th>
              {ages.map((age) => (
                <th
                  key={age}
                  className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <div>Age {age}</div>
                  <div className="font-normal normal-case tracking-normal text-slate-400">
                    partner {partnerAgeAt(age)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr
                key={s.scenarioId}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-medium text-slate-900">
                      {s.scenarioName}
                    </span>
                  </div>
                  {s.mortgagePaidOffMonth && (
                    <div className="ml-4.5 mt-0.5 text-xs text-slate-400">
                      mortgage clear{" "}
                      {monthLabel(settings.startDate, s.mortgagePaidOffMonth)}
                    </div>
                  )}
                </td>
                {ages.map((age) => {
                  const value = s[metric][age];
                  const isBest =
                    value !== undefined && value === bestByAge[age];
                  return (
                    <td
                      key={age}
                      className={`py-3 pr-4 text-right tabular-nums ${
                        isBest
                          ? "font-semibold text-emerald-700"
                          : "text-slate-900"
                      }`}
                    >
                      {value === undefined ? "—" : money(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Best value in each column is highlighted.
      </p>

      {/* --- The part that is easy to get wrong ------------------------- */}
      <div className="mt-5 space-y-3">
        <Callout tone="neutral">
          <strong>Where buying early actually shows up.</strong> Your retirement
          contributions do not change when you buy a house — so at age{" "}
          {finalAge} the retirement accounts differ by only{" "}
          {money(retirementGap)} across these scenarios, and that difference
          comes entirely from contributions pausing during a job loss. The real
          effect of buy timing lands in{" "}
          <strong>home equity and investments</strong>: a mortgage payment is
          fixed for thirty years while rent keeps inflating, so an owner's
          monthly surplus grows over time and compounds. At age {finalAge} that
          adds up to a {money(gap)} spread in {active.label.toLowerCase()}.
        </Callout>

        <Callout tone="warn">
          <strong>This projects saving up, not living off it.</strong>
          <InfoTip text="Modelling retirement drawdown would need withdrawal rates, tax treatment per account type, Social Security and required minimum distributions — a much bigger model than this one." />{" "}
          "Net worth at {finalAge}" means what you will have built by then. It
          says nothing about taxes on withdrawal, Social Security, healthcare
          costs, or how long the money lasts.
        </Callout>
      </div>
    </Card>
  );
}
