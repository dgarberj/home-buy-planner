/**
 * Domain types for the household financial model.
 *
 * Rate conventions (important, and tested):
 *  - All `*Annual` growth/return/inflation/appreciation rates are DECIMALS (0.04 = 4%)
 *    and are converted to monthly geometrically: (1 + annual)^(1/12) - 1.
 *  - `mortgageRateAnnual` is the only exception: it follows the US lending convention
 *    of a nominal annual rate divided by 12, so the payment matches a real quote.
 *  - Month numbering starts at 1. Month 1 is "this month" (no growth applied yet).
 */

/**
Income assumptions.
*/
export interface IncomeAssumptions {
  /**
   * Take-home from regular paycheques only, per month, today. A bonus paid as
   * an annual lump belongs in `annualBonusNet`, not smeared in here -- smearing
   * it hides the eleven months where the money is not actually available.
   */
  monthlyTakeHome: number;
  /**
  Expected annual raise, as a decimal. 0.03 = 3%/yr.
  */
  growthAnnual: number;
  /**
  Bonus, net of withholding, landing as a lump once a year. 0 for none.
  */
  annualBonusNet: number;
  /**
  Calendar month the bonus lands. 1 = January.
  */
  annualBonusMonth: number;
  /**
   * Calendar month the projection starts, 1-12. Needed so the engine can work
   * out which projection months are Januaries. Filled in from the start date.
   */
  calendarStartMonth: number;
}

/**
Expense assumptions. Housing is handled separately (rent -> PITI).
*/
export interface ExpenseAssumptions {
  /**
  Non-housing fixed costs per month (insurance, subscriptions, loan payments...).
  */
  fixedMonthly: number;
  /**
  Variable costs per month (groceries, dining, travel...).
  */
  variableMonthly: number;
  /**
  Annual inflation applied to expenses and rent, as a decimal.
  */
  inflationAnnual: number;
  /**
  Current rent, per month. Replaced by PITI at the buy month.
  */
  currentRentMonthly: number;
}

/**
Retirement account assumptions.
*/
export interface RetirementAssumptions {
  currentBalance: number;
  /**
   * What YOU put into your 401(k) each month, out of your own pay. Deducted
   * from cash flow, because it is. Well inside the IRS elective-deferral
   * limit (`K401_LIMITS.employeeDeferral2026`) for almost every household.
   */
  k401Monthly: number;
  /**
   * What YOU put into the HSA each month, out of your own pay. Deducted
   * from cash flow like the 401(k) contribution, but capped by a much
   * smaller family/self-only limit that the employer seed also counts
   * against (`HSA_LIMITS`, `employeeHsaRoom()`).
   */
  hsaMonthly: number;
  /**
   * Whether this household has an HSA at all -- some employer plans don't
   * offer one. Off zeroes the employee HSA contribution in the projection
   * (mirrors `pauseHsaMax`) and hides the HSA target/gauge in the UI.
   */
  hasHsaPlan: boolean;
  /**
   * HDHP coverage tier, which sets the IRS contribution ceiling
   * (`HSA_LIMITS`, `employeeHsaRoom()`). Depends on the health plan you
   * carry, not on `Settings.filingStatus` -- a married couple can carry
   * self-only coverage and vice versa.
   */
  hsaCoverageTier: "selfOnly" | "family";
  /**
   * What your employer puts in each month, typically a percentage-of-salary
   * match. Free money: it grows the balance without touching take-home.
   */
  employerMatchMonthly: number;
  /**
   * Employer contributions that land as an annual lump rather than per
   * paycheque -- a profit-share 401(k) contribution, an HSA seed, and so on.
   * Also free money, and easy to forget precisely because it arrives once.
   */
  employerAnnualLump: number;
  /**
  Calendar month the employer lump lands. 1 = January.
  */
  employerAnnualLumpMonth: number;
  /**
  Pay medical from the HSA rather than from cash.
  */
  hsaPayMedical: boolean;
  /**
  Take the one-off reimbursement.
  */
  hsaTakeReimbursement: boolean;
  /**
   * Stop maxing the HSA and route the difference to the deposit instead.
   *
   * The HSA is the most tax-efficient account available, but it cannot buy a
   * house. While the buffer is the thing blocking you, redirecting some of it
   * is often the single fastest lever you have. `hsaMonthly` drops to zero
   * while this is on; `k401Monthly` keeps running unchanged.
   */
  pauseHsaMax: boolean;
  /**
   * Medical spending paid FROM the HSA each month instead of out of cash.
   *
   * The HSA is counted inside the retirement balance here, so this moves money
   * from long-term savings into present-day cash flow. Tax-free either way --
   * the only question is whether you want the compounding or the liquidity.
   */
  hsaMedicalMonthly: number;
  /**
   * A one-off reimbursement from the HSA to your current account.
   *
   * The IRS sets no deadline for reimbursing yourself: any qualified expense
   * incurred after the account was opened can be claimed years later, provided
   * you kept the receipts. So a stack of past medical bills is effectively a
   * tax-free line of credit against your own HSA.
   */
  hsaReimbursement: number;
  /**
  Projection month the reimbursement lands, when not tied to the purchase.
  */
  hsaReimbursementMonth: number;
  /**
   * Land the reimbursement in whatever month that scenario buys, rather than a
   * fixed month.
   *
   * This is usually what you want: the reimbursement exists to bolster cash at
   * closing, so it should follow the purchase as you drag the buy-month slider.
   * A scenario that never buys never takes it.
   */
  hsaReimbursementAtPurchase: boolean;
  /**
  Expected annual return, as a decimal.
  */
  returnAnnual: number;
  /**
   * Grow contributions at the same rate as income. Over a few years this barely
   * matters; over thirty it is the difference between a plausible number and a
   * badly wrong one, since a flat $1,000/mo becomes trivial after decades of
   * raises.
   */
  contributionsGrowWithIncome: boolean;
}

