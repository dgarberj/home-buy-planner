/**
 * Income, expense, retirement, and savings assumptions.
 *
 * Rate conventions (important, and tested):
 *  - All `*Annual` growth/return/inflation/appreciation rates are DECIMALS (0.04 = 4%)
 *    and are converted to monthly geometrically: (1 + annual)^(1/12) - 1.
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
   * What YOU put into your 401(k), as a share of gross annual salary --
   * most employers run the election as a percentage of pay, not a flat
   * dollar amount. Deducted from cash flow as a dollar figure
   * (`k401Pct * grossAnnualSalary`), because it is. Well inside the IRS
   * elective-deferral limit (`K401_LIMITS.employeeDeferral2026`) for almost
   * every household.
   */
  k401Pct: number;
  /**
   * Whether this household has a 401(k) at all. Off zeroes the employee
   * 401(k) contribution and employer match in the projection and hides the
   * 401(k) target/gauge/inputs in the UI.
   */
  hasK401Plan: boolean;
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
   * The one-time employer HSA seed/bonus, if any -- kept apart from
   * `employerAnnualLump` so it can be netted against the employee's own HSA
   * room (`HSA_LIMITS` counts employer and employee money together).
   * Lands the same month as `employerAnnualLump`.
   */
  employerHsaAnnualBonus: number;
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
   * What YOU put into a Roth IRA each month, out of your own pay. Deducted
   * from cash flow like the 401(k)/HSA contributions. Capped by the IRS
   * contribution limit (`IRA_LIMITS.contribution2026`) and, above a MAGI
   * threshold, phased down to zero (`ROTH_PHASEOUT_2026`, `rothIraRoom()`).
   */
  iraMonthly: number;
  /**
   * Whether this household is funding an IRA at all. Off zeroes the IRA
   * contribution in the projection and hides the IRA target/gauge/inputs in
   * the UI.
   */
  hasIraPlan: boolean;
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
