import type {
  Assumptions,
  DrawdownAssumptions,
  MonthlyResult,
} from "../model/types";
import { monthlyGeometric } from "./finance";
import { monthForAge } from "./projection";

/**
 * ============================================================================
 *  What happens after the paycheques stop.
 * ============================================================================
 *
 * The accumulation model answers "how much will we have at 65". On its own that
 * number is close to meaningless -- $4m sounds like a lot until you notice it
 * has to cover thirty years of inflating expenses.
 *
 * This module answers the two questions that actually matter, from opposite
 * directions:
 *
 *   1. Given the pot, what income does it safely support? (the withdrawal-rate
 *      view -- the classic 4% rule)
 *   2. Given what we want to spend, when does the money run out? (the
 *      simulation view)
 *
 * They disagree often, and the gap between them is the interesting part.
 *
 * Like the projection engine, this is pure: no React, no state, no randomness.
 *
 * What it deliberately does NOT model: taxes on withdrawal (which differ by
 * account type), Social Security or any other pension income, required minimum
 * distributions, healthcare cost shocks, or sequence-of-returns risk. A single
 * fixed return is a smooth fiction; real markets are not. Treat the depletion
 * age as a rough marker, not a date.
 */

/**
One year of the drawdown, for charting.
*/
export interface DrawdownYear {
  age: number;
  /**
  Balance at the end of this year.
  */
  balance: number;
  /**
  Total withdrawn during the year.
  */
  withdrawal: number;
}

export interface DrawdownResult {
  /**
  Projection month the primary person retires, or null if outside the horizon.
  */
  retirementMonth: number | null;
  /**
  Everything spendable at retirement.
  */
  portfolioAtRetirement: number;
  /**
  Retirement accounts alone, for context.
  */
  retirementAccountsAtRetirement: number;
  /**
  Taxable investments + cash, for context.
  */
  liquidAtRetirement: number;
  /**
  Home equity, included in the pot only if the assumptions say so.
  */
  homeEquityAtRetirement: number;

  /**
  Annual income the pot supports at the withdrawal rate, in retirement-year dollars.
  */
  sustainableAnnualIncome: number;
  /**
  The same figure translated back into today's money, which is easier to judge.
  */
  sustainableAnnualIncomeToday: number;

  /**
  Desired spending, inflated from today to the retirement year.
  */
  desiredAnnualSpendAtRetirement: number;
  /**
  Desired minus sustainable. Positive means a shortfall.
  */
  annualShortfall: number;
  /**
  True when the pot supports the desired spending at the chosen withdrawal rate.
  */
  meetsTargetAtWithdrawalRate: boolean;

  /**
  Age the money runs out, or null if it lasts to `planToAge`.
  */
  depletionAge: number | null;
  /**
  What is left at `planToAge`. Zero if it ran out first.
  */
  balanceAtPlanEnd: number;
  /**
  How many years the money lasts from retirement.
  */
  yearsOfIncome: number;
  /**
  Yearly track of the drawdown, for the chart.
  */
  track: DrawdownYear[];
}

const EMPTY: DrawdownResult = {
  retirementMonth: null,
  portfolioAtRetirement: 0,
  retirementAccountsAtRetirement: 0,
  liquidAtRetirement: 0,
  homeEquityAtRetirement: 0,
  sustainableAnnualIncome: 0,
  sustainableAnnualIncomeToday: 0,
  desiredAnnualSpendAtRetirement: 0,
  annualShortfall: 0,
  meetsTargetAtWithdrawalRate: false,
  depletionAge: null,
  balanceAtPlanEnd: 0,
  yearsOfIncome: 0,
  track: [],
};

/**
 * Work out what the accumulated pot actually supports.
 *
 * @param months  the accumulation projection for one scenario
 * @param assumptions the household model (for ages and the horizon)
 * @param drawdown how retirement is expected to go
 */
