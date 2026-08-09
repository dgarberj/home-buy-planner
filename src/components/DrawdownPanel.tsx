import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runDrawdown } from "../engine/drawdown";
import { money, moneyShort } from "../lib/format";
import { useProjections } from "../store/useProjections";
import { useStore } from "../store/useStore";
import {
  Callout,
  Card,
  Field,
  MoneyInput,
  NumberInput,
  PercentInput,
  Stat,
  Toggle,
} from "./ui";

/**
 * "Will it last?" -- the question that makes the accumulation numbers mean
 * something. Shown per scenario, because the whole point is to see whether the
 * house decision changes the answer.
 */
function depletionTone(
  isRunsOut: boolean,
  lastsTo: number,
  planToAge: number,
): "bad" | "neutral" | "good" {
  if (!isRunsOut) return "good";
  return lastsTo < planToAge - 5 ? "bad" : "neutral";
}

export default function DrawdownPanel() {
  const { summaries, assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const d = assumptions.drawdown;

  const results = summaries.map((s) => ({
    summary: s,
    result: runDrawdown(s.months, assumptions),
  }));

  const anyReached = results.some((r) => r.result.retirementMonth !== null);

  /**
  One row per year, one column per scenario, for the depletion chart.
  */
  const chartData: Record<string, number>[] = [];
  const longest = Math.max(0, ...results.map((r) => r.result.track.length));
  for (let index = 0; index < longest; index++) {
    const row: Record<string, number> = { age: d.retirementAge + index + 1 };
    for (const r of results) {
      const point = r.result.track[index];
      if (point) row[r.summary.scenarioId] = Math.round(point.balance);
    }
    chartData.push(row);
  }

  return (
    <div className="space-y-5">
      <Card
        title="Retirement plan"
        subtitle="How retirement is expected to go. These are the dials behind every number below."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Retire at age"
            hint="When the paycheques stop. Has to fall inside the projection window to be modelled."
          >
            <NumberInput
              value={d.retirementAge}
              min={40}
              max={80}
              onChange={(v) =>
                setAssumptions({ drawdown: { retirementAge: v } })
              }
            />
          </Field>
          <Field
            label="Monthly spending in retirement"
            hint="Total spending you want to support, in TODAY's money. The model inflates it to the retirement year for you. Include housing, healthcare and everything else."
          >
            <MoneyInput
              value={d.desiredMonthlySpendToday}
              step={250}
              onChange={(v) =>
                setAssumptions({ drawdown: { desiredMonthlySpendToday: v } })
              }
            />
          </Field>
          <Field
            label="Withdrawal rate"
            hint="The share of the pot you draw each year. 4% is the classic rule of thumb — the rate a portfolio has historically sustained over 30 years."
          >
            <PercentInput
              value={d.withdrawalRate}
              step={0.25}
              onChange={(v) =>
                setAssumptions({ drawdown: { withdrawalRate: v } })
              }
            />
          </Field>
          <Field
            label="Return once retired"
            hint="Usually lower than while working, since portfolios get more conservative when you are living off them."
          >
            <PercentInput
              value={d.returnAnnual}
              step={0.25}
              onChange={(v) =>
                setAssumptions({ drawdown: { returnAnnual: v } })
              }
            />
          </Field>
          <Field
            label="Inflation in retirement"
            hint="How fast your spending rises once retired. Over thirty years this is the single most punishing assumption in the model."
          >
            <PercentInput
              value={d.inflationAnnual}
              onChange={(v) =>
                setAssumptions({ drawdown: { inflationAnnual: v } })
              }
            />
          </Field>
          <Field
            label="Plan to age"
            hint="How long the money needs to last. Running out before this is the failure case."
          >
            <NumberInput
              value={d.planToAge}
              min={70}
              max={110}
              onChange={(v) => setAssumptions({ drawdown: { planToAge: v } })}
            />
          </Field>
          <div className="sm:col-span-2 flex items-end">
            <Toggle
              checked={d.includeHomeEquity}
              onChange={(v) =>
                setAssumptions({ drawdown: { includeHomeEquity: v } })
              }
              label="Count home equity as spendable"
              hint="Off by default: you have to live somewhere. Only turn this on if the plan really is to downsize or borrow against the house."
            />
          </div>
        </div>
      </Card>

      {anyReached ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {results.map(({ summary, result }) => {
              if (result.retirementMonth === null) return null;
              const isRunsOut = result.depletionAge !== null;
              const lastsTo = result.depletionAge ?? d.planToAge;
              return (
                <div
                  key={summary.scenarioId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: summary.color }}
                    />
                    <h3
                      className="min-w-0 truncate text-sm font-semibold text-slate-900"
                      title={summary.scenarioName}
                    >
                      {summary.scenarioName}
                    </h3>
                  </div>

                  <div className="mt-4 space-y-4">
                    <Stat
                      label={`Pot at ${d.retirementAge}`}
                      hint="Retirement accounts plus savings and investments. Home equity is excluded unless you switched it on above."
                      value={money(result.portfolioAtRetirement)}
                      sub={`${money(result.retirementAccountsAtRetirement)} retirement · ${money(
                        result.liquidAtRetirement,
                      )} other`}
                    />
                    <Stat
                      label="Money lasts until"
                      hint="Simulated month by month: the balance grows at the retirement return and your inflating spending comes out of it."
                      value={
                        isRunsOut
                          ? `age ${lastsTo.toFixed(1)}`
                          : `past ${d.planToAge}`
                      }
                      tone={depletionTone(isRunsOut, lastsTo, d.planToAge)}
                      sub={
                        isRunsOut
                          ? `${result.yearsOfIncome.toFixed(1)} years of income`
                          : `${money(result.balanceAtPlanEnd)} still left at ${d.planToAge}`
                      }
                    />
                    <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                      At {(d.withdrawalRate * 100).toFixed(1)}% that pot
                      supports{" "}
                      <strong className="text-slate-700">
                        {money(result.sustainableAnnualIncome)}
                      </strong>{" "}
                      a year — about{" "}
                      {money(result.sustainableAnnualIncomeToday)} in
                      today&rsquo;s money.
                      <span
                        className={`mt-1 block font-semibold ${
                          result.meetsTargetAtWithdrawalRate
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {result.meetsTargetAtWithdrawalRate
                          ? `Covers the ${money(d.desiredMonthlySpendToday)}/mo target with room to spare.`
                          : `${money(result.annualShortfall)} a year short of the target.`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Card
            title="The money running down"
            subtitle={`Balance from age ${d.retirementAge} to ${d.planToAge}, spending ${money(
              d.desiredMonthlySpendToday,
            )} a month in today's money. Where a line hits zero, the money is gone.`}
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="age"
                    tickFormatter={(a: number) => `age ${a}`}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={moneyShort}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    labelFormatter={(a) => `Age ${a}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                    }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  {results.map(({ summary }) => (
                    <Area
                      key={summary.scenarioId}
                      type="monotone"
                      dataKey={summary.scenarioId}
                      name={summary.scenarioName}
                      stroke={summary.color}
                      fill={summary.color}
                      fillOpacity={0.08}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Callout tone="warn">
            <strong>What this leaves out.</strong> No taxes on withdrawal (which
            differ by account type), no Social Security or pension income, no
            required minimum distributions, no healthcare shocks — and, most
            importantly, a single smooth return every year. Real markets deliver
            their bad years in clumps, and a crash early in retirement does far
            more damage than the same crash later. Treat the age the money runs
            out as a rough marker, not a date.
          </Callout>
        </>
      ) : (
        <Card title="Will the money last?">
          <Callout tone="neutral">
            Age {d.retirementAge} falls outside the projection window, so there
            is nothing to draw down yet. Stretch the window in Assumptions — the{" "}
            <strong>To 70</strong> preset covers most retirement ages.
          </Callout>
        </Card>
      )}
    </div>
  );
}
