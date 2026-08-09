import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyResult, ScenarioSummary } from '../model/types';
import { money, moneyShort, monthLabel, monthPhrase } from '../lib/format';
import { useProjections } from '../store/useProjections';
import { useStore } from '../store/useStore';
import { Callout, Card, Stat, Toggle } from './ui';

/**
 * The answer screen. Someone should be able to land here, read two sentences,
 * and know whether the plan works -- without being walked through it.
 */

const METRICS = [
  {
    key: 'netWorth' as const,
    label: 'Net worth',
    hint: 'Cash + investments + retirement + home equity. The big picture.',
  },
  {
    key: 'liquidSavings' as const,
    label: 'Savings & investments',
    hint: 'Everything outside retirement that you could get your hands on. This is the line that shows the risk.',
  },
  {
    key: 'cashBalance' as const,
    label: 'Cash buffer',
    hint: 'The emergency fund on its own. Investments get sold before this is allowed to go negative, so a dip here is the first warning sign.',
  },
  {
    key: 'retirementBalance' as const,
    label: 'Retirement',
    hint: 'All retirement accounts combined. Buying a house does not change this — only a job loss that pauses contributions does.',
  },
  {
    key: 'homeEquity' as const,
    label: 'Home equity',
    hint: 'What the house is worth minus what you still owe.',
  },
];

/** Plain-English verdict for one scenario. */
function verdict(s: ScenarioSummary, startDate: string): { tone: 'good' | 'warn' | 'bad'; text: string } {
  const buyRow = s.months.find((m) => m.purchaseOutflow > 0);
  const hadJobLoss = s.months.some((m) => m.jobLossActive);

  if (s.goesNegative) {
    return {
      tone: 'bad',
      text: `This plan runs out of money. Cash bottoms out at ${money(s.minCashBuffer)} in ${monthPhrase(
        startDate,
        s.minCashBufferMonth,
      )}${buyRow ? `, after buying in ${monthLabel(startDate, buyRow.month)}` : ''}.`,
    };
  }

  const parts: string[] = [];
  if (buyRow) {
    parts.push(
      `Buying in ${monthPhrase(startDate, buyRow.month)} works — it takes ${money(
        buyRow.purchaseOutflow,
      )} up front and leaves ${money(buyRow.liquidSavings)} in the bank`,
    );
  } else {
    parts.push(
      s.readinessMonth
        ? `Renting throughout. You'd have enough for a down payment by ${monthPhrase(startDate, s.readinessMonth)}`
        : `Renting throughout, and the down payment isn't funded within this window`,
    );
  }
  if (hadJobLoss) {
    parts.push(
      `and you'd still get through the job loss, with ${money(s.minCashBuffer)} at the thinnest point`,
    );
  }

  const thin = s.minCashBuffer < 10_000;
  return {
    tone: thin ? 'warn' : 'good',
    text: `${parts.join(', ')}.${thin ? ' That is a thin cushion — worth a closer look.' : ''}`,
  };
}