export function runDrawdown(
  months: MonthlyResult[],
  assumptions: Assumptions,
  drawdown: DrawdownAssumptions = assumptions.drawdown,
): DrawdownResult {
  const retirementMonth = monthForAge(
    assumptions,
    drawdown.retirementAge,
    months.length,
  );
  if (retirementMonth === null) return { ...EMPTY, track: [] };

  const row = months[retirementMonth - 1];
  if (!row) return { ...EMPTY, track: [] };

  // --- What's in the pot on day one of retirement -------------------------
  const retirementAccounts = row.retirementBalance;
  const liquid = row.liquidSavings;
  const homeEquity = row.homeEquity;
  const portfolio =
    retirementAccounts + liquid + (drawdown.includeHomeEquity ? homeEquity : 0);

  // --- The withdrawal-rate view -------------------------------------------
  const yearsToRetirement = (retirementMonth - 1) / 12;
  const inflationFactor = Math.pow(
    1 + drawdown.inflationAnnual,
    yearsToRetirement,
  );
  const sustainableAnnualIncome = portfolio * drawdown.withdrawalRate;
  const sustainableAnnualIncomeToday =
    sustainableAnnualIncome / inflationFactor;

  const desiredAnnualSpendAtRetirement =
    drawdown.desiredMonthlySpendToday * 12 * inflationFactor;
  const annualShortfall =
    desiredAnnualSpendAtRetirement - sustainableAnnualIncome;

  // --- The simulation view -------------------------------------------------
  const monthlyReturn = monthlyGeometric(drawdown.returnAnnual);
  const monthlyInflation = monthlyGeometric(drawdown.inflationAnnual);

  let balance = portfolio;
  let monthlySpend = desiredAnnualSpendAtRetirement / 12;
  let depletionAge: number | null = null;
  const track: DrawdownYear[] = [];

  const totalMonths = Math.max(
    0,
    Math.round((drawdown.planToAge - drawdown.retirementAge) * 12),
  );
  let yearWithdrawal = 0;

  for (let index = 1; index <= totalMonths; index++) {
    // Growth first, then this month's spending comes out.
    balance *= 1 + monthlyReturn;
    const taken = Math.min(
      balance > 0 ? monthlySpend : 0,
      Math.max(balance, 0),
    );
    balance -= monthlySpend;
    yearWithdrawal += taken;

    if (depletionAge === null && balance <= 0) {
      balance = 0;
      depletionAge = drawdown.retirementAge + index / 12;
    }

    monthlySpend *= 1 + monthlyInflation;

    if (index % 12 === 0) {
      track.push({
        age: drawdown.retirementAge + index / 12,
        balance: Math.max(balance, 0),
        withdrawal: yearWithdrawal,
      });
      yearWithdrawal = 0;
    }
  }

  const balanceAtPlanEnd = Math.max(balance, 0);
  const yearsOfIncome =
    (depletionAge === null ? drawdown.planToAge : depletionAge) -
    drawdown.retirementAge;

  return {
    retirementMonth,
    portfolioAtRetirement: portfolio,
    retirementAccountsAtRetirement: retirementAccounts,
    liquidAtRetirement: liquid,
    homeEquityAtRetirement: homeEquity,
    sustainableAnnualIncome,
    sustainableAnnualIncomeToday,
    desiredAnnualSpendAtRetirement,
    annualShortfall,
    meetsTargetAtWithdrawalRate: annualShortfall <= 0,
    depletionAge,
    balanceAtPlanEnd,
    yearsOfIncome,
    track,
  };
}

/**
 * The pot you would need at retirement to support the desired spending at the
 * chosen withdrawal rate. Useful as a target to aim at rather than a verdict.
 */
export function requiredPortfolio(
  assumptions: Assumptions,
  drawdown: DrawdownAssumptions = assumptions.drawdown,
  yearsToRetirement: number,
): number {
  if (drawdown.withdrawalRate <= 0) return Infinity;
  const inflationFactor = Math.pow(
    1 + drawdown.inflationAnnual,
    yearsToRetirement,
  );
  return (
    (drawdown.desiredMonthlySpendToday * 12 * inflationFactor) /
    drawdown.withdrawalRate
  );
}
