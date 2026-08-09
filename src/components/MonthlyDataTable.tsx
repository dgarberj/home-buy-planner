import { useState } from 'react';
import type { MonthlyResult } from '../model/types';
import { downloadText, projectionToCsv } from '../lib/csv';
import { money, monthLabel } from '../lib/format';
import { useProjections } from '../store/useProjections';
import { useStore } from '../store/useStore';
import { Button, Card, InfoTip, Select } from './ui';

/**
 * The raw month-by-month output of the engine, with nothing rounded away.
 * This is the "show me the actual numbers" view -- useful for sanity-checking
 * the model against a spreadsheet, and for spotting exactly which month things
 * turn.
 */

const COLUMNS: {
  key: keyof MonthlyResult;
  label: string;
  hint?: string;
  align?: 'right';
  emphasis?: boolean;
}[] = [
  { key: 'netIncome', label: 'Income', hint: 'Take-home pay, after any job-loss reduction.', align: 'right' },
  { key: 'totalExpenses', label: 'Living costs', hint: 'Everything except housing, inflated over time.', align: 'right' },
  { key: 'secondIncome', label: 'Second income', hint: 'A partner\u2019s take-home, before the costs of working.', align: 'right' },
  { key: 'secondIncomeCosts', label: 'Childcare', hint: 'Childcare and other costs incurred purely because of that second job. Stops at school age.', align: 'right' },
  { key: 'coResidentIncome', label: 'Co-resident', hint: 'A relative\u2019s contribution. Starts only once you own, and does not stop during a job loss.', align: 'right' },
  { key: 'obligations', label: 'Commitments', hint: 'Support payments and other fixed commitments. Never inflated, never cut during a job loss.', align: 'right' },
  { key: 'housingPayment', label: 'Housing', hint: 'Rent before you buy; principal, interest, tax, insurance and HOA after.', align: 'right' },
  { key: 'pmiPayment', label: 'of which PMI', hint: 'Mortgage insurance, already included in the housing payment to its left.', align: 'right' },
  { key: 'homeMaintenance', label: 'Upkeep', hint: 'Maintenance and repairs accrued this month. Not a bill you receive, but real money all the same.', align: 'right' },
  { key: 'netCashFlow', label: 'Cash flow', hint: 'Income minus living costs, housing, and your retirement contribution.', align: 'right' },
  { key: 'purchaseOutflow', label: 'House purchase', hint: 'Down payment plus closing costs, in the month you buy.', align: 'right' },
  { key: 'cashBalance', label: 'Cash buffer', hint: 'The emergency fund. Surplus above the buffer target is swept into investments; shortfalls sell investments to refill this.', align: 'right' },
  { key: 'investmentBalance', label: 'Investments', hint: 'The taxable pot outside retirement.', align: 'right' },
  { key: 'liquidSavings', label: 'Total liquid', hint: 'Cash plus investments. Red means the plan does not fund itself.', align: 'right', emphasis: true },
  { key: 'retirementBalance', label: 'Retirement', align: 'right' },
  { key: 'homeValue', label: 'Home value', align: 'right' },
  { key: 'mortgageBalance', label: 'Mortgage owed', align: 'right' },
  { key: 'homeEquity', label: 'Home equity', align: 'right' },
  { key: 'netWorth', label: 'Net worth', align: 'right', emphasis: true },
];

export default function MonthlyDataTable() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  if (summaries.length === 0) {
    return (
      <Card title="Month by month">
        <p className="py-10 text-center text-sm text-slate-400">
          Switch on a scenario above to see its month-by-month numbers.
        </p>
      </Card>
    );
  }

  const selected = summaries.find((s) => s.scenarioId === selectedId) ?? summaries[0]!;
  const years = Array.from(
    new Set(selected.months.map((m) => m.year)),
  ).sort((a, b) => a - b);
  const rows =
    yearFilter === 'all' ? selected.months : selected.months.filter((m) => m.year === yearFilter);

  return (
    <Card
      title="Month by month"
      subtitle="Every number the model produces, exactly as it computes them. Nothing here is smoothed or rounded away."
      right={
        <Button
          size="sm"
          onClick={() =>
            downloadText(
              `projection-${selected.scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
              projectionToCsv(selected.months, settings.startDate, selected.scenarioName),
              'text/csv',
            )
          }
        >
          Download CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {summaries.map((s) => (
            <button
              key={s.scenarioId}
              type="button"
              onClick={() => setSelectedId(s.scenarioId)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                s.scenarioId === selected.scenarioId
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.scenarioName}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Year</span>
          <Select
            className="w-32"
            value={String(yearFilter)}
            onChange={(v) => setYearFilter(v === 'all' ? 'all' : Number(v))}
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
          <span className="text-xs text-slate-400">{rows.length} months</span>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1500px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Month
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={String(c.key)}
                  className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <span className="inline-flex items-center">
                    {c.label}
                    {c.hint && <InfoTip text={c.hint} placement="bottom" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={`border-b border-slate-100 last:border-0 ${
                  row.jobLossActive
                    ? 'bg-amber-50/70'
                    : row.purchaseOutflow > 0
                      ? 'bg-blue-50/70'
                      : 'odd:bg-slate-50/40'
                }`}
              >
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="font-medium text-slate-900">
                    {monthLabel(settings.startDate, row.month)}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    #{row.month} · age {Math.floor(row.age)}
                  </span>
                  {row.purchaseOutflow > 0 && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                      Buys
                    </span>
                  )}
                  {row.jobLossActive && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                      No job
                    </span>
                  )}
                </td>
                {COLUMNS.map((c) => {
                  const value = row[c.key] as number;
                  const negative = value < 0;
                  return (
                    <td
                      key={String(c.key)}
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                        negative
                          ? 'font-semibold text-red-600'
                          : c.emphasis
                            ? 'font-medium text-slate-900'
                            : 'text-slate-600'
                      } ${value === 0 && !c.emphasis ? 'text-slate-300' : ''}`}
                    >
                      {money(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-100" /> the month you buy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-100" /> job-loss months
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-red-600">red</span> negative — money you do not have
        </span>
      </div>
    </Card>
  );
}
