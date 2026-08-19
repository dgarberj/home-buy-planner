import type {
  Assumptions,
  MonthlyResult,
  ScenarioConfig,
} from "../../model/types";
import { monthlyNominal } from "../finance";
import { cashRequiredToBuy, monthForAge } from "../projection";

/**
 * ============================================================================
 *  Helpers used only by `summarizeScenario`.
 * ============================================================================
 *
 * Split out of `projection.ts` purely to keep that file a manageable size --
 * module-private, nothing outside the engine should need these directly.
 */

/**
The first month a shadow "never buy" run has saved enough to afford the
house, and what that would cost by then.
*/
export function computeReadiness(
  assumptions: Assumptions,
  neverBuy: MonthlyResult[],
  months: number,
): { readinessMonth: number | null; readinessCashRequired: number } {
  let readinessMonth: number | null = null;
  for (const row of neverBuy) {
    if (row.liquidSavings >= cashRequiredToBuy(assumptions, row.month)) {
      readinessMonth = row.month;
      break;
    }
  }
  return {
    readinessMonth,
    readinessCashRequired: cashRequiredToBuy(
      assumptions,
      readinessMonth ?? months,
    ),
  };
}

/**
Did the cash actually clear on the month we bought?
*/
export function wasFundedAtPurchase(
  scenario: ScenarioConfig,
  monthsResult: MonthlyResult[],
): boolean {
  if (scenario.buyMonth === null) return true;
  const buyRow = monthsResult[scenario.buyMonth - 1];
  return buyRow !== undefined && buyRow.liquidSavings >= 0;
}

/**
The lowest liquid-savings point the plan ever hits, and when.
*/
export function computeMinCashBuffer(monthsResult: MonthlyResult[]): {
  minCashBuffer: number;
  minCashBufferMonth: number;
} {
  let minCashBuffer = Infinity;
  let minCashBufferMonth = 0;
  for (const row of monthsResult) {
    if (row.liquidSavings >= minCashBuffer) continue;
    minCashBuffer = row.liquidSavings;
    minCashBufferMonth = row.month;
  }
  if (!Number.isFinite(minCashBuffer)) {
    return { minCashBuffer: 0, minCashBufferMonth: 0 };
  }
  return { minCashBuffer, minCashBufferMonth };
}

export function computeNetWorthAtYear(
  monthsResult: MonthlyResult[],
): Record<number, number> {
  const netWorthAtYear: Record<number, number> = {};
  for (const year of [1, 3, 5]) {
    const row = monthsResult[year * 12 - 1];
    if (row) netWorthAtYear[year] = row.netWorth;
  }
  return netWorthAtYear;
}

/**
Where things stand at each retirement milestone age.
*/
export function computeMilestones(
  assumptions: Assumptions,
  monthsResult: MonthlyResult[],
  months: number,
  milestoneAges: number[],
): {
  netWorthAtAge: Record<number, number>;
  retirementAtAge: Record<number, number>;
  homeEquityAtAge: Record<number, number>;
  investmentsAtAge: Record<number, number>;
} {
  const netWorthAtAge: Record<number, number> = {};
  const retirementAtAge: Record<number, number> = {};
  const homeEquityAtAge: Record<number, number> = {};
  const investmentsAtAge: Record<number, number> = {};
  for (const age of milestoneAges) {
    const m = monthForAge(assumptions, age, months);
    if (m === null) continue;
    const row = monthsResult[m - 1];
    if (!row) continue;
    netWorthAtAge[age] = row.netWorth;
    retirementAtAge[age] = row.retirementBalance;
    homeEquityAtAge[age] = row.homeEquity;
    investmentsAtAge[age] = row.investmentBalance;
  }
  return { netWorthAtAge, retirementAtAge, homeEquityAtAge, investmentsAtAge };
}

export interface MortgageLifeStats {
  mortgagePaidOffMonth: number | null;
  totalInterestPaid: number;
  totalHousingPaid: number;
  totalMaintenancePaid: number;
  totalPmiPaid: number;
  totalObligationsPaid: number;
  assistanceReceived: number;
  totalCoResidentIncome: number;
  totalSecondIncome: number;
  totalSecondIncomeCosts: number;
  pmiEndsMonth: number | null;
}

/**
Payoff month, interest paid, and running totals across the plan's life.
*/
export function computeMortgageLifeStats(
  assumptions: Assumptions,
  monthsResult: MonthlyResult[],
): MortgageLifeStats {
  const stats: MortgageLifeStats = {
    mortgagePaidOffMonth: null,
    totalInterestPaid: 0,
    totalHousingPaid: 0,
    totalMaintenancePaid: 0,
    totalPmiPaid: 0,
    totalObligationsPaid: 0,
    assistanceReceived: 0,
    totalCoResidentIncome: 0,
    totalSecondIncome: 0,
    totalSecondIncomeCosts: 0,
    pmiEndsMonth: null,
  };
  let isEverPaidPmi = false;
  let previousBalance = 0;
  const loanShare = 1 - assumptions.home.downPaymentPct;
  const mortgageMonthlyRate = monthlyNominal(
    assumptions.home.mortgageRateAnnual,
  );

  for (const row of monthsResult) {
    stats.totalHousingPaid += row.housingPayment;
    stats.totalMaintenancePaid += row.homeMaintenance;
    stats.totalPmiPaid += row.pmiPayment;
    stats.totalObligationsPaid += row.obligations;
    stats.assistanceReceived += row.assistanceReceived;
    stats.totalCoResidentIncome += row.coResidentIncome;
    stats.totalSecondIncome += row.secondIncome;
    stats.totalSecondIncomeCosts += row.secondIncomeCosts;
    if (row.pmiPayment > 0) isEverPaidPmi = true;
    else if (isEverPaidPmi && stats.pmiEndsMonth === null && row.ownsHome)
      stats.pmiEndsMonth = row.month;
    if (!row.ownsHome) continue;

    // On the purchase month the opening balance is the original loan; after
    // that it is simply last month's closing balance.
    const opening =
      row.purchaseOutflow > 0 ? row.homeValue * loanShare : previousBalance;
    stats.totalInterestPaid += opening * mortgageMonthlyRate;
    previousBalance = row.mortgageBalance;
    if (
      stats.mortgagePaidOffMonth === null &&
      row.mortgageBalance === 0 &&
      opening > 0
    ) {
      stats.mortgagePaidOffMonth = row.month;
    }
  }

  return stats;
}
