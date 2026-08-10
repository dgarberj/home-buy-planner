import type { ScenarioSummary } from "../../model/types";
import { money, monthLabel, monthPhrase } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card } from "../ui";

/**
Plain-English verdict for one scenario.
*/
function verdict(
  s: ScenarioSummary,
  startDate: string,
): { tone: "good" | "warn" | "bad"; text: string } {
  const buyRow = s.months.find((m) => m.purchaseOutflow > 0);
  const hadJobLoss = s.months.some((m) => m.jobLossActive);

  if (s.goesNegative) {
    const bottomOut = `Cash bottoms out at ${money(s.minCashBuffer)} in ${monthPhrase(startDate, s.minCashBufferMonth)}`;
    const buyingClause = buyRow
      ? `, after buying in ${monthLabel(startDate, buyRow.month)}`
      : "";
    return {
      tone: "bad",
      text: `This plan runs out of money. ${bottomOut}${buyingClause}.`,
    };
  }

  const parts: string[] = [];
  if (buyRow) {
    parts.push(
      `Buying in ${monthPhrase(startDate, buyRow.month)} works — it takes ${money(
        buyRow.purchaseOutflow,
      )} up front and leaves ${money(buyRow.liquidSavings)} in the bank`,
    );
  } else {
    parts.push(
      s.readinessMonth
        ? `Renting throughout. You'd have enough for a down payment by ${monthPhrase(startDate, s.readinessMonth)}`
        : `Renting throughout, and the down payment isn't funded within this window`,
    );
  }
  if (hadJobLoss) {
    parts.push(
      `and you'd still get through the job loss, with ${money(s.minCashBuffer)} at the thinnest point`,
    );
  }

  const isThin = s.minCashBuffer < 10_000;
  return {
    tone: isThin ? "warn" : "good",
    text: `${parts.join(", ")}.${isThin ? " That is a thin cushion — worth a closer look." : ""}`,
  };
}

export default function VerdictsCard() {
  const { summaries } = useProjections();
  const settings = useStore((s) => s.settings);

  return (
    <Card
      title="What this means"
      subtitle="One plain-English read on each scenario you have switched on."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {summaries.map((s) => {
          const v = verdict(s, settings.startDate);
          return (
            <Callout key={s.scenarioId} tone={v.tone}>
              <span
                className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle"
                style={{ backgroundColor: s.color }}
              />
              <strong>{s.scenarioName}.</strong> {v.text}
            </Callout>
          );
        })}
      </div>
    </Card>
  );
}
