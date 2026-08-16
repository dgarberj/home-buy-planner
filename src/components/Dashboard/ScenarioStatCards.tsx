import { useTranslation } from "react-i18next";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Stat } from "../ui";

function thinnestCashTone(
  isGoingNegative: boolean,
  minCashBuffer: number,
): "bad" | "neutral" | "good" {
  if (isGoingNegative) return "bad";
  if (minCashBuffer < 10_000) return "neutral";
  return "good";
}

export default function ScenarioStatCards() {
  const { t } = useTranslation();
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaries.map((s) => {
        const buyRow = s.months.find((m) => m.purchaseOutflow > 0);
        return (
          <div
            key={s.scenarioId}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <h3
                className="min-w-0 truncate text-sm font-semibold text-slate-900"
                title={s.scenarioName}
              >
                {s.scenarioName}
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <Stat
                label={t("dashboard.statCards.houseReady.label", "House ready")}
                hint={t(
                  "dashboard.statCards.houseReady.hint",
                  "The first month your savings would cover the down payment plus closing costs on the target house, which is itself getting more expensive while you save.",
                )}
                value={
                  s.readinessMonth
                    ? monthLabel(settings.startDate, s.readinessMonth)
                    : t("dashboard.statCards.houseReady.notOnTrack", "Not on track")
                }
                tone={s.readinessMonth ? "good" : "bad"}
                sub={
                  s.readinessMonth
                    ? t(
                        "dashboard.statCards.houseReady.subReady",
                        "month {{month}} · needs {{amount}}",
                        {
                          month: s.readinessMonth,
                          amount: money(s.readinessCashRequired),
                        },
                      )
                    : t(
                        "dashboard.statCards.houseReady.subNotReady",
                        "{{amount}} needed, not reached in this window",
                        { amount: money(s.readinessCashRequired) },
                      )
                }
              />
              <Stat
                label={t("dashboard.statCards.thinnestCash.label", "Thinnest cash")}
                hint={t(
                  "dashboard.statCards.thinnestCash.hint",
                  "The lowest your spendable savings ever get across the whole projection. This is the resilience number — if it goes below zero, the plan does not fund itself.",
                )}
                value={money(s.minCashBuffer)}
                tone={thinnestCashTone(s.goesNegative, s.minCashBuffer)}
                sub={t(
                  "dashboard.statCards.thinnestCash.sub",
                  "lowest point: {{date}}",
                  { date: monthLabel(settings.startDate, s.minCashBufferMonth) },
                )}
              />
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                {buyRow ? (
                  <>
                    {t(
                      "dashboard.statCards.buys",
                      "Buys {{date}} · {{upfront}} up front · {{monthly}}/mo housing",
                      {
                        date: monthLabel(settings.startDate, buyRow.month),
                        upfront: money(buyRow.purchaseOutflow),
                        monthly: money(buyRow.housingPayment),
                      },
                    )}
                    {s.mortgagePaidOffMonth && (
                      <span className="mt-1 block">
                        {t(
                          "dashboard.statCards.mortgageClear",
                          "Mortgage clear {{date}} · {{interest}} interest",
                          {
                            date: monthLabel(
                              settings.startDate,
                              s.mortgagePaidOffMonth,
                            ),
                            interest: money(s.totalInterestPaid),
                          },
                        )}
                      </span>
                    )}
                    {s.totalMaintenancePaid > 0 && (
                      <span className="mt-1 block">
                        {t(
                          "dashboard.statCards.upkeep",
                          "{{amount}} upkeep over the window",
                          { amount: money(s.totalMaintenancePaid) },
                        )}
                        {s.totalPmiPaid > 0 &&
                          ` · ${t(
                            "dashboard.statCards.mortgageInsurance",
                            "{{amount}} mortgage insurance",
                            { amount: money(s.totalPmiPaid) },
                          )}`}
                      </span>
                    )}
                    {s.totalPmiPaid > 0 && s.pmiEndsMonth && (
                      <span className="mt-1 block">
                        {t(
                          "dashboard.statCards.pmiEnds",
                          "Mortgage insurance ends {{date}}",
                          {
                            date: monthLabel(
                              settings.startDate,
                              s.pmiEndsMonth,
                            ),
                          },
                        )}
                      </span>
                    )}
                    {!s.fundedAtPurchase && (
                      <span className="mt-1 block font-semibold text-red-600">
                        {t(
                          "dashboard.statCards.notEnoughSaved",
                          "Not enough saved by then.",
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  t(
                    "dashboard.statCards.keepsRenting",
                    "Keeps renting for the whole window.",
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
