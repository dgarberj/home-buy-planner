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
                label="House ready"
                hint="The first month your savings would cover the down payment plus closing costs on the target house, which is itself getting more expensive while you save."
                value={
                  s.readinessMonth
                    ? monthLabel(settings.startDate, s.readinessMonth)
                    : "Not on track"
                }
                tone={s.readinessMonth ? "good" : "bad"}
                sub={
                  s.readinessMonth
                    ? `month ${s.readinessMonth} · needs ${money(s.readinessCashRequired)}`
                    : `${money(s.readinessCashRequired)} needed, not reached in this window`
                }
              />
              <Stat
                label="Thinnest cash"
                hint="The lowest your spendable savings ever get across the whole projection. This is the resilience number — if it goes below zero, the plan does not fund itself."
                value={money(s.minCashBuffer)}
                tone={thinnestCashTone(s.goesNegative, s.minCashBuffer)}
                sub={`lowest point: ${monthLabel(settings.startDate, s.minCashBufferMonth)}`}
              />
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                {buyRow ? (
                  <>
                    Buys {monthLabel(settings.startDate, buyRow.month)} ·{" "}
                    {money(buyRow.purchaseOutflow)} up front ·{" "}
                    {money(buyRow.housingPayment)}/mo housing
                    {s.mortgagePaidOffMonth && (
                      <span className="mt-1 block">
                        Mortgage clear{" "}
                        {monthLabel(settings.startDate, s.mortgagePaidOffMonth)}{" "}
                        · {money(s.totalInterestPaid)} interest
                      </span>
                    )}
                    {s.totalMaintenancePaid > 0 && (
                      <span className="mt-1 block">
                        {money(s.totalMaintenancePaid)} upkeep over the window
                        {s.totalPmiPaid > 0 &&
                          ` · ${money(s.totalPmiPaid)} mortgage insurance`}
                      </span>
                    )}
                    {s.totalPmiPaid > 0 && s.pmiEndsMonth && (
                      <span className="mt-1 block">
                        Mortgage insurance ends{" "}
                        {monthLabel(settings.startDate, s.pmiEndsMonth)}
                      </span>
                    )}
                    {!s.fundedAtPurchase && (
                      <span className="mt-1 block font-semibold text-red-600">
                        Not enough saved by then.
                      </span>
                    )}
                  </>
                ) : (
                  "Keeps renting for the whole window."
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
