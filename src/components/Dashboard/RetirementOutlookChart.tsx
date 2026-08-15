import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_LINE_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from "../../lib/chartTheme";
import { money, moneyShort } from "../../lib/format";
import {
  RETIREMENT_METRICS,
  reachableMilestoneAges,
  type RetirementMetricKey,
} from "../../lib/retirementMetrics";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card } from "../ui";

/**
 * Where each scenario lands at a handful of ages, as bars instead of lines --
 * over a multi-decade horizon the scenarios' lines sit close enough together
 * that a continuous chart hides the gap this is meant to show.
 */
export default function RetirementOutlookChart() {
  const { summaries, assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const [metric, setMetric] = useState<RetirementMetricKey>("netWorthAtAge");

  const active = RETIREMENT_METRICS.find((m) => m.key === metric)!;
  const retirementAge = assumptions.drawdown.retirementAge;

  // Ages before retirement crowd the axis without adding anything -- the
  // question this chart answers only starts to matter once you've stopped
  // working, and including earlier ages compresses the bars enough to hide
  // the gap between scenarios.
  const ages = useMemo(
    () =>
      reachableMilestoneAges(
        settings.milestoneAges,
        summaries,
        metric,
        retirementAge,
      ),
    [settings.milestoneAges, summaries, metric, retirementAge],
  );

  const chartData = useMemo(
    () =>
      ages.map((age) => {
        const row: Record<string, number> = { age };
        for (const s of summaries) {
          const value = s[metric][age];
          if (value !== undefined) row[s.scenarioId] = Math.round(value);
        }
        return row;
      }),
    [ages, summaries, metric],
  );

  if (summaries.length === 0) return null;

  if (ages.length === 0) {
    const primaryAge = assumptions.household.primaryAge;
    const endAge = primaryAge + Math.floor(settings.horizonMonths / 12);
    return (
      <Card title="At retirement, over time">
        <Callout tone="neutral">
          The projection only runs to age {endAge}, so none of your milestone
          ages are reached yet. Stretch the projection window in Assumptions —
          the <strong>To 65</strong> or <strong>To 70</strong> preset is the
          quickest way.
        </Callout>
      </Card>
    );
  }

  return (
    <Card
      title={active.label + " at each milestone age"}
      subtitle={`Long-term: how far apart do the scenarios end up? ${active.hint}`}
      right={
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {RETIREMENT_METRICS.map((m) => (
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
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID_STROKE}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tickFormatter={(a: number) => `age ${a}`}
              tick={CHART_AXIS_TICK_STYLE}
              axisLine={CHART_AXIS_LINE_STYLE}
              tickLine={false}
            />
            <YAxis
              tickFormatter={moneyShort}
              tick={CHART_AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              formatter={(value) => money(Number(value))}
              labelFormatter={(a) => `age ${a}`}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            />
            {summaries.map((s) => (
              <Bar
                key={s.scenarioId}
                dataKey={s.scenarioId}
                name={s.scenarioName}
                fill={s.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
