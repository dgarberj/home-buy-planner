import type { Assumptions } from "../model/types";
import {
  computeAssistanceAmount,
  monthlyNominal,
  monthlyPayment,
  isPmiRequired,
} from "./finance";

/**
 * ============================================================================
 *  What can you actually afford, and where?
 * ============================================================================
 *
 * The tax table on its own is misleading, and dangerously so. The townships
 * with the lowest rates and the best schools are exactly the ones where houses
 * cost twice as much -- Radnor's rate is half of Darby's, and its median home
 * is five times the price. Ranking places by tax rate alone points you
 * confidently at somewhere you cannot buy.
 *
 * So this module works the other way round: start from what you can carry each
 * month, solve for the price that supports, and judge each town against its own
 * median rather than a hypothetical house that exists everywhere.
 *
 * Pure, and tested.
 */

export interface HousingBudget {
  /**
  Everything available for housing each month, all-in.
  */
  monthlyBudget: number;
  /**
  How that number was arrived at, for display.
  */
  breakdown: {
    income: number;
    coResident: number;
    /**
    Second income net of the costs of working. Can be negative.
    */
    secondIncome: number;
    livingCosts: number;
    obligations: number;
    retirementContributions: number;
    reserveForSavings: number;
  };
}

/**
 * What is genuinely available for housing each month, once everything else is
 * paid and a deliberate amount is held back for saving.
 *
 * Note this counts the co-resident's contribution, since it only exists once
 * you own -- and excludes rent, since that is what you are replacing.
 */
export function housingBudget(
  assumptions: Assumptions,
  options: { atMonth: number; reserveForSavings: number },
): HousingBudget {
  const { income, expenses, retirement, coResident, obligations } = assumptions;

  const obligationsDue = obligations
    .filter(
      (o) =>
        o.startMonth <= options.atMonth &&
        (o.endMonth === null || o.endMonth >= options.atMonth),
    )
    .reduce((sum, o) => sum + o.monthlyAmount, 0);

  const coResidentIncome = coResident.enabled ? coResident.monthlyAmount : 0;

  // A second earner counts only once they have actually started, and net of
  // the childcare that comes with it while that is still running.
  const second = assumptions.secondIncome;
  const secondRunning = second.enabled && options.atMonth >= second.startMonth;
  const isSecondCostsStillApplying =
    second.additionalCostsEndMonth === null ||
    options.atMonth <= second.additionalCostsEndMonth;
  const secondCosts = isSecondCostsStillApplying
    ? second.additionalCostsMonthly
    : 0;
  const secondNet = secondRunning ? second.monthlyTakeHome - secondCosts : 0;

  const livingCosts = expenses.fixedMonthly + expenses.variableMonthly;
  const retirementContributions = retirement.k401Monthly + retirement.hsaMonthly;

  const monthlyBudget =
    income.monthlyTakeHome +
    coResidentIncome +
    secondNet -
    livingCosts -
    obligationsDue -
    retirementContributions -
    options.reserveForSavings;

  return {
    monthlyBudget,
    breakdown: {
      income: income.monthlyTakeHome,
      coResident: coResidentIncome,
      secondIncome: secondNet,
      livingCosts,
      obligations: obligationsDue,
      retirementContributions,
      reserveForSavings: options.reserveForSavings,
    },
  };
}

/**
 * The most expensive house a given monthly budget supports.
 *
 * Every cost except insurance scales with the price, so this inverts:
 *
 *   budget = P x (loanShare x pmtPerDollar + effectiveTaxRate/12
 *                 + maintenance/12 + loanShare x pmiRate/12)
 *            + insurance
 *
 * PMI is included only when the deposit is small enough to trigger it, and
 * drops out of the arithmetic entirely at 20% down.
 */
