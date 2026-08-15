import type { ScenarioSummary } from "../model/types";

/**
Shared between the "At retirement" table and the retirement outlook chart --
both answer "where does each scenario land at a given age" over the same
four `*AtAge` fields on ScenarioSummary.
*/
export const RETIREMENT_METRICS = [
  {
    key: "netWorthAtAge" as const,
    label: "Net worth",
    hint: "Everything added up: cash, investments, retirement accounts and home equity.",
  },
  {
    key: "retirementAtAge" as const,
    label: "Retirement accounts",
    hint: "The 401(k)s and IRAs on their own.",
  },
  {
    key: "investmentsAtAge" as const,
    label: "Investments",
    hint: "The taxable brokerage pot outside retirement — this is where buying early shows up most.",
  },
  {
    key: "homeEquityAtAge" as const,
    label: "Home equity",
    hint: "What the house is worth minus what is still owed on it.",
  },
];

export type RetirementMetricKey = (typeof RETIREMENT_METRICS)[number]["key"];

/**
Only ages the projection actually reaches, optionally floored (e.g. so a
chart can hide pre-retirement ages that would otherwise crowd it out).
*/
export function reachableMilestoneAges(
  milestoneAges: number[],
  summaries: ScenarioSummary[],
  metric: RetirementMetricKey,
  minAge = -Infinity,
): number[] {
  return milestoneAges.filter(
    (age) =>
      age >= minAge && summaries.some((s) => s[metric][age] !== undefined),
  );
}