export default function Dashboard() {
  const { summaries, assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('netWorth');
  const [xAxis, setXAxis] = useState<'date' | 'age'>('date');

  const active = METRICS.find((m) => m.key === metric)!;
  const primaryAge = assumptions.household.primaryAge;

  /** Label a month as either a calendar date or the primary person's age. */
  const xLabel = (m: number) =>
    xAxis === 'age'
      ? `age ${Math.floor(primaryAge + (m - 1) / 12)}`
      : monthLabel(settings.startDate, m);

  /** Merge every scenario into one row per month for the chart. */
  const chartData = useMemo(() => {
    const rows: Record<string, number | string>[] = [];
    for (let m = 1; m <= settings.horizonMonths; m++) {
      const row: Record<string, number | string> = {
        month: m,
        label: monthLabel(settings.startDate, m),
      };
      for (const s of summaries) {
        const point = s.months[m - 1];
        if (point) row[s.scenarioId] = Math.round(point[metric] as number);
      }
      rows.push(row);
    }
    return rows;
  }, [summaries, metric, settings.horizonMonths, settings.startDate]);

  /**
   * Tick every year on a short horizon, every five on a long one. Thirty-five
   * annual ticks is an unreadable axis.
   */
  const yearTicks = useMemo(() => {
    const stepYears = settings.horizonMonths > 144 ? 5 : 1;
    const ticks: number[] = [1];
    for (let m = stepYears * 12; m <= settings.horizonMonths; m += stepYears * 12) ticks.push(m);
    return ticks;
  }, [settings.horizonMonths]);

  const buyMarkers = useMemo(
    () =>
      summaries
        .map((s) => ({ s, row: s.months.find((m) => m.purchaseOutflow > 0) }))
        .filter((x): x is { s: ScenarioSummary; row: MonthlyResult } => !!x.row),
    [summaries],
  );

  if (summaries.length === 0) {
    return (
      <Card title="Dashboard">
        <p className="py-10 text-center text-sm text-slate-400">
          No scenarios are switched on. Turn one on above to see a projection.
        </p>
      </Card>
    );
  }

  const years = [1, 3, 5].filter((y) => y * 12 <= settings.horizonMonths);

  return (
    <div className="space-y-5">
      {/* ---- The single biggest lever, switchable in place ------------ */}
      {assumptions.secondIncome.monthlyTakeHome > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Toggle
              checked={assumptions.secondIncome.enabled}
              onChange={(v) => setAssumptions({ secondIncome: { enabled: v } })}
              label={
                <>
                  <strong>{assumptions.secondIncome.label}</strong> — every figure below assumes
                  this {assumptions.secondIncome.enabled ? 'happens' : 'does not happen'}
                </>
              }
              hint="Flip it to see the whole plan recalculate. Off is the safer baseline; on is what you are planning for."
            />
            <span className="text-xs text-slate-500">
              {money(assumptions.secondIncome.monthlyTakeHome)}/mo from{' '}
              {monthLabel(settings.startDate, assumptions.secondIncome.startMonth)}, less{' '}
              {money(assumptions.secondIncome.additionalCostsMonthly)} of childcare
            </span>
          </div>
        </Card>
      )}

      {/* ---- The verdicts, in words ---------------------------------- */}
      <Card
        title="What this means"
        subtitle="One plain-English read on each scenario you have switched on."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {summaries.map((s) => {
            const v = verdict(s, settings.startDate);
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

      {/* ---- The chart ------------------------------------------------ */}
      <Card
        title={active.label + ' over time'}
        subtitle={active.hint}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(['date', 'age'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setXAxis(mode)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                    xAxis === mode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  metric === m.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
            </div>
          </div>
        }
      >
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                ticks={yearTicks}
                tickFormatter={xLabel}
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={moneyShort}
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                formatter={(value: number) => money(value)}
                labelFormatter={(m: number) =>
                  `${monthLabel(settings.startDate, m)} · age ${Math.floor(
                    primaryAge + (m - 1) / 12,
                  )} · month ${m}`
                }
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="plainline"
                wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
              />
              {/* Zero line matters when cash goes negative. */}
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
              {(metric === 'liquidSavings' || metric === 'cashBalance') &&
                buyMarkers.map(({ s, row }) => (
                  <ReferenceLine
                    key={s.scenarioId}
                    x={row.month}
                    stroke={s.color}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: '🏠', position: 'top', fontSize: 14 }}
                  />
                ))}
              {summaries.map((s) => (
                <Line
                  key={s.scenarioId}
                  type="monotone"
                  dataKey={s.scenarioId}
                  name={s.scenarioName}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {(metric === 'liquidSavings' || metric === 'cashBalance') && buyMarkers.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Dashed lines mark the month each scenario buys. The drop is the down payment and closing
            costs leaving the account.
          </p>
        )}
      </Card>

      {/* ---- Readiness + buffer, per scenario -------------------------- */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map((s) => {
          const buyRow = s.months.find((m) => m.purchaseOutflow > 0);
          return (
            <div key={s.scenarioId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900" title={s.scenarioName}>{s.scenarioName}</h3>
              </div>

              <div className="mt-4 space-y-4">
                <Stat
                  label="House ready"
                  hint="The first month your savings would cover the down payment plus closing costs on the target house, which is itself getting more expensive while you save."
                  value={s.readinessMonth ? monthLabel(settings.startDate, s.readinessMonth) : 'Not on track'}
                  tone={s.readinessMonth ? 'good' : 'bad'}
                  sub={
                    s.readinessMonth
                      ? `month ${s.readinessMonth} · needs ${money(s.readinessCashRequired)}`
                      : `${money(s.readinessCashRequired)} needed, not reached in this window`
                  }
                />
                <Stat
                  label="Thinnest cash"
                  hint="The lowest your spendable savings ever get across the whole projection. This is the resilience number — if it goes below zero, the plan does not fund itself."
                  value={money(s.minCashBuffer)}
                  tone={s.goesNegative ? 'bad' : s.minCashBuffer < 10_000 ? 'neutral' : 'good'}
                  sub={`lowest point: ${monthLabel(settings.startDate, s.minCashBufferMonth)}`}
                />
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  {buyRow ? (
                    <>
                      Buys {monthLabel(settings.startDate, buyRow.month)} ·{' '}
                      {money(buyRow.purchaseOutflow)} up front ·{' '}
                      {money(buyRow.housingPayment)}/mo housing
                      {s.mortgagePaidOffMonth && (
                        <span className="mt-1 block">
                          Mortgage clear {monthLabel(settings.startDate, s.mortgagePaidOffMonth)} ·{' '}
                          {money(s.totalInterestPaid)} interest
                        </span>
                      )}
                      {s.totalMaintenancePaid > 0 && (
                        <span className="mt-1 block">
                          {money(s.totalMaintenancePaid)} upkeep over the window
                          {s.totalPmiPaid > 0 && ` · ${money(s.totalPmiPaid)} mortgage insurance`}
                        </span>
                      )}
                      {s.totalPmiPaid > 0 && s.pmiEndsMonth && (
                        <span className="mt-1 block">
                          Mortgage insurance ends{' '}
                          {monthLabel(settings.startDate, s.pmiEndsMonth)}
                        </span>
                      )}
                      {!s.fundedAtPurchase && (
                        <span className="mt-1 block font-semibold text-red-600">
                          Not enough saved by then.
                        </span>
                      )}
                    </>
                  ) : (
                    'Keeps renting for the whole window.'
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Side-by-side comparison ---------------------------------- */}
      <Card
        title="Side by side"
        subtitle="Where each scenario stands at the end of year 1, 3 and 5."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scenario
                </th>
                {years.map((y) => (
                  <th
                    key={y}
                    className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Net worth · year {y}
                  </th>
                ))}
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Thinnest cash
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  House ready
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.scenarioId} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium text-slate-900">{s.scenarioName}</span>
                    </div>
                  </td>
                  {years.map((y) => (
                    <td key={y} className="py-3 pr-4 text-right tabular-nums text-slate-900">
                      {money(s.netWorthAtYear[y] ?? 0)}
                    </td>
                  ))}
                  <td
                    className={`py-3 pr-4 text-right font-medium tabular-nums ${
                      s.goesNegative ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {money(s.minCashBuffer)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-slate-600">
                    {s.readinessMonth ? monthLabel(settings.startDate, s.readinessMonth) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
