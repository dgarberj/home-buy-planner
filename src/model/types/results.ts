/**
 * Output of the projection engine: one row per month, plus the headline
 * summary derived from a full run.
 */

/**
One month of output from the projection engine.
*/
export interface MonthlyResult {
  /**
  1-based month index.
  */
  month: number;
  /**
  1-based year index, i.e. months 1-12 are year 1.
  */
  year: number;
  /**
  All employment income this month, after any job-loss reduction.
  */
  netIncome: number;
  /**
  The bonus slice of `netIncome`. Zero in the eleven months it does not land.
  */
  bonusIncome: number;
  /**
   * A co-resident's contribution this month. Kept separate from `netIncome`
   * because it survives a job loss, which is most of the reason it matters.
   */
  coResidentIncome: number;
  /**
  A partner's take-home this month, before the costs of working.
  */
  secondIncome: number;
  /**
   * Childcare and other costs of that second job, NET of the Dependent Care
   * FSA tax saving.
   */
  secondIncomeCosts: number;
  /**
  Tax saved this month by paying childcare through a Dependent Care FSA.
  */
  dependentCareTaxSaving: number;
  /**
  Medical paid from the HSA this month instead of out of cash.
  */
  hsaMedicalPaid: number;
  /**
  One-off HSA reimbursement landing in cash this month.
  */
  hsaReimbursed: number;
  /**
  Fixed + variable living costs, after inflation and any job-loss cut.
  */
  totalExpenses: number;
  /**
   * The housing cheque you actually write: rent before the buy month, then
   * principal & interest + tax/insurance/HOA + PMI from the buy month onward.
   */
  housingPayment: number;
  /**
  The PMI slice of `housingPayment`. Already included in it -- do not add twice.
  */
  pmiPayment: number;
  /**
   * Upkeep accrued this month (0 while renting). Kept separate from
   * `housingPayment` because it is a running cost rather than a monthly bill,
   * but it is subtracted from cash flow just the same.
   */
  homeMaintenance: number;
  /**
  True while this month falls inside the scenario's job-loss window.
  */
  jobLossActive: boolean;
  /**
  True from the buy month onward.
  */
  ownsHome: boolean;
  /**
  What you put into retirement this month, out of your own pay.
  */
  employeeContribution: number;
  /**
  What your employer put in this month: regular match plus any annual lump.
  */
  employerContribution: number;
  /**
  Fixed commitments due this month (see TimedObligation).
  */
  obligations: number;
  /**
  all income - expenses - obligations - housing - maintenance - retirement contribution.
  */
  netCashFlow: number;
  /**
  The near-term cash buffer. Goes NEGATIVE if the plan runs dry -- the risk signal.
  */
  cashBalance: number;
  /**
  The invested pool. Sold off before cash is allowed to go negative.
  */
  investmentBalance: number;
  /**
  cashBalance + investmentBalance. What you could actually put your hands on.
  */
  liquidSavings: number;
  /**
  Age of the primary person this month.
  */
  age: number;
  retirementBalance: number;
  /**
  Market value of the home (0 before purchase).
  */
  homeValue: number;
  /**
  Outstanding mortgage principal (0 before purchase).
  */
  mortgageBalance: number;
  /**
  homeValue - mortgageBalance (0 before purchase).
  */
  homeEquity: number;
  /**
  liquidSavings + retirementBalance + homeEquity.
  */
  netWorth: number;
  /**
  One-time cash out the door this month (down payment + closing costs, less assistance).
  */
  purchaseOutflow: number;
  /**
  Down-payment assistance received at closing.
  */
  assistanceReceived: number;
  /**
  What is still owed on that assistance -- a lien against your equity.
  */
  assistanceOutstanding: number;
}

/**
Headline numbers for the dashboard, derived from a MonthlyResult[].
*/
export interface ScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  color: string;
  months: MonthlyResult[];
  /**
   * First month our liquid savings would cover the down payment + closing costs
   * on the (appreciating) target house, if we had not yet bought. null = not on
   * track within the horizon.
   */
  readinessMonth: number | null;
  /**
  Cash required at `readinessMonth`, or at the end of the horizon if never ready.
  */
  readinessCashRequired: number;
  /**
  Did we actually have the cash on hand in the month we bought?
  */
  fundedAtPurchase: boolean;
  /**
  Lowest liquid savings balance across the horizon -- the buffer risk indicator.
  */
  minCashBuffer: number;
  /**
  Month in which `minCashBuffer` occurs.
  */
  minCashBufferMonth: number;
  /**
  True if liquid savings ever goes below zero.
  */
  goesNegative: boolean;
  /**
  Net worth at months 12 / 36 / 60 (or as far as the horizon reaches).
  */
  netWorthAtYear: Record<number, number>;
  /**
  Net worth at each requested milestone age that falls inside the horizon.
  */
  netWorthAtAge: Record<number, number>;
  /**
  Retirement balance at each milestone age.
  */
  retirementAtAge: Record<number, number>;
  /**
  Home equity at each milestone age.
  */
  homeEquityAtAge: Record<number, number>;
  /**
  Invested (non-retirement) balance at each milestone age.
  */
  investmentsAtAge: Record<number, number>;
  /**
  Month the mortgage is fully repaid, if that happens inside the horizon.
  */
  mortgagePaidOffMonth: number | null;
  /**
  Total mortgage interest paid across the horizon.
  */
  totalInterestPaid: number;
  /**
  Total housing outlay across the horizon: rent before the buy, PITI + PMI after.
  */
  totalHousingPaid: number;
  /**
  Total upkeep accrued across the horizon.
  */
  totalMaintenancePaid: number;
  /**
  Total PMI paid across the horizon, monthly premiums only.
  */
  totalPmiPaid: number;
  /**
  Total fixed obligations paid across the horizon.
  */
  totalObligationsPaid: number;
  /**
  Down-payment assistance received at closing, if any.
  */
  assistanceReceived: number;
  /**
  Total co-resident contribution received across the horizon.
  */
  totalCoResidentIncome: number;
  /**
  Total second income received, before its costs.
  */
  totalSecondIncome: number;
  /**
  Total childcare and other costs of that second job.
  */
  totalSecondIncomeCosts: number;
  /**
  Month PMI falls away, if it was ever charged and the LTV clears in time.
  */
  pmiEndsMonth: number | null;
  endingNetWorth: number;
}
