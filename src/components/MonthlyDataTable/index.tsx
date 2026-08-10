import { useState } from "react";
import type { MonthlyResult } from "../../model/types";
import { downloadText, projectionToCsv } from "../../lib/csv";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Button, Card, InfoTip, Select, Table, Td, Th } from "../ui";

/**
 * The raw month-by-month output of the engine, with nothing rounded away.
 * This is the "show me the actual numbers" view -- useful for sanity-checking
 * the model against a spreadsheet, and for spotting exactly which month things
 * turn.
 */

/**
Computed from the row index rather than the CSS `odd:` pseudo-class, because
this same string is reused as the sticky first cell's own background --
`odd:` there would key off the cell's position among its row's *columns*
(always the 1st, so always "odd"), not the row's position in the table.
*/
function rowHighlightClass(row: MonthlyResult, index: number): string {
  if (row.jobLossActive) return "bg-amber-50/70";
  if (row.purchaseOutflow > 0) return "bg-blue-50/70";
  return index % 2 === 1 ? "bg-slate-50/40" : "";
}

function cellEmphasisClass(
  isNegative: boolean,
  hasEmphasis: boolean | undefined,
): string {
  if (isNegative) return "font-semibold text-red-600";
  if (hasEmphasis) return "font-medium text-slate-900";
  return "text-slate-600";
}

const COLUMNS: {
  key: keyof MonthlyResult;
  label: string;
  hint?: string;
  align?: "right";
  emphasis?: boolean;
}[] = [
  {
    key: "netIncome",
    label: "Income",
    hint: "Take-home pay, after any job-loss reduction.",
    align: "right",
  },
  {
    key: "totalExpenses",
    label: "Living costs",
    hint: "Everything except housing, inflated over time.",
    align: "right",
  },
  {
    key: "secondIncome",
    label: "Second income",
    hint: "A partner\u{2019}s take-home, before the costs of working.",
    align: "right",
  },
  {
    key: "secondIncomeCosts",
    label: "Childcare",
    hint: "Childcare and other costs incurred purely because of that second job. Stops at school age.",
    align: "right",
  },
  {
    key: "coResidentIncome",
    label: "Co-resident",
    hint: "A relative\u{2019}s contribution. Starts only once you own, and does not stop during a job loss.",
    align: "right",
  },
  {
    key: "obligations",
    label: "Commitments",
    hint: "Support payments and other fixed commitments. Never inflated, never cut during a job loss.",
    align: "right",
  },
  {
    key: "housingPayment",
    label: "Housing",
    hint: "Rent before you buy; principal, interest, tax, insurance and HOA after.",
    align: "right",
  },
  {
    key: "pmiPayment",
    label: "of which PMI",
    hint: "Mortgage insurance, already included in the housing payment to its left.",
    align: "right",
  },
  {
    key: "homeMaintenance",
    label: "Upkeep",
    hint: "Maintenance and repairs accrued this month. Not a bill you receive, but real money all the same.",
    align: "right",
  },
  {
    key: "netCashFlow",
    label: "Cash flow",
    hint: "Income minus living costs, housing, and your retirement contribution.",
    align: "right",
  },
  {
    key: "purchaseOutflow",
    label: "House purchase",
    hint: "Down payment plus closing costs, in the month you buy.",
    align: "right",
  },
  {
    key: "cashBalance",
    label: "Cash buffer",
    hint: "The emergency fund. Surplus above the buffer target is swept into investments; shortfalls sell investments to refill this.",
    align: "right",
  },
  {
    key: "investmentBalance",
    label: "Investments",
    hint: "The taxable pot outside retirement.",
    align: "right",
  },
  {
    key: "liquidSavings",
    label: "Total liquid",
    hint: "Cash plus investments. Red means the plan does not fund itself.",
    align: "right",
    emphasis: true,
  },
  { key: "retirementBalance", label: "Retirement", align: "right" },
  { key: "homeValue", label: "Home value", align: "right" },
  { key: "mortgageBalance", label: "Mortgage owed", align: "right" },
  { key: "homeEquity", label: "Home equity", align: "right" },
  { key: "netWorth", label: "Net worth", align: "right", emphasis: true },
];

export default function MonthlyDataTable() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  if (summaries.length === 0) {
    return (
      <Card title="Month by month">
        <p className="py-10 text-center text-sm text-slate-400">
          Switch on a scenario above to see its month-by-month numbers.
        </p>
      </Card>
    );
  }

  const selected =
    summaries.find((s) => s.scenarioId === selectedId) ?? summaries[0]!;
  const years = [...new Set(selected.months.map((m) => m.year))].toSorted(
    (a, b) => a - b,
  );
  const rows =
    yearFilter === "all"
      ? selected.months
      : selected.months.filter((m) => m.year === yearFilter);

  return (
    <Card
      title="Month by month"
      subtitle="Every number the model produces, exactly as it computes them. Nothing here is smoothed or rounded away."
      right={
        <Button
          size="sm"
          onClick={() =>
            downloadText(
              `projection-${selected.scenarioName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.csv`,
              projectionToCsv(
                selected.months,
                settings.startDate,
                selected.scenarioName,
              ),
              "text/csv",
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
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.scenarioName}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Year</span>
          <Select
            className="w-32"
            value={String(yearFilter)}
            onChange={(v) => setYearFilter(v === "all" ? "all" : Number(v))}
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

      <Table
        minWidthClassName="min-w-[1500px]"
        scroll="both"
        className="max-h-[560px] rounded-xl border border-slate-200"
      >
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
          <tr>
            <Th sticky className="bg-slate-50 px-3 py-2">
              Month
            </Th>
            {COLUMNS.map((c) => (
              <Th key={String(c.key)} align="right" className="px-3 py-2">
                <span className="inline-flex items-center">
                  {c.label}
                  {c.hint && <InfoTip text={c.hint} placement="bottom" />}
                </span>
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowTint = rowHighlightClass(row, index);
            return (
              <tr
                key={row.month}
                className={`border-b border-slate-100 last:border-0 ${rowTint}`}
              >
                <Td
                  sticky
                  className={`whitespace-nowrap px-3 py-1.5 ${rowTint || "bg-white"}`}
                >
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
                </Td>
                {COLUMNS.map((c) => {
                  const value = row[c.key] as number;
                  const isNegative = value < 0;
                  return (
                    <Td
                      key={String(c.key)}
                      align="right"
                      className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${cellEmphasisClass(isNegative, c.emphasis)} ${value === 0 && !c.emphasis ? "text-slate-300" : ""}`}
                    >
                      {money(value)}
                    </Td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-100" /> the month you buy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-100" /> job-loss months
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-red-600">red</span> negative —
          money you do not have
        </span>
      </div>
    </Card>
  );
}
