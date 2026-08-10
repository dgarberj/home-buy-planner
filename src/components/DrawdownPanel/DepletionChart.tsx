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
import type { DrawdownResult } from "../../engine/drawdown";
import type { ScenarioSummary } from "../../model/types";
import { money, moneyShort } from "../../lib/format";
import { Card } from "../ui";

export default function DepletionChart({
  results,
  retirementAge,
  planToAge,
  desiredMonthlySpendToday,
}: {
  results: { summary: ScenarioSummary; result: DrawdownResult }[];
  retirementAge: number;
  planToAge: number;
  desiredMonthlySpendToday: number;
}) {
  /**
  One row per year, one column per scenario, for the depletion chart.
  */
  const chartData: Record<string, number>[] = [];
  const longest = Math.max(0, ...results.map((r) => r.result.track.length));
  for (let index = 0; index < longest; index++) {
    const row: Record<string, number> = { age: retirementAge + index + 1 };
    for (const r of results) {
      const point = r.result.track[index];
      if (point) row[r.summary.scenarioId] = Math.round(point.balance);
    }
    chartData.push(row);
  }

  return (
    <Card
      title="The money running down"
      subtitle={`Balance from age ${retirementAge} to ${planToAge}, spending ${money(
        desiredMonthlySpendToday,
      )} a month in today's money. Where a line hits zero, the money is gone.`}
    >
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
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
  );
}
