import { runDrawdown } from "../../engine/drawdown";
import { useProjections } from "../../store/useProjections";
import { Callout, Card } from "../ui";
import DepletionChart from "./DepletionChart";
import DepletionStatCards from "./DepletionStatCards";
import RetirementDialsCard from "./RetirementDialsCard";

/**
 * "Will it last?" -- the question that makes the accumulation numbers mean
 * something. Shown per scenario, because the whole point is to see whether the
 * house decision changes the answer.
 */
export default function DrawdownPanel() {
  const { summaries, assumptions } = useProjections();
  const d = assumptions.drawdown;

  const results = summaries.map((s) => ({
    summary: s,
    result: runDrawdown(s.months, assumptions),
  }));

  const anyReached = results.some((r) => r.result.retirementMonth !== null);

  return (
    <div className="space-y-5">
      <RetirementDialsCard />

      {anyReached ? (
        <>
          <DepletionStatCards
            results={results}
            retirementAge={d.retirementAge}
            planToAge={d.planToAge}
            withdrawalRate={d.withdrawalRate}
            desiredMonthlySpendToday={d.desiredMonthlySpendToday}
          />

          <DepletionChart
            results={results}
            retirementAge={d.retirementAge}
            planToAge={d.planToAge}
            desiredMonthlySpendToday={d.desiredMonthlySpendToday}
          />

          <Callout tone="warn">
            <strong>What this leaves out.</strong> Tax on withdrawal is a single
            flat effective rate on retirement-account money only — no brackets,
            filing status, state tax, or capital-gains treatment. There is also
            no Social Security or pension income, no required minimum
            distributions, no healthcare shocks — and, most importantly, a
            single smooth return every year. Real markets deliver their bad
            years in clumps, and a crash early in retirement does far more
            damage than the same crash later. Treat the age the money runs out
            as a rough marker, not a date.
          </Callout>
        </>
      ) : (
        <Card title="Will the money last?">
          <Callout tone="neutral">
            Age {d.retirementAge} falls outside the projection window, so there
            is nothing to draw down yet. Stretch the window in Assumptions — the{" "}
            <strong>To 70</strong> preset covers most retirement ages.
          </Callout>
        </Card>
      )}
    </div>
  );
}
