/**
 * The home purchase itself, the job-loss stress test, retirement drawdown,
 * and the top-level `Assumptions` bundle that ties every input domain
 * together.
 */
import type {
  ExpenseAssumptions,
  IncomeAssumptions,
  RetirementAssumptions,
  SavingsAssumptions,
} from "./income";
import type {
  CoResidentIncome,
  HouseholdAssumptions,
  SecondIncome,
  TimedObligation,
} from "./household";

/**
Terms of the home we're modelling buying.
*/
export interface HomePurchaseAssumptions {
  /**
  Today's price of the kind of house we want. Appreciates until we buy it.
  */
  targetPrice: number;
  /**
  Down payment as a decimal of purchase price. 0.2 = 20%.
  */
  downPaymentPct: number;
  /**
  Closing costs as a decimal of purchase price. 0.03 = 3%.
  */
  closingCostPct: number;
  /**
  Nominal annual mortgage rate, as a decimal. 0.065 = 6.5%.
  */
  mortgageRateAnnual: number;
  mortgageTermYears: number;
  /**
  Property tax + insurance + HOA, per month (the "TI" of PITI).
  */
  taxInsuranceHoaMonthly: number;
  /**
  Annual home appreciation, as a decimal. Applies before AND after purchase.
  */
  appreciationAnnual: number;
  /**
   * Yearly upkeep as a decimal of the home's current value. 0.01 = 1%/yr, the
   * common rule of thumb for maintenance and repairs.
   *
   * This is not a bill you get, which is exactly why it is easy to leave out of
   * a rent-vs-buy comparison and why leaving it out flatters buying.
   */
  maintenanceAnnualPct: number;
  /**
   * Private mortgage insurance, as a decimal of the ORIGINAL loan amount per
   * year. Charged while the loan-to-value ratio sits above `pmiRemovedAtLtv`,
   * so a 20% down payment never pays any.
   */
  pmiAnnualPct: number;
  /**
  Loan-to-value at which PMI drops off. Conventionally 0.8.
  */
  pmiRemovedAtLtv: number;
  /**
  Take down-payment assistance at all.
  */
  assistanceEnabled: boolean;
  /**
   * Down-payment assistance as a share of purchase price. K-FIT is 5% with no
   * dollar cap; Keystone Advantage is 4% capped at $6,000.
   */
  assistancePctOfPrice: number;
  /**
  Dollar cap on that assistance, or null for none.
  */
  assistanceMaxAmount: number | null;
  /**
   * How the assistance behaves afterwards.
   *
   *   forgiven  — a declining lien, written off over `assistanceTermYears`.
   *               Free money if you stay. K-FIT works this way.
   *   deferred  — a full lien until you sell or refinance. Helps cash flow but
   *               not net worth. K-DATE works this way.
   *   amortised — repaid monthly alongside the mortgage. Keystone Advantage.
   *   none      — no assistance.
   *
   * Modelled as a lien against equity rather than as a gift, because until it
   * is forgiven that is exactly what it is.
   */
  assistanceRepayment: "forgiven" | "deferred" | "amortised" | "none";
  /**
  Years over which forgiven or amortised assistance clears.
  */
  assistanceTermYears: number;
  /**
   * One-off mortgage insurance premium charged at closing, as a decimal of the
   * loan, when the down payment leaves you above the LTV threshold. Zero on a
   * conventional loan; FHA charges 1.75%. Added to the cash you need on the day.
   */
  pmiUpfrontPct: number;
}

/**
Parameters of a hypothetical job loss. Only applied when a scenario opts in.
*/
export interface JobLossAssumptions {
  /**
  Month the income disruption begins (1-based).
  */
  startMonth: number;
  /**
  How many months it lasts.
  */
  durationMonths: number;
  /**
  Share of normal take-home still coming in (severance/UI/spouse). 0.4 = 40%.
  */
  incomeReplacementPct: number;
  /**
  Share of normal expenses cut during the gap. 0.2 = spend 20% less.
  */
  expenseCutPct: number;
  /**
  If true, employee + employer retirement contributions stop during the gap.
  */
  pauseRetirementContributions: boolean;
}

/**
 * What happens after the paycheques stop.
 *
 * The accumulation model answers "how much will we have"; this answers the
 * question that actually matters -- "is it enough, and for how long".
 */
export interface DrawdownAssumptions {
  /**
  Age the primary person stops working.
  */
  retirementAge: number;
  /**
   * Safe withdrawal rate used for the headline "what income does this support"
   * figure. 0.04 is the classic 4% rule.
   */
  withdrawalRate: number;
  /**
  Desired total monthly spending in retirement, in TODAY's dollars.
  */
  desiredMonthlySpendToday: number;
  /**
  Expected annual return once retired. Usually lower than while working.
  */
  returnAnnual: number;
  /**
  Inflation applied to retirement spending.
  */
  inflationAnnual: number;
  /**
   * Count home equity as spendable. Off by default: you have to live
   * somewhere, so the house is not really part of the pot unless you plan to
   * downsize or borrow against it.
   */
  includeHomeEquity: boolean;
  /**
  Age to simulate to. Running out before this is the failure case.
  */
  planToAge: number;
  /**
   * Flat effective tax rate applied to withdrawals from tax-deferred
   * retirement accounts (401(k)/IRA). Withdrawals from the taxable liquid
   * pool (cash + brokerage) are not taxed here -- that money was already
   * taxed on the way in. A single flat rate: it does not model tax
   * brackets, filing status, state tax, or capital-gains treatment.
   */
  taxRateOnWithdrawal: number;
}

export interface Assumptions {
  household: HouseholdAssumptions;
  /**
  Fixed commitments with an end date. See TimedObligation.
  */
  obligations: TimedObligation[];
  /**
  A relative moving in, contingent on buying a house with room for them.
  */
  coResident: CoResidentIncome;
  /**
  A partner returning to work, with the costs that come with it.
  */
  secondIncome: SecondIncome;
  drawdown: DrawdownAssumptions;
  income: IncomeAssumptions;
  expenses: ExpenseAssumptions;
  retirement: RetirementAssumptions;
  savings: SavingsAssumptions;
  home: HomePurchaseAssumptions;
  jobLoss: JobLossAssumptions;
}
