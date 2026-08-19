/**
 * Budget line items, point-in-time balance snapshots, and the per-scenario
 * "what if" configuration run through the projection engine.
 */
import type { JobLossAssumptions } from "./home";

/**
A single recurring line item in the budget.
*/
export interface BudgetItem {
  id: string;
  label: string;
  category: string;
  type: "income" | "fixed" | "variable";
  /**
  Monthly amount, always positive. `type` carries the sign.
  */
  amount: number;
  /**
  Rent is tracked separately: it is replaced by the mortgage at the buy month.
  */
  isRent?: boolean;
  /**
   * Optional start/end months, as "YYYY-MM". Giving an item either of these
   * turns it into a TimedObligation: it stops inflating, stops being cut during
   * a job loss, and ends on the date you set.
   */
  startsOn?: string;
  endsOn?: string;
}

/**
A point-in-time record of what we actually have. Updated monthly/quarterly.
*/
export interface BalanceSnapshot {
  id: string;
  /**
  ISO date, e.g. "2026-08-01".
  */
  date: string;
  checking: number;
  savings: number;
  investments: number;
  retirement: number;
  /**
  Total outstanding debt (student loans, cars, cards).
  */
  debt: number;
  note?: string;
}

/**
One "what if" to run through the engine.
*/
export interface ScenarioConfig {
  id: string;
  name: string;
  /**
  Month we buy (1-based), or null to model never buying.
  */
  buyMonth: number | null;
  hasJobLoss: boolean;
  /**
  Per-scenario overrides of the shared job-loss assumptions.
  */
  jobLossOverride?: Partial<JobLossAssumptions>;
  /**
  Shown/hidden on the dashboard without deleting the scenario.
  */
  enabled: boolean;
  /**
  Line colour on the chart.
  */
  color: string;
}
