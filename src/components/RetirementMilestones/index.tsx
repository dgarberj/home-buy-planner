import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { money, monthLabel } from "../../lib/format";
import {
  RETIREMENT_METRICS as METRICS,
  reachableMilestoneAges,
  type RetirementMetricKey,
} from "../../lib/retirementMetrics";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card, InfoTip, Table, Td, Th } from "../ui";

/**
 * Where each scenario lands at retirement age.
 *
 * This is the view that answers "does buying early cost us at 65?" -- and the
 * honest answer is subtle enough to be worth spelling out on screen rather than
 * leaving someone to infer it from a chart.
 */

/**
Do the scenarios differ on this measure by enough to be worth remarking on?
*/
function spread(values: number[]): number {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

export default function RetirementMilestones() {
  const { t } = useTranslation();
  const { summaries, assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const [metric, setMetric] = useState<RetirementMetricKey>("netWorthAtAge");

  const active = METRICS.find((m) => m.key === metric)!;
  const activeLabel = t(
    `dashboard.retirementOutlook.metrics.${active.key}.label`,
    active.label,
  );
  const activeHint = t(
    `dashboard.retirementOutlook.metrics.${active.key}.hint`,
    active.hint,
  );

  // Only show ages the projection actually reaches.
  const ages = reachableMilestoneAges(
    settings.milestoneAges,
    summaries,
    metric,
  );

  if (summaries.length === 0) return null;

  if (ages.length === 0) {
    const primaryAge = assumptions.household.primaryAge;
    const endAge = primaryAge + Math.floor(settings.horizonMonths / 12);
    return (
      <Card title={t("retirementMilestones.title", "At retirement")}>
        <Callout tone="neutral">
          <Trans
            i18nKey="dashboard.retirementOutlook.emptyBody"
            values={{ endAge }}
            components={{ b: <strong /> }}
          >
            The projection only runs to age {{ endAge }}, so none of your
            milestone ages are reached yet. Stretch the projection window in
            Assumptions — the <b>To 65</b> or <b>To 70</b> preset is the
            quickest way.
          </Trans>
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
      title={t("retirementMilestones.title", "At retirement")}
      subtitle={`${t("retirementMilestones.subtitlePrefix", "Where each scenario lands as you age.")} ${activeHint}`}
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
              {t(`dashboard.retirementOutlook.metrics.${m.key}.label`, m.label)}
            </button>
          ))}
        </div>
      }
    >
      <Table minWidthClassName="min-w-[880px]">
        <thead>
          <tr className="border-b border-slate-200">
            <Th sticky className="bg-white pb-2 pr-4">
              {t("retirementMilestones.scenario", "Scenario")}
            </Th>
            {ages.map((age) => (
              <Th key={age} align="right" className="pb-2 pr-4">
                <div>
                  {t("retirementMilestones.ageColumn", "Age {{age}}", { age })}
                </div>
                <div className="font-normal normal-case tracking-normal text-slate-400">
                  {t("retirementMilestones.partnerAge", "partner {{age}}", {
                    age: partnerAgeAt(age),
                  })}
                </div>
              </Th>
            ))}
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
                {s.mortgagePaidOffMonth && (
                  <div className="ml-4.5 mt-0.5 text-xs text-slate-400">
                    {t(
                      "retirementMilestones.mortgageClear",
                      "mortgage clear {{date}}",
                      {
                        date: monthLabel(
                          settings.startDate,
                          s.mortgagePaidOffMonth,
                        ),
                      },
                    )}
                  </div>
                )}
              </Td>
              {ages.map((age) => {
                const value = s[metric][age];
                const isBest = value !== undefined && value === bestByAge[age];
                return (
                  <Td
                    key={age}
                    align="right"
                    className={`py-3 pr-4 tabular-nums ${
                      isBest
                        ? "font-semibold text-emerald-700"
                        : "text-slate-900"
                    }`}
                  >
                    {value === undefined ? "—" : money(value)}
                  </Td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      <p className="mt-3 text-xs text-slate-500">
        {t(
          "retirementMilestones.bestHighlighted",
          "Best value in each column is highlighted.",
        )}
      </p>

      {/* --- The part that is easy to get wrong ------------------------- */}
      <div className="mt-5 space-y-3">
        <Callout tone="neutral">
          <Trans
            i18nKey="retirementMilestones.whereItShowsUp"
            values={{
              finalAge,
              retirementGapMoney: money(retirementGap),
              gapMoney: money(gap),
              metricLabel: activeLabel.toLowerCase(),
            }}
            components={{ b: <strong /> }}
          >
            <b>Where buying early actually shows up.</b> Your retirement
            contributions do not change when you buy a house — so at age{" "}
            {{ finalAge }} the retirement accounts differ by only{" "}
            {{ retirementGapMoney: money(retirementGap) }} across these
            scenarios, and that difference comes entirely from contributions
            pausing during a job loss. The real effect of buy timing lands
            in <b>home equity and investments</b>: a mortgage payment is
            fixed for thirty years while rent keeps inflating, so an owner's
            monthly surplus grows over time and compounds. At age{" "}
            {{ finalAge }} that adds up to a {{ gapMoney: money(gap) }}{" "}
            spread in {{ metricLabel: activeLabel.toLowerCase() }}.
          </Trans>
        </Callout>

        <Callout tone="warn">
          <strong>
            {t(
              "retirementMilestones.savingUpTitle",
              "This projects saving up, not living off it.",
            )}
          </strong>
          <InfoTip
            text={t(
              "retirementMilestones.savingUpTip",
              "Modelling retirement drawdown would need withdrawal rates, tax treatment per account type, Social Security and required minimum distributions — a much bigger model than this one.",
            )}
          />{" "}
          {t(
            "retirementMilestones.savingUpBody",
            '"Net worth at {{finalAge}}" means what you will have built by then. It says nothing about taxes on withdrawal, Social Security, healthcare costs, or how long the money lasts.',
            { finalAge },
          )}
        </Callout>
      </div>
    </Card>
  );
}
