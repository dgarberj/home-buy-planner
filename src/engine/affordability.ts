import type { Assumptions } from "../model/types";
import { SEED_SETTINGS } from "../data/seed";
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
  options: {
    atMonth: number;
    reserveForSavings: number;
    /**
     * Base salary before bonus -- lives in `Settings`, not `Assumptions`.
     * Drives the 401(k) contribution, stored as a share of it
     * (`retirement.k401Pct`). Defaults to the seed household's salary so
     * callers that don't care about it (most tests) don't need to pass one.
     */
    grossAnnualSalary?: number;
  },
): HousingBudget {
  const grossAnnualSalary =
    options.grossAnnualSalary ?? SEED_SETTINGS.grossAnnualSalary;
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
  const k401Monthly = (retirement.k401Pct * grossAnnualSalary) / 12;
  const retirementContributions =
    k401Monthly + retirement.hsaMonthly + retirement.iraMonthly;

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
