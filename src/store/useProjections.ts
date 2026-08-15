import { useMemo } from "react";
import type { Assumptions, ScenarioSummary } from "../model/types";
import { resolveAssumptions } from "../lib/derive";
import { runAllScenarios } from "../engine/projection";
import { useStore } from "./useStore";

/**
 * The single place the UI meets the engine.
 *
 * Everything downstream reads from here, so the whole app always shows one
 * consistent set of numbers, and the engine stays free of React.
 */
export function useProjections(): {
  assumptions: Assumptions;
  summaries: ScenarioSummary[];
} {
  const assumptionsInput = useStore((s) => s.assumptions);
  const budget = useStore((s) => s.budget);
  const balances = useStore((s) => s.balances);
  const scenarios = useStore((s) => s.scenarios);
  const settings = useStore((s) => s.settings);

  // Assumptions always derive income/expenses/rent from Budget and starting
  // balances from Balances -- not a user choice (see AssumptionsPanel's
  // static note, not a toggle).
  const assumptions = useMemo(
    () =>
      resolveAssumptions(assumptionsInput, budget, balances, {
        useBudgetTotals: true,
        useLatestBalances: true,
        startDate: settings.startDate,
      }),
    [assumptionsInput, budget, balances, settings.startDate],
  );

  const summaries = useMemo(
    () =>
      runAllScenarios(
        assumptions,
        scenarios,
        settings.horizonMonths,
        settings.milestoneAges,
      ),
    [assumptions, scenarios, settings.horizonMonths, settings.milestoneAges],
  );

  return { assumptions, summaries };
}
