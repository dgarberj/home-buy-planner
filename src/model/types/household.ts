/**
 * Household composition and the income/obligation streams tied to it:
 * fixed commitments with an end date, a co-resident's contribution, and a
 * partner's second income.
 */

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
