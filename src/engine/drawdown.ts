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
 * Tax on withdrawal is modeled as a single flat effective rate applied only to
 * money drawn from tax-deferred retirement accounts (liquid savings are drawn
 * first, untaxed, since that money was already taxed on the way in). What it
 * still deliberately does NOT model: tax brackets, filing status, state tax,
 * capital-gains treatment, Social Security or any other pension income,
 * required minimum distributions, healthcare cost shocks, or sequence-of-
 * returns risk. A single fixed return is a smooth fiction; real markets are
 * not. Treat the depletion age as a rough marker, not a date.
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
  Total withdrawn during the year, net of any tax paid.
  */
  withdrawal: number;
  /**
  Tax paid this year on retirement-account withdrawals.
  */
  taxPaid: number;
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
  /**
  Total tax paid on retirement-account withdrawals over the whole plan.
  */
  lifetimeTaxPaid: number;
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
  lifetimeTaxPaid: 0,
};

interface WithdrawalStep {
  liquidBalance: number;
  retirementBalance: number;
  homeEquityBalance: number;
  taken: number;
  taxPaid: number;
}

/**
Draw `need` out of the three pools in order: liquid savings first (already
taxed), then retirement accounts (grossed up so the after-tax amount covers
what's left), then home equity last (only nonzero when counted as spendable).
*/
function withdrawMonth(
  liquidBalance: number,
  retirementBalance: number,
  homeEquityBalance: number,
  need: number,
  taxRate: number,
): WithdrawalStep {
  const fromLiquid = Math.min(Math.max(liquidBalance, 0), need);
  let remaining = need - fromLiquid;

  let grossFromRetirement = 0;
  let netFromRetirement = 0;
  let taxPaid = 0;
  if (remaining > 0 && retirementBalance > 0) {
    const grossNeeded = remaining / (1 - taxRate);
    grossFromRetirement = Math.min(retirementBalance, grossNeeded);
    netFromRetirement = grossFromRetirement * (1 - taxRate);
    taxPaid = grossFromRetirement - netFromRetirement;
    remaining -= netFromRetirement;
  }

  const fromHome = remaining > 0 ? Math.min(homeEquityBalance, remaining) : 0;

  return {
    liquidBalance: liquidBalance - fromLiquid,
    retirementBalance: retirementBalance - grossFromRetirement,
    homeEquityBalance: homeEquityBalance - fromHome,
    taken: fromLiquid + netFromRetirement + fromHome,
    taxPaid,
  };
}

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
  // Only the tax-deferred share of the pot takes the haircut -- liquid
  // savings were already taxed on the way in.
  const taxableShare = portfolio > 0 ? retirementAccounts / portfolio : 0;
  const blendedTaxRate = drawdown.taxRateOnWithdrawal * taxableShare;
  const sustainableAnnualIncome =
    portfolio * drawdown.withdrawalRate * (1 - blendedTaxRate);
  const sustainableAnnualIncomeToday =
    sustainableAnnualIncome / inflationFactor;

  const desiredAnnualSpendAtRetirement =
    drawdown.desiredMonthlySpendToday * 12 * inflationFactor;
  const annualShortfall =
    desiredAnnualSpendAtRetirement - sustainableAnnualIncome;

  // --- The simulation view -------------------------------------------------
  const monthlyReturn = monthlyGeometric(drawdown.returnAnnual);
  const monthlyInflation = monthlyGeometric(drawdown.inflationAnnual);

  // Three pools, drawn in order: liquid savings (already taxed) first, then
  // retirement accounts (grossed up for tax), then home equity last (only
  // nonzero when `includeHomeEquity` is on).
  let liquidBalance = liquid;
  let retirementBalanceSim = retirementAccounts;
  let homeEquityBalance = drawdown.includeHomeEquity ? homeEquity : 0;
  let monthlySpend = desiredAnnualSpendAtRetirement / 12;
  let depletionAge: number | null = null;
  const track: DrawdownYear[] = [];

  const totalMonths = Math.max(
    0,
    Math.round((drawdown.planToAge - drawdown.retirementAge) * 12),
  );
  let yearWithdrawal = 0;
  let yearTaxPaid = 0;

  for (let index = 1; index <= totalMonths; index++) {
    // Growth first, then this month's spending comes out.
    liquidBalance *= 1 + monthlyReturn;
    retirementBalanceSim *= 1 + monthlyReturn;
    homeEquityBalance *= 1 + monthlyReturn;

    const totalBeforeSpend =
      liquidBalance + retirementBalanceSim + homeEquityBalance;
    const need = totalBeforeSpend > 0 ? monthlySpend : 0;
    const step = withdrawMonth(
      liquidBalance,
      retirementBalanceSim,
      homeEquityBalance,
      need,
      drawdown.taxRateOnWithdrawal,
    );
    liquidBalance = step.liquidBalance;
    retirementBalanceSim = step.retirementBalance;
    homeEquityBalance = step.homeEquityBalance;
    yearWithdrawal += step.taken;
    yearTaxPaid += step.taxPaid;

    if (
      depletionAge === null &&
      liquidBalance + retirementBalanceSim + homeEquityBalance <= 0
    ) {
      liquidBalance = 0;
      retirementBalanceSim = 0;
      homeEquityBalance = 0;
      depletionAge = drawdown.retirementAge + index / 12;
    }

    monthlySpend *= 1 + monthlyInflation;

    if (index % 12 === 0) {
      track.push({
        age: drawdown.retirementAge + index / 12,
        balance: Math.max(
          liquidBalance + retirementBalanceSim + homeEquityBalance,
          0,
        ),
        withdrawal: yearWithdrawal,
        taxPaid: yearTaxPaid,
      });
      yearWithdrawal = 0;
      yearTaxPaid = 0;
    }
  }

  const balance = liquidBalance + retirementBalanceSim + homeEquityBalance;
  const balanceAtPlanEnd = Math.max(balance, 0);
  const yearsOfIncome =
    (depletionAge === null ? drawdown.planToAge : depletionAge) -
    drawdown.retirementAge;
  const lifetimeTaxPaid = track.reduce((sum, year) => sum + year.taxPaid, 0);

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
    lifetimeTaxPaid,
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
