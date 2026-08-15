import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Card, Table, Td, Th } from "../ui";

export default function ScenarioComparisonTable() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);
  const years = [1, 3, 5].filter((y) => y * 12 <= settings.horizonMonths);

  return (
    <Card
      title="Side by side"
      subtitle="Where each scenario stands at the end of year 1, 3 and 5."
    >
      <Table minWidthClassName="min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-200">
            <Th sticky className="bg-white pb-2 pr-4">
              Scenario
            </Th>
            {years.map((y) => (
              <Th key={y} align="right" className="pb-2 pr-4">
                Net worth · year {y}
              </Th>
            ))}
            <Th align="right" className="pb-2 pr-4">
              Thinnest cash
            </Th>
            <Th align="right" className="pb-2">
              House ready
            </Th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr
              key={s.scenarioId}
              className="border-b border-slate-100 last:border-0"
            >
              <Td sticky className="bg-white py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium text-slate-900">
                    {s.scenarioName}
                  </span>
                </div>
              </Td>
              {years.map((y) => (
                <Td
                  key={y}
                  align="right"
                  className="py-3 pr-4 tabular-nums text-slate-900"
                >
                  {money(s.netWorthAtYear[y] ?? 0)}
                </Td>
              ))}
              <Td
                align="right"
                className={`py-3 pr-4 font-medium tabular-nums ${
                  s.goesNegative ? "text-red-600" : "text-slate-900"
                }`}
              >
                {money(s.minCashBuffer)}
              </Td>
              <Td align="right" className="py-3 tabular-nums text-slate-600">
                {s.readinessMonth
                  ? monthLabel(settings.startDate, s.readinessMonth)
                  : "—"}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
