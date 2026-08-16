import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { COST_DEFAULTS } from "../../costDefaults";
import { ALL_MUNICIPALITIES, effectiveRate } from "../../data/localMarket";
import { ratingSummary } from "../../data/schools";
import {
  affordabilityTimeline,
  housingBudget,
  waitingVerdict,
} from "../../engine/affordability";
import { runProjection } from "../../engine/projection";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import {
  Callout,
  Card,
  Field,
  InfoTip,
  MoneyInput,
  NumberInput,
  SectionTitle,
  Table,
  Td,
  Th,
} from "../ui";

/**
 * "Is it worth saving longer for a house that is out of reach today?"
 *
 * The answer turns on which constraint is actually binding, and people almost
 * always assume it is the deposit. Usually it is not.
 */
export default function WaitingPanel() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const settings = useStore((s) => s.settings);

  const [reserve, setReserve] = useState(
    COST_DEFAULTS.defaultReserveForSavingsUsd,
  );
  const [bufferMonths, setBufferMonths] = useState(3);
  const horizon = Math.min(settings.horizonMonths, 240);

  /**
  Cash if you carry on renting -- the money available to put down.
  */
  const cashTrack = useMemo(
    () =>
      runProjection(
        assumptions,
        {
          id: "rent",
          name: "rent",
          buyMonth: null,
          hasJobLoss: false,
          enabled: true,
          color: "#000",
        },
        horizon,
        settings.grossAnnualSalary,
      ).map((r) => r.liquidSavings),
    [assumptions, horizon, settings.grossAnnualSalary],
  );

  const budgetToday = housingBudget(assumptions, {
    atMonth: 1,
    reserveForSavings: reserve,
    grossAnnualSalary: settings.grossAnnualSalary,
  });

  const verdicts = useMemo(
    () =>
      ALL_MUNICIPALITIES.filter((m) => m.medianPrice)
        .map((m) => {
          const timeline = affordabilityTimeline(assumptions, {
            medianPriceToday: m.medianPrice!,
            effectiveTaxRate: effectiveRate(m),
            insuranceMonthly: COST_DEFAULTS.flatMonthlyInsuranceUsd,
            months: horizon,
            reserveForSavings: reserve,
            grossAnnualSalary: settings.grossAnnualSalary,
            cashTrack,
            bufferMonthsRequired: bufferMonths,
          });
          return { m, verdict: waitingVerdict(m.name, timeline) };
        })
        .toSorted((a, b) => {
          const av = a.verdict.affordableFrom ?? Infinity;
          const bv = b.verdict.affordableFrom ?? Infinity;
          return av - bv || (a.m.medianPrice ?? 0) - (b.m.medianPrice ?? 0);
        }),
    [
      assumptions,
      cashTrack,
      horizon,
      reserve,
      bufferMonths,
      settings.grossAnnualSalary,
    ],
  );

  const soonest = verdicts.find((v) => v.verdict.affordableFrom !== null);

  const monthCell = (n: number | null) =>
    n === null ? (
      <span className="text-red-600">{t("waitingPanel.never", "never")}</span>
    ) : (
      <>
        {monthLabel(settings.startDate, n)}
        <span className="ml-1.5 text-xs text-slate-400">m{n}</span>
      </>
    );

  return (
    <div className="space-y-5">
      <Card
        title={t(
          "waitingPanel.title",
          "Is it worth waiting for a better house?",
        )}
        subtitle={t(
          "waitingPanel.subtitle",
          "Two things gate you, and they improve at completely different speeds.",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t("waitingPanel.reserve.label", "Keep saving each month")}
            hint={t(
              "waitingPanel.reserve.hint",
              "Held back from the housing budget so you carry on building a cushion after moving in.",
            )}
          >
            <MoneyInput value={reserve} step={50} onChange={setReserve} />
          </Field>
          <Field
            label={t(
              "waitingPanel.bufferMonths.label",
              "Buffer left after closing (months)",
            )}
            hint={t(
              "waitingPanel.bufferMonths.hint",
              "Months of total outgoings you want still in the bank the day after you complete.",
            )}
          >
            <NumberInput
              value={bufferMonths}
              min={0}
              max={12}
              onChange={setBufferMonths}
            />
          </Field>
          <div>
            <SectionTitle>
              {t("waitingPanel.housingBudgetToday", "Housing budget today")}
            </SectionTitle>
            <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
              {money(budgetToday.monthlyBudget)}
            </p>
          </div>
        </div>

        <Callout tone="neutral">
          <Trans
            i18nKey="waitingPanel.depositRarelyProblem"
            components={{ b: <strong />, i: <em /> }}
          >
            <b>The deposit is rarely the problem.</b> Saving longer fixes the{" "}
            <i>cash</i> constraint — deposit, closing costs, cushion — and
            that improves every month. It does almost nothing for the{" "}
            <i>monthly</i> constraint, which only moves when your pay rises
            or a commitment ends, and moves backwards as prices climb. A
            house that is out of reach on the payment stays out of reach
            however long you save.
          </Trans>
        </Callout>
      </Card>

      <Card
        title={t(
          "waitingPanel.tableCard.title",
          "When each town comes within reach",
        )}
        subtitle={t(
          "waitingPanel.tableCard.subtitle",
          "Both constraints have to clear. The later of the two is what actually gates you.",
        )}
      >
        <Table minWidthClassName="min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              <Th sticky className="bg-white pb-2 pr-4">
                {t("waitingPanel.columns.town", "Town")}
              </Th>
              <Th align="right" className="pb-2 pr-4">
                {t("waitingPanel.columns.medianToday", "Median today")}
              </Th>
              <Th className="pb-2 pr-4">
                <span className="inline-flex items-center">
                  {t("waitingPanel.columns.paymentWorksFrom", "Payment works from")}
                  <InfoTip
                    placement="bottom"
                    text={t(
                      "waitingPanel.columns.paymentWorksFromHint",
                      "When your budget could carry the monthly cost. Driven by pay rises and commitments ending — not by saving.",
                    )}
                  />
                </span>
              </Th>
              <Th className="pb-2 pr-4">
                <span className="inline-flex items-center">
                  {t("waitingPanel.columns.cashReady", "Cash ready")}
                  <InfoTip
                    placement="bottom"
                    text={t(
                      "waitingPanel.columns.cashReadyHint",
                      "When you would have the deposit, closing costs and your chosen buffer. This is the part saving actually fixes.",
                    )}
                  />
                </span>
              </Th>
              <Th className="pb-2 pr-4">
                {t("waitingPanel.columns.buyable", "Buyable")}
              </Th>
              <Th className="pb-2">
                {t("waitingPanel.columns.schools", "Schools")}
              </Th>
            </tr>
          </thead>
          <tbody>
            {verdicts.map(({ m, verdict }) => {
              const isNever = verdict.affordableFrom === null;
              return (
                <tr
                  key={`${m.countyKey}-${m.name}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <Td
                    sticky
                    className="bg-white py-2 pr-4 font-medium text-slate-900"
                  >
                    {m.name}
                  </Td>
                  <Td
                    align="right"
                    className="py-2 pr-4 tabular-nums text-slate-600"
                  >
                    {money(m.medianPrice!)}
                  </Td>
                  <Td className="py-2 pr-4 text-slate-600">
                    {monthCell(verdict.monthlyGapClosesAt)}
                  </Td>
                  <Td className="py-2 pr-4 text-slate-600">
                    {monthCell(verdict.cashReadyAt)}
                  </Td>
                  <Td
                    className={`py-2 pr-4 font-semibold ${isNever ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {monthCell(verdict.affordableFrom)}
                  </Td>
                  <Td className="py-2 text-xs text-slate-500">
                    {ratingSummary(m.schoolDistrict) ?? (
                      <span className="text-slate-300">
                        {t("waitingPanel.notSourced", "not sourced")}
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {soonest && (
          <Callout tone="good">
            <strong>
              {t(
                "waitingPanel.soonest.headline",
                "Soonest in reach: {{name}}, from {{date}}.",
                {
                  name: soonest.m.name,
                  date: monthLabel(
                    settings.startDate,
                    soonest.verdict.affordableFrom!,
                  ),
                },
              )}
            </strong>{" "}
            {t(
              "waitingPanel.soonest.body",
              "Anything further up the list costs you extra months of waiting AND a bigger payment for the rest of the mortgage. The dashboard shows what that does to net worth at 65 — in this model, every upgrade costs you, so the question is whether the schools and the space are worth the price rather than whether you come out ahead.",
            )}
          </Callout>
        )}

        <Callout tone="warn">
          <Trans
            i18nKey="waitingPanel.clockYourChildrenAreOn"
            components={{ b: <strong /> }}
          >
            <b>The clock your children are on.</b> If waiting for a better
            school district means eleven more years of renting, they will
            have spent most of their schooling in the district you were
            trying to leave. Waiting for a house is not free even when the
            arithmetic says you can afford more later.
          </Trans>
        </Callout>
      </Card>
    </div>
  );
}
