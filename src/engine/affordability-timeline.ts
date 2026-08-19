import type { Assumptions } from "../model/types";
import { SEED_SETTINGS } from "../data/seed";
import {
  cashToClose,
  housingBudget,
  maxAffordablePrice,
  monthlyCostOfHouse,
} from "./affordability";

// ===========================================================================
//  Is it worth waiting?
// ===========================================================================

/**
 * Waiting to buy improves two entirely different things, at entirely different
 * speeds, and confusing them is how people end up saving for a house they will
 * never be able to carry.
 *
 *  - The CASH constraint (deposit + closing + a buffer) improves every month
 *    you save. This is the one people picture.
 *  - The MONTHLY constraint (can you carry the payment?) barely moves with
 *    saving at all. It improves only when your income rises or a commitment
 *    ends -- and it gets worse every month that house prices rise.
 *
 * So the honest question is not "how long until I have enough saved", it is
 * "does the gap ever close". When house appreciation runs at or above income
 * growth, the monthly gap never closes by waiting: you run to stand still, and
 * only the step-changes -- a loan ending, a second income starting -- actually
 * move it.
 */
export interface AffordabilityPoint {
  month: number;
  /**
  What the house costs by then, having appreciated.
  */
  price: number;
  /**
  The dearest house the budget carries that month.
  */
  maxPrice: number;
  monthlyBudget: number;
  /**
  Liquid savings available, from a projection where you never buy.
  */
  cashAvailable: number;
  /**
  Deposit + closing costs + the buffer you want left afterwards.
  */
  cashNeeded: number;
  /**
  Positive means the monthly payment is out of reach by this much.
  */
  monthlyGap: number;
  /**
  Positive means you are short of cash by this much.
  */
  cashGap: number;
  affordable: boolean;
  binding: "monthly payment" | "cash" | "both" | "none";
}

export interface WaitingVerdict {
  town: string;
  /**
  First month both constraints are satisfied, or null if never.
  */
  affordableFrom: number | null;
  /**
  Which constraint is holding you back at the start.
  */
  bindingToday: AffordabilityPoint["binding"];
  /**
  Is the monthly gap shrinking, widening, or static?
  */
  monthlyGapTrend: "closing" | "widening" | "static";
  /**
  Months until the monthly gap closes on its own, if it ever does.
  */
  monthlyGapClosesAt: number | null;
  /**
  Months until the cash is there, ignoring the monthly constraint.
  */
  cashReadyAt: number | null;
  timeline: AffordabilityPoint[];
}

function bindingConstraint(
  isMonthlyOk: boolean,
  isCashOk: boolean,
): AffordabilityPoint["binding"] {
  if (isMonthlyOk && isCashOk) return "none";
  if (!isMonthlyOk && !isCashOk) return "both";
  return isMonthlyOk ? "cash" : "monthly payment";
}

/**
 * Walk forward and ask, month by month, whether this town is within reach.
 *
 * @param cashTrack liquid savings by month from a scenario that never buys.
 */
export function affordabilityTimeline(
  assumptions: Assumptions,
  options: {
    medianPriceToday: number;
    effectiveTaxRate: number;
    insuranceMonthly: number;
    months: number;
    reserveForSavings: number;
    /**
     * Base salary before bonus. Grows with income like `monthlyTakeHome`
     * below. Optional, same default as `housingBudget`.
     */
    grossAnnualSalary?: number;
    /**
    Liquid savings per month if you carry on renting.
    */
    cashTrack: number[];
    /**
    Months of outgoings you want left in the bank after closing.
    */
    bufferMonthsRequired: number;
  },
): AffordabilityPoint[] {
  const appreciation =
    Math.pow(1 + assumptions.home.appreciationAnnual, 1 / 12) - 1;
  const incomeGrowth =
    Math.pow(1 + assumptions.income.growthAnnual, 1 / 12) - 1;

  const points: AffordabilityPoint[] = [];

  for (let m = 1; m <= options.months; m++) {
    const incomeGrowthFactor = Math.pow(1 + incomeGrowth, m - 1);
    const price = options.medianPriceToday * Math.pow(1 + appreciation, m - 1);

    // The budget grows with pay and steps up as commitments end.
    const grown: Assumptions = {
      ...assumptions,
      income: {
        ...assumptions.income,
        monthlyTakeHome:
          assumptions.income.monthlyTakeHome * incomeGrowthFactor,
      },
    };
    const grownGrossAnnualSalary =
      (options.grossAnnualSalary ?? SEED_SETTINGS.grossAnnualSalary) *
      incomeGrowthFactor;
    const budget = housingBudget(grown, {
      atMonth: m,
      reserveForSavings: options.reserveForSavings,
      grossAnnualSalary: grownGrossAnnualSalary,
    });
    const maxPrice = maxAffordablePrice(grown, {
      monthlyBudget: budget.monthlyBudget,
      effectiveTaxRate: options.effectiveTaxRate,
      insuranceMonthly: options.insuranceMonthly,
    });

    const cost = monthlyCostOfHouse(grown, {
      price,
      effectiveTaxRate: options.effectiveTaxRate,
      insuranceMonthly: options.insuranceMonthly,
    });
    const bufferNeeded =
      options.bufferMonthsRequired *
      (assumptions.expenses.fixedMonthly +
        assumptions.expenses.variableMonthly +
        cost.total);

    const cashAvailable = options.cashTrack[m - 1] ?? 0;
    const cashNeeded = cashToClose(assumptions, price) + bufferNeeded;

    const monthlyGap = price - maxPrice;
    const cashGap = cashNeeded - cashAvailable;
    const isMonthlyOk = monthlyGap <= 0;
    const isCashOk = cashGap <= 0;

    points.push({
      month: m,
      price,
      maxPrice,
      monthlyBudget: budget.monthlyBudget,
      cashAvailable,
      cashNeeded,
      monthlyGap,
      cashGap,
      affordable: isMonthlyOk && isCashOk,
      binding: bindingConstraint(isMonthlyOk, isCashOk),
    });
  }

  return points;
}

/**
Summarise a timeline into the answer to "should we wait?".
*/
export function waitingVerdict(
  town: string,
  timeline: AffordabilityPoint[],
): WaitingVerdict {
  const first = timeline[0];
  const affordable = timeline.find((p) => p.affordable);
  const monthlyCloses = timeline.find((p) => p.monthlyGap <= 0);
  const cashReady = timeline.find((p) => p.cashGap <= 0);

  const last = timeline.at(-1);
  let trend: WaitingVerdict["monthlyGapTrend"] = "static";
  if (first && last) {
    const change = last.monthlyGap - first.monthlyGap;
    // A dollar either way over years is noise; call anything smaller static.
    if (change < -1_000) trend = "closing";
    else if (change > 1_000) trend = "widening";
  }

  return {
    town,
    affordableFrom: affordable?.month ?? null,
    bindingToday: first?.binding ?? "none",
    monthlyGapTrend: trend,
    monthlyGapClosesAt: monthlyCloses?.month ?? null,
    cashReadyAt: cashReady?.month ?? null,
    timeline,
  };
}
