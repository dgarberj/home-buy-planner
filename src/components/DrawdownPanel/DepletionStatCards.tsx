import { useTranslation } from "react-i18next";
import type { DrawdownResult } from "../../engine/drawdown";
import type { ScenarioSummary } from "../../model/types";
import { money } from "../../lib/format";
import { Stat } from "../ui";

function depletionTone(
  isRunsOut: boolean,
  lastsTo: number,
  planToAge: number,
): "bad" | "neutral" | "good" {
  if (!isRunsOut) return "good";
  return lastsTo < planToAge - 5 ? "bad" : "neutral";
}

export default function DepletionStatCards({
  results,
  retirementAge,
  planToAge,
  withdrawalRate,
  desiredMonthlySpendToday,
}: {
  results: { summary: ScenarioSummary; result: DrawdownResult }[];
  retirementAge: number;
  planToAge: number;
  withdrawalRate: number;
  desiredMonthlySpendToday: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {results.map(({ summary, result }) => {
        if (result.retirementMonth === null) return null;
        const isRunsOut = result.depletionAge !== null;
        const lastsTo = result.depletionAge ?? planToAge;
        return (
          <div
            key={summary.scenarioId}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: summary.color }}
              />
              <h3
                className="min-w-0 truncate text-sm font-semibold text-slate-900"
                title={summary.scenarioName}
              >
                {summary.scenarioName}
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <Stat
                label={t("drawdownPanel.stats.potAt", "Pot at {{age}}", {
                  age: retirementAge,
                })}
                hint={t(
                  "drawdownPanel.stats.potAtHint",
                  "Retirement accounts plus savings and investments. Home equity is excluded unless you switched it on above.",
                )}
                value={money(result.portfolioAtRetirement)}
                sub={t(
                  "drawdownPanel.stats.potAtSub",
                  "{{retirement}} retirement · {{other}} other",
                  {
                    retirement: money(result.retirementAccountsAtRetirement),
                    other: money(result.liquidAtRetirement),
                  },
                )}
              />
              <Stat
                label={t("drawdownPanel.stats.lastsUntil", "Money lasts until")}
                hint={t(
                  "drawdownPanel.stats.lastsUntilHint",
                  "Simulated month by month: the balance grows at the retirement return and your inflating spending comes out of it.",
                )}
                value={
                  isRunsOut
                    ? t("drawdownPanel.stats.ageValue", "age {{age}}", {
                        age: lastsTo.toFixed(1),
                      })
                    : t("drawdownPanel.stats.pastValue", "past {{age}}", {
                        age: planToAge,
                      })
                }
                tone={depletionTone(isRunsOut, lastsTo, planToAge)}
                sub={
                  isRunsOut
                    ? t(
                        "drawdownPanel.stats.yearsOfIncome",
                        "{{years}} years of income",
                        { years: result.yearsOfIncome.toFixed(1) },
                      )
                    : t(
                        "drawdownPanel.stats.stillLeft",
                        "{{amount}} still left at {{age}}",
                        {
                          amount: money(result.balanceAtPlanEnd),
                          age: planToAge,
                        },
                      )
                }
              />
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                {t(
                  "drawdownPanel.stats.supports",
                  "At {{rate}}% that pot supports",
                  { rate: (withdrawalRate * 100).toFixed(1) },
                )}{" "}
                <strong className="text-slate-700">
                  {money(result.sustainableAnnualIncome)}
                </strong>{" "}
                {t(
                  "drawdownPanel.stats.supportsToday",
                  "a year — about {{amount}} in today's money.",
                  { amount: money(result.sustainableAnnualIncomeToday) },
                )}
                <span
                  className={`mt-1 block font-semibold ${
                    result.meetsTargetAtWithdrawalRate
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {result.meetsTargetAtWithdrawalRate
                    ? t(
                        "drawdownPanel.stats.coversTarget",
                        "Covers the {{amount}}/mo target with room to spare.",
                        { amount: money(desiredMonthlySpendToday) },
                      )
                    : t(
                        "drawdownPanel.stats.shortOfTarget",
                        "{{amount}} a year short of the target.",
                        { amount: money(result.annualShortfall) },
                      )}
                </span>
              </div>
              {result.lifetimeTaxPaid > 0 && (
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <strong className="text-slate-700">
                    {money(result.lifetimeTaxPaid)}
                  </strong>{" "}
                  {t(
                    "drawdownPanel.stats.lifetimeTax",
                    "goes to tax on retirement-account withdrawals over the plan.",
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
