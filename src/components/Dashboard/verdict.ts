import type { TFunction } from "i18next";
import type { ScenarioSummary } from "../../model/types";
import { money, monthLabel, monthPhrase } from "../../lib/format";

/**
Plain-English verdict for one scenario. `t` is threaded in rather than
called via a hook here since this is a plain function shared by both
`VerdictsCard` and `VerdictStrip`, not a component.
*/
export function verdict(
  s: ScenarioSummary,
  startDate: string,
  t: TFunction,
): { tone: "good" | "warn" | "bad"; text: string } {
  const buyRow = s.months.find((m) => m.purchaseOutflow > 0);
  const hadJobLoss = s.months.some((m) => m.jobLossActive);

  if (s.goesNegative) {
    const bottomOut = t(
      "dashboard.verdict.bottomOut",
      "Cash bottoms out at {{amount}} in {{date}}",
      {
        amount: money(s.minCashBuffer),
        date: monthPhrase(startDate, s.minCashBufferMonth, t),
      },
    );
    const buyingClause = buyRow
      ? t("dashboard.verdict.buyingClause", ", after buying in {{date}}", {
          date: monthLabel(startDate, buyRow.month),
        })
      : "";
    return {
      tone: "bad",
      text: `${t("dashboard.verdict.runsOutOfMoney", "This plan runs out of money.")} ${bottomOut}${buyingClause}.`,
    };
  }

  const parts: string[] = [];
  if (buyRow) {
    parts.push(
      t(
        "dashboard.verdict.buyingWorks",
        "Buying in {{date}} works — it takes {{upfront}} up front and leaves {{leftover}} in the bank",
        {
          date: monthPhrase(startDate, buyRow.month, t),
          upfront: money(buyRow.purchaseOutflow),
          leftover: money(buyRow.liquidSavings),
        },
      ),
    );
  } else {
    parts.push(
      s.readinessMonth
        ? t(
            "dashboard.verdict.rentingReady",
            "Renting throughout. You'd have enough for a down payment by {{date}}",
            { date: monthPhrase(startDate, s.readinessMonth, t) },
          )
        : t(
            "dashboard.verdict.rentingNotReady",
            "Renting throughout, and the down payment isn't funded within this window",
          ),
    );
  }
  if (hadJobLoss) {
    parts.push(
      t(
        "dashboard.verdict.throughJobLoss",
        "and you'd still get through the job loss, with {{amount}} at the thinnest point",
        { amount: money(s.minCashBuffer) },
      ),
    );
  }

  const isThin = s.minCashBuffer < 10_000;
  return {
    tone: isThin ? "warn" : "good",
    text: `${parts.join(", ")}.${
      isThin
        ? ` ${t(
            "dashboard.verdict.thinCushion",
            "That is a thin cushion — worth a closer look.",
          )}`
        : ""
    }`,
  };
}

/**
 * Picks the single worst-tone verdict across all currently-enabled
 * scenarios, for a one-line headline. "Worst" means bad > warn > good --
 * consistent with LeversBar's `measure()`: the buffer is a risk measure, so
 * the weakest one is what matters.
 */
export function worstVerdict(
  summaries: ScenarioSummary[],
  startDate: string,
  t: TFunction,
):
  | (ReturnType<typeof verdict> & { scenarioName: string; color: string })
  | null {
  const tonesRank = { bad: 0, warn: 1, good: 2 } as const;
  let worst: { s: ScenarioSummary; v: ReturnType<typeof verdict> } | null =
    null;
  for (const s of summaries) {
    const v = verdict(s, startDate, t);
    if (!worst || tonesRank[v.tone] < tonesRank[worst.v.tone]) worst = { s, v };
  }
  return (
    worst && {
      ...worst.v,
      scenarioName: worst.s.scenarioName,
      color: worst.s.color,
    }
  );
}
