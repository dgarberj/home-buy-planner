import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "recharts";
import type { MonthlyResult, ScenarioSummary } from "../../model/types";
import {
  CHART_AXIS_LINE_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from "../../lib/chartTheme";
import { money, moneyShort, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Card } from "../ui";

const METRICS = [
  {
    key: "cashBalance" as const,
    label: "Cash buffer",
    hint: "The emergency fund on its own. Investments get sold before this is allowed to go negative, so a dip here is the first warning sign.",
  },
  {
    key: "liquidSavings" as const,
    label: "Savings & investments",
    hint: "Everything outside retirement that you could get your hands on. This is the line that shows the risk.",
  },
];

export default function NearTermChart() {
  const { t } = useTranslation();
  const { summaries, assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const [metric, setMetric] =
    useState<(typeof METRICS)[number]["key"]>("cashBalance");
  const [xAxis, setXAxis] = useState<"date" | "age">("date");

  const active = METRICS.find((m) => m.key === metric)!;
  const activeLabel = t(`dashboard.nearTerm.metrics.${active.key}.label`, active.label);
  const activeHint = t(`dashboard.nearTerm.metrics.${active.key}.hint`, active.hint);
  const primaryAge = assumptions.household.primaryAge;
  const ageWord = t("dashboard.nearTerm.age", "age");

  /**
  Label a month as either a calendar date or the primary person's age.
  */
  const xLabel = (m: number) =>
    xAxis === "age"
      ? `${ageWord} ${Math.floor(primaryAge + (m - 1) / 12)}`
      : monthLabel(settings.startDate, m);

  /**
  Merge every scenario into one row per month for the chart.
  */
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
    for (
      let m = stepYears * 12;
      m <= settings.horizonMonths;
      m += stepYears * 12
    )
      ticks.push(m);
    return ticks;
  }, [settings.horizonMonths]);

  const buyMarkers = useMemo(
    () =>
      summaries
        .map((s) => ({ s, row: s.months.find((m) => m.purchaseOutflow > 0) }))
        .filter(
          (x): x is { s: ScenarioSummary; row: MonthlyResult } => !!x.row,
        ),
    [summaries],
  );

  return (
    <Card
      title={`${activeLabel} ${t("dashboard.nearTerm.overTime", "over time")}`}
      subtitle={`${t("dashboard.nearTerm.subtitlePrefix", "Near-term: will the plan run dry before you buy?")} ${activeHint}`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["date", "age"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setXAxis(mode)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                  xAxis === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {mode === "date"
                  ? t("dashboard.nearTerm.xAxis.date", "date")
                  : t("dashboard.nearTerm.xAxis.age", "age")}
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
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t(`dashboard.nearTerm.metrics.${m.key}.label`, m.label)}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID_STROKE}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              ticks={yearTicks}
              tickFormatter={xLabel}
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
              labelFormatter={(m) =>
                `${monthLabel(settings.startDate, Number(m))} · ${ageWord} ${Math.floor(
                  primaryAge + (Number(m) - 1) / 12,
                )} · ${t("dashboard.nearTerm.month", "month")} ${m}`
              }
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            />
            {/* Zero line matters when cash goes negative. */}
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            {buyMarkers.map(({ s, row }) => (
              <ReferenceLine
                key={s.scenarioId}
                x={row.month}
                stroke={s.color}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: "🏠", position: "top", fontSize: 14 }}
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
      {buyMarkers.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {t(
            "dashboard.nearTerm.buyMarkersCaption",
            "Dashed lines mark the month each scenario buys. The drop is the down payment and closing costs leaving the account.",
          )}
        </p>
      )}
    </Card>
  );
}
