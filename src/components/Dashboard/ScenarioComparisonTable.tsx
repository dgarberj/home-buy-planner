import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Card } from "../ui";

export default function ScenarioComparisonTable() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);
  const years = [1, 3, 5].filter((y) => y * 12 <= settings.horizonMonths);

  return (
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
                    <span className="font-medium text-slate-900">
                      {s.scenarioName}
                    </span>
                  </div>
                </td>
                {years.map((y) => (
                  <td
                    key={y}
                    className="py-3 pr-4 text-right tabular-nums text-slate-900"
                  >
                    {money(s.netWorthAtYear[y] ?? 0)}
                  </td>
                ))}
                <td
                  className={`py-3 pr-4 text-right font-medium tabular-nums ${
                    s.goesNegative ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {money(s.minCashBuffer)}
                </td>
                <td className="py-3 text-right tabular-nums text-slate-600">
                  {s.readinessMonth
                    ? monthLabel(settings.startDate, s.readinessMonth)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