/**
 * Liquid savings, split into two pools because the distinction compounds into
 * something enormous over a 30-year horizon.
 *
 *  - Cash is the near-term buffer: safe, low return, what you'd actually reach
 *    for during a job loss or at a closing table.
 *  - Investments are everything above that buffer: higher return, but you'd
 *    have to sell to spend them.
 *
 * Each month, surplus cash above the buffer target is swept into investments,
 * and any shortfall sells investments to cover it.
 */
export interface SavingsAssumptions {
  /**
  Checking + savings/HYSA today.
  */
  cashBalance: number;
  /**
  Taxable brokerage today. Not retirement.
  */
  investmentBalance: number;
  /**
  Annual return on the cash pool, as a decimal. Think HYSA.
  */
  cashReturnAnnual: number;
  /**
  Annual return on the invested pool, as a decimal.
  */
  investmentReturnAnnual: number;
  /**
   * How many months of total outgoings (living costs + housing) to hold in cash
   * before sweeping the rest into investments. This is the emergency fund.
   */
  cashBufferMonths: number;
}

/**
 * A fixed commitment that runs for a defined window and then stops -- a
 * lease, a loan, a court-ordered or contractual payment with a known end
 * date.
 *
 * Obligations are modelled apart from ordinary expenses for two reasons, and
 * both of them matter:
 *
 *  1. They do NOT inflate. A fixed order is a set dollar amount until a
 *     court or contract changes it, so inflating it would overstate the cost
 *     every year.
 *  2. They are NOT cut during a job loss. You can stop eating out; you cannot
 *     unilaterally stop paying a court-ordered obligation. Treating them as
 *     discretionary would make every job-loss scenario look survivable when it
 *     isn't.
 *
 * The month they end is a real event in the plan -- cash flow steps up and
 * never steps back down.
 */
export interface TimedObligation {
  id: string;
  label: string;
  /**
  Fixed monthly amount. Never inflated.
  */
  monthlyAmount: number;
  /**
  First projection month it applies (1-based).
  */
  startMonth: number;
  /**
  Last projection month it applies, or null to run to the horizon.
  */
  endMonth: number | null;
}

/**
 * A household member who contributes income, but only once you own a home with
 * space for them -- extra square footage, a finished basement, a first-floor
 * bedroom.
 *
 * Modelled on its own because it has three properties nothing else in this
 * model has:
 *
 *  1. It is CONTINGENT on buying. There is no benefit while renting, so it
 *     changes the buy-early-versus-buy-later calculation directly.
 *  2. It comes with a PRICE PREMIUM. A house with a separate living space costs
 *     more than one without, and the whole question is whether the income
 *     justifies the extra mortgage.
 *  3. It CAN be independent of your employment, and when it is, it does NOT
 *     stop during a job loss -- which makes this money far more valuable as a
 *     buffer than the same amount of salary.
 */
export interface CoResidentIncome {
  enabled: boolean;
  label: string;
  /**
  Contribution towards household costs each month.
  */
  monthlyAmount: number;
  /**
  Only counts from the month you buy. Off means it starts immediately.
  */
  requiresHomePurchase: boolean;
  /**
  Extra you would pay for a house with the space -- in-law suite, basement.
  */
  homePricePremium: number;
  /**
  Track inflation, as a cost-of-living adjustment would.
  */
  growsWithInflation: boolean;
  /**
  Last month it applies, or null to run to the horizon.
  */
  endMonth: number | null;
}

/**
 * A partner returning to work.
 *
 * Modelled apart from the main income for three reasons that all matter:
 *
 *  1. It STARTS on a date you choose, so you can ask what a year earlier or a
 *     year later is worth.
 *  2. It brings COSTS with it. Childcare for a small child routinely eats most
 *     of a modest salary, and those costs stop when the child reaches school
 *     age -- so a second income is often net-negative for a few years and
 *     strongly positive afterwards. Netting the two into one number hides that
 *     entirely.
 *  3. It usually SURVIVES the other earner's job loss, because it is a
 *     different employer. That makes it the single best hedge in the model.
 */
export interface SecondIncome {
  enabled: boolean;
  label: string;
  /**
  Take-home pay per month, after tax.
  */
  monthlyTakeHome: number;
  /**
  Projection month it starts (1-based).
  */
  startMonth: number;
  /**
   * Extra costs incurred BY working: childcare, commuting, a second car.
   * Charged only while the second income is running.
   */
  additionalCostsMonthly: number;
  /**
   * Month those costs stop -- typically when the youngest starts school.
   * Null means they run for the whole horizon.
   */
  additionalCostsEndMonth: number | null;
  /**
   * Dependent Care FSA election, per year. Childcare paid through it comes out
   * of pre-tax pay, so it saves your marginal rate on every dollar elected.
   * The 2026 limit rose to $7,500 -- the first increase since 1986 -- but an
   * employer has to actually offer it at that level.
   */
  dependentCareFsaAnnual: number;
  /**
  Marginal rate the FSA saves at. A second income is taxed at the top.
  */
  dependentCareFsaTaxRate: number;
  /**
  Track pay rises like the main income.
  */
  growsWithIncome: boolean;
  /**
   * Whether a household job loss cuts this too. Normally false: a different
   * employer means a different risk, which is most of its value as a buffer.
   */
  affectedByJobLoss: boolean;
}

/**
Who the plan is for. Drives the retirement-age milestones.
*/
export interface HouseholdAssumptions {
  /**
  Age today of the person the milestones are anchored to.
  */
  primaryAge: number;
  /**
  Partner's age today. Shown alongside; not used in the maths.
  */
  partnerAge: number;
}

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