export function maxAffordablePrice(
  assumptions: Assumptions,
  options: {
    monthlyBudget: number;
    /**
    Effective property tax as a share of market value, for this township.
    */
    effectiveTaxRate: number;
    /**
    Monthly homeowner's insurance, which does not scale with price.
    */
    insuranceMonthly: number;
  },
): number {
  const { home } = assumptions;
  const loanShare = 1 - home.downPaymentPct;
  const termMonths = Math.round(home.mortgageTermYears * 12);

  // Payment on a $1 loan, so the whole thing stays linear in price.
  const pmtPerDollar = monthlyPayment(
    1,
    monthlyNominal(home.mortgageRateAnnual),
    termMonths,
  );

  const pmiPerDollar = isPmiRequired(loanShare, home.pmiRemovedAtLtv)
    ? (loanShare * home.pmiAnnualPct) / 12
    : 0;

  const costPerDollarOfPrice =
    loanShare * pmtPerDollar +
    options.effectiveTaxRate / 12 +
    home.maintenanceAnnualPct / 12 +
    pmiPerDollar;

  if (costPerDollarOfPrice <= 0) return 0;

  const price =
    (options.monthlyBudget - options.insuranceMonthly) / costPerDollarOfPrice;
  return Math.max(0, price);
}

/**
All-in monthly cost of a specific house in a specific township.
*/
export function monthlyCostOfHouse(
  assumptions: Assumptions,
  options: {
    price: number;
    effectiveTaxRate: number;
    insuranceMonthly: number;
  },
): {
  principalAndInterest: number;
  tax: number;
  insurance: number;
  pmi: number;
  maintenance: number;
  total: number;
} {
  const { home } = assumptions;
  const loan = options.price * (1 - home.downPaymentPct);
  const termMonths = Math.round(home.mortgageTermYears * 12);
  const principalAndInterest = monthlyPayment(
    loan,
    monthlyNominal(home.mortgageRateAnnual),
    termMonths,
  );
  const pmi = isPmiRequired(1 - home.downPaymentPct, home.pmiRemovedAtLtv)
    ? (loan * home.pmiAnnualPct) / 12
    : 0;
  const tax = (options.price * options.effectiveTaxRate) / 12;
  const maintenance = (options.price * home.maintenanceAnnualPct) / 12;

  return {
    principalAndInterest,
    tax,
    insurance: options.insuranceMonthly,
    pmi,
    maintenance,
    total:
      principalAndInterest + tax + options.insuranceMonthly + pmi + maintenance,
  };
}

export type Reach = "comfortable" | "stretch" | "out-of-reach" | "unknown";

/**
 * How a town's typical house sits against what you can carry.
 * "Comfortable" leaves a tenth of the budget spare; "stretch" uses all of it.
 */
export function classifyReach(
  medianPrice: number | null | undefined,
  maxPrice: number,
): Reach {
  if (medianPrice === null || medianPrice === undefined) return "unknown";
  if (medianPrice <= maxPrice * 0.9) return "comfortable";
  if (medianPrice <= maxPrice) return "stretch";
  return "out-of-reach";
}

/**
 * Cash needed at closing for a given price, net of any down-payment assistance.
 *
 * Assistance is money you do not have to bring on the day. It is still a lien
 * against your equity until forgiven — that part is handled in the projection —
 * but it does not change what you need in the bank at settlement.
 */
export function cashToClose(assumptions: Assumptions, price: number): number {
  const { home } = assumptions;
  const loanShare = 1 - home.downPaymentPct;
  const upfrontPmi = isPmiRequired(loanShare, home.pmiRemovedAtLtv)
    ? loanShare * home.pmiUpfrontPct
    : 0;
  const gross =
    price * (home.downPaymentPct + home.closingCostPct + upfrontPmi);

  const assistance = computeAssistanceAmount(price, home);

  return Math.max(0, gross - assistance);
}

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
    const price = options.medianPriceToday * Math.pow(1 + appreciation, m - 1);

    // The budget grows with pay and steps up as commitments end.
    const grown: Assumptions = {
      ...assumptions,
      income: {
        ...assumptions.income,
        monthlyTakeHome:
          assumptions.income.monthlyTakeHome *
          Math.pow(1 + incomeGrowth, m - 1),
      },
    };
    const budget = housingBudget(grown, {
      atMonth: m,
      reserveForSavings: options.reserveForSavings,
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
