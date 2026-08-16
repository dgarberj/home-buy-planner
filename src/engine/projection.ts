import type {
  Assumptions,
  JobLossAssumptions,
  MonthlyResult,
  ScenarioConfig,
  ScenarioSummary,
} from "../model/types";
import { SEED_SETTINGS } from "../data/seed";
import {
  compound,
  computeAssistanceAmount,
  monthlyGeometric,
  monthlyNominal,
  monthlyPayment,
  isPmiRequired,
  remainingBalance,
} from "./finance";

/**
 * ============================================================================
 *  The projection engine.
 * ============================================================================
 *
 * `runProjection` is a pure function: same inputs -> same outputs, no state, no
 * randomness, no dependency on React or the browser. It is the one part of this
 * app that has to be numerically right, so it lives on its own and is tested
 * against hand-computed values in `projection.test.ts`.
 *
 * Modelling decisions worth knowing (all of them are deliberate):
 *
 *  1. Month 1 is "this month" -- no growth applied. Month 13 has had exactly one
 *     year of raises/inflation/returns.
 *  1b. A bonus lands as a lump in one calendar month a year, not smeared across
 *     twelve. Smearing it would hide the eleven months where that money is not
 *     actually in the account, which is precisely when a buffer gets tested.
 *  2. The target house appreciates while we save for it. Waiting means a bigger
 *     down payment, which is the whole point of comparing buy-early vs buy-late.
 *  3. Rent inflates at the general expense inflation rate.
 *  4. Property tax / insurance / HOA is held flat in nominal terms. It is an
 *     estimate anyway, and holding it flat keeps the model easy to explain.
 *  5. Liquid savings is allowed to go negative. That is not a bug -- it is the
 *     model telling us the plan doesn't fund itself. The UI flags it in red.
 *  6. During a job loss the employer match stops with the job (both stop
 *     together when `pauseRetirementContributions` is set).
 *  7. Savings live in two pools. Cash is held to a buffer target of N months of
 *     total outgoings; anything above that is swept into investments at the
 *     higher return. Shortfalls drain cash first, then sell investments. Over a
 *     five-year window this barely moves the answer; over thirty it dominates
 *     it, which is the whole reason the split exists.
 *  8. Retirement contributions can grow with income. A flat contribution over
 *     thirty years of raises is a materially wrong model, so this defaults on.
 *  8b. Employer money comes in two shapes: a regular per-paycheque match, and
 *     an annual lump such as a profit share or an HSA seed. Both grow the
 *     balance without touching take-home. The lump is modelled as landing in
 *     its actual month, because averaging it away hides it.
 *  9. Owning costs more than the mortgage. Upkeep accrues every month as a
 *     share of the home's value, and PMI is charged until the loan-to-value
 *     ratio clears the threshold. Both are easy to omit from a rent-vs-buy
 *     comparison, and omitting them flatters buying.
 *  9b. A second earner returning to work is modelled with the costs that come
 *     with it. Childcare routinely eats most of a modest salary until the child
 *     reaches school age, so the net effect is often negative for a few years
 *     and strongly positive afterwards. Netting them into one figure would hide
 *     the whole shape of it.
 *  9c. The HSA is counted inside the retirement balance, so paying medical
 *     bills from it -- or reimbursing yourself for past ones, which the IRS
 *     allows with no deadline -- moves money from long-term compounding into
 *     present-day cash. Both directions are tax-free; the trade is growth
 *     against liquidity.
 *  9d. Down-payment assistance reduces the cash you need at closing, but it is
 *     modelled as a LIEN rather than a gift. K-FIT is forgiven at 10% a year,
 *     so equity climbs as the lien melts; K-DATE is deferred, so it sits
 *     against your equity until you sell. Treating either as free money on day
 *     one would overstate net worth by the whole amount.
 * 10. A co-resident's contribution is contingent on owning. It starts at the
 *     buy month, carries a house-price premium for the extra space, and -- the
 *     part that matters -- does NOT stop during a job loss, because it need
 *     not depend on your employment at all.
 * 11. Fixed obligations -- a court-ordered or contractual payment, a loan with
 *     a known end date -- neither inflate nor get cut during a job loss. See
 *     TimedObligation for why both of those matter. The month one ends is a
 *     genuine step change in the plan.
 *
 * What this model deliberately does NOT do: it projects accumulation only. It
 * does not model drawing down in retirement, taxes on withdrawal, Social
 * Security, or required distributions. "Net worth at 65" means what you have
 * built by then, not what it will support.
 */

/**
Resolve shared job-loss assumptions against a scenario's overrides.
*/
function resolveJobLoss(
  base: JobLossAssumptions,
  scenario: ScenarioConfig,
): JobLossAssumptions {
  return { ...base, ...scenario.jobLossOverride };
}

/**
Is month `m` inside this scenario's job-loss window?
*/
function isJobLossActive(
  m: number,
  scenario: ScenarioConfig,
  jl: JobLossAssumptions,
): boolean {
  if (!scenario.hasJobLoss) return false;
  if (jl.durationMonths <= 0) return false;
  return m >= jl.startMonth && m < jl.startMonth + jl.durationMonths;
}

/**
Total fixed obligations due in month `m`. Never inflated, never cut.
*/
export function obligationsDue(assumptions: Assumptions, m: number): number {
  let total = 0;
  for (const o of assumptions.obligations) {
    if (m < o.startMonth) continue;
    if (o.endMonth !== null && m > o.endMonth) continue;
    total += o.monthlyAmount;
  }
  return total;
}

/**
Age of the primary person in month `m`. Month 1 is their age today.
*/
export function ageAtMonth(assumptions: Assumptions, m: number): number {
  return assumptions.household.primaryAge + (m - 1) / 12;
}

/**
 * The first month in which the primary person has reached `targetAge`.
 * Returns null if that never happens inside `months`.
 */
export function monthForAge(
  assumptions: Assumptions,
  targetAge: number,
  months: number,
): number | null {
  const m = Math.round((targetAge - assumptions.household.primaryAge) * 12) + 1;
  if (m < 1 || m > months) return null;
  return m;
}

/**
 * Price of the target house in month `m`, having appreciated from today.
 * Month 1 == today's price.
 */
export function homePriceAtMonth(assumptions: Assumptions, m: number): number {
  const appr = monthlyGeometric(assumptions.home.appreciationAnnual);
  // A house with a separate living space costs more. That premium is the price
  // of the co-resident's contribution, and the comparison only means anything
  // if both sides are counted.
  const { coResident } = assumptions;
  const premium = coResident.enabled ? coResident.homePricePremium : 0;
  return compound(assumptions.home.targetPrice + premium, appr, m - 1);
}

/**
 * Cash you have to hand over to buy in month `m`: down payment, closing costs,
 * and -- if the down payment is small enough to need mortgage insurance -- the
 * upfront premium on top.
 */
export function cashRequiredToBuy(assumptions: Assumptions, m: number): number {
  const { downPaymentPct, closingCostPct, pmiUpfrontPct, pmiRemovedAtLtv } =
    assumptions.home;
  const price = homePriceAtMonth(assumptions, m);
  const loanShare = 1 - downPaymentPct;
  // A big enough deposit avoids mortgage insurance entirely.
  const upfront = isPmiRequired(loanShare, pmiRemovedAtLtv)
    ? loanShare * pmiUpfrontPct
    : 0;
  const gross = price * (downPaymentPct + closingCostPct + upfront);

  // Assistance is money you do not have to bring on the day.
  const assistance = computeAssistanceAmount(price, assumptions.home);

  return Math.max(0, gross - assistance);
}

/**
Take-home pay for month `m`, including any January-style lump bonus, both
haircut by a job loss the same way (see modelling note 1b).
*/
function computeEmploymentIncome(
  income: Assumptions["income"],
  incomeGrowth: number,
  m: number,
  calendarMonth: number,
  isJobLossActive: boolean,
  jl: JobLossAssumptions,
): { netIncome: number; bonusIncome: number } {
  const baseIncome = compound(income.monthlyTakeHome, incomeGrowth, m - 1);
  const bonusDue =
    income.annualBonusNet > 0 && calendarMonth === income.annualBonusMonth
      ? compound(income.annualBonusNet, incomeGrowth, m - 1)
      : 0;
  const grossThisMonth = baseIncome + bonusDue;
  return {
    netIncome: isJobLossActive
      ? grossThisMonth * jl.incomeReplacementPct
      : grossThisMonth,
    bonusIncome: isJobLossActive
      ? bonusDue * jl.incomeReplacementPct
      : bonusDue,
  };
}

/**
A partner's income and the childcare costs that come with it (modelling note
9b), net of anything a Dependent Care FSA shelters.
*/
function computeSecondIncome(
  second: Assumptions["secondIncome"],
  m: number,
  incomeGrowth: number,
  inflation: number,
  isJobLossActive: boolean,
  jl: JobLossAssumptions,
): {
  secondIncome: number;
  secondIncomeCosts: number;
  dependentCareTaxSaving: number;
} {
  const secondActive = second.enabled && m >= second.startMonth;
  const secondGrown = second.growsWithIncome
    ? compound(second.monthlyTakeHome, incomeGrowth, m - 1)
    : second.monthlyTakeHome;
  const secondRaw = secondActive ? secondGrown : 0;
  const secondIncome =
    isJobLossActive && secondActive && second.affectedByJobLoss
      ? secondRaw * jl.incomeReplacementPct
      : secondRaw;

  const costsRunning =
    secondActive &&
    (second.additionalCostsEndMonth === null ||
      m <= second.additionalCostsEndMonth);
  const grossCareCosts = costsRunning
    ? compound(second.additionalCostsMonthly, inflation, m - 1)
    : 0;

  const fsaMonthlyCap = second.dependentCareFsaAnnual / 12;
  const dependentCareTaxSaving =
    grossCareCosts > 0
      ? Math.min(grossCareCosts, fsaMonthlyCap) * second.dependentCareFsaTaxRate
      : 0;

  return {
    secondIncome,
    secondIncomeCosts: grossCareCosts - dependentCareTaxSaving,
    dependentCareTaxSaving,
  };
}

/**
A co-resident's contribution, contingent on owning but never on employment
(modelling note 10).
*/
function computeCoResidentIncome(
  coResident: Assumptions["coResident"],
  m: number,
  inflation: number,
  isOwnsHome: boolean,
): number {
  const coResidentActive =
    coResident.enabled &&
    (!coResident.requiresHomePurchase || isOwnsHome) &&
    (coResident.endMonth === null || m <= coResident.endMonth);
  const coResidentGrown = coResident.growsWithInflation
    ? compound(coResident.monthlyAmount, inflation, m - 1)
    : coResident.monthlyAmount;
  return coResidentActive ? coResidentGrown : 0;
}

/**
Living expenses (housing excluded), inflated and then cut during a job loss.
*/
function computeTotalExpenses(
  expenses: Assumptions["expenses"],
  m: number,
  inflation: number,
  isJobLossActive: boolean,
  jl: JobLossAssumptions,
): number {
  const baseExpenses = compound(
    expenses.fixedMonthly + expenses.variableMonthly,
    inflation,
    m - 1,
  );
  return isJobLossActive ? baseExpenses * (1 - jl.expenseCutPct) : baseExpenses;
}

/**
Rent before buying; PITI + PMI plus upkeep after (modelling note 9).
*/
function computeHousing(
  m: number,
  isOwnsHome: boolean,
  buyMonth: number | null,
  purchasePrice: number,
  appreciation: number,
  loanAmount: number,
  mortgageRate: number,
  termMonths: number,
  piPayment: number,
  pmiFullMonthly: number,
  home: Assumptions["home"],
  expenses: Assumptions["expenses"],
  inflation: number,
): {
  housingPayment: number;
  pmiPayment: number;
  homeMaintenance: number;
  homeValue: number;
  mortgageBalance: number;
} {
  if (!isOwnsHome) {
    return {
      housingPayment: compound(expenses.currentRentMonthly, inflation, m - 1),
      pmiPayment: 0,
      homeMaintenance: 0,
      homeValue: 0,
      mortgageBalance: 0,
    };
  }

  const paymentsMade = m - (buyMonth as number) + 1;
  // Once the loan is repaid the payment drops to escrow only. This only
  // shows up on horizons long enough to outlive the mortgage -- which is
  // exactly what the retirement-age view is for.
  const isStillRepaying = paymentsMade <= termMonths;
  const homeValue = compound(
    purchasePrice,
    appreciation,
    m - (buyMonth as number),
  );
  const mortgageBalance = remainingBalance(
    loanAmount,
    mortgageRate,
    termMonths,
    paymentsMade,
  );

  // PMI falls away once enough of the house is actually yours. Note this
  // happens sooner when the home appreciates, not just as you pay down.
  const ltv = homeValue > 0 ? mortgageBalance / homeValue : 0;
  const pmiPayment = isPmiRequired(ltv, home.pmiRemovedAtLtv)
    ? pmiFullMonthly
    : 0;

  return {
    housingPayment:
      (isStillRepaying ? piPayment : 0) +
      home.taxInsuranceHoaMonthly +
      pmiPayment,
    pmiPayment,
    // Upkeep tracks what the house is worth, so it grows with appreciation.
    homeMaintenance: (homeValue * home.maintenanceAnnualPct) / 12,
    homeValue,
    mortgageBalance,
  };
}

/**
What is still owed on any down-payment assistance -- forgiven assistance
melts away over its term, deferred assistance sits there until sale
(modelling note 9d).
*/
function computeAssistanceOutstanding(
  m: number,
  isOwnsHome: boolean,
  buyMonth: number | null,
  assistanceAmount: number,
  assistanceTermMonths: number,
  assistanceRepayment: Assumptions["home"]["assistanceRepayment"],
): number {
  if (!isOwnsHome || assistanceAmount <= 0) return 0;

  const monthsHeld = m - (buyMonth as number) + 1;
  if (
    assistanceRepayment === "forgiven" ||
    assistanceRepayment === "amortised"
  ) {
    return (
      assistanceAmount * Math.max(0, 1 - monthsHeld / assistanceTermMonths)
    );
  }
  if (assistanceRepayment === "deferred") {
    return assistanceAmount;
  }
  return 0;
}

/**
Employee and employer retirement contributions, paused together with the job
(modelling note 6), scaled with pay rises (modelling note 8), plus any annual
employer lump (modelling note 8b).
*/
function computeRetirementContribution(
  retirement: Assumptions["retirement"],
  grossMonthly: number,
  m: number,
  calendarMonth: number,
  incomeGrowth: number,
  isContributionsPaused: boolean,
): { employeeContribution: number; employerContribution: number } {
  const contributionScale = retirement.contributionsGrowWithIncome
    ? compound(1, incomeGrowth, m - 1)
    : 1;
  // Diverting the HSA to the deposit zeroes it out; the 401(k) keeps going.
  const employeeK401 = retirement.hasK401Plan
    ? retirement.k401Pct * grossMonthly * contributionScale
    : 0;
  const employeeHsa =
    retirement.pauseHsaMax || !retirement.hasHsaPlan
      ? 0
      : retirement.hsaMonthly * contributionScale;
  const employeeIra = retirement.hasIraPlan
    ? retirement.iraMonthly * contributionScale
    : 0;
  const employeeContribution = isContributionsPaused
    ? 0
    : employeeK401 + employeeHsa + employeeIra;
  const employerMatch =
    isContributionsPaused || !retirement.hasK401Plan
      ? 0
      : retirement.employerMatchMonthly * contributionScale;

  // Employer money that arrives once a year -- profit share, HSA seed. Lands
  // in one calendar month, not smeared, and stops if you are not there.
  const employerAnnualLump = retirement.hasK401Plan
    ? retirement.employerAnnualLump
    : 0;
  const employerHsaBonus = retirement.hasHsaPlan
    ? retirement.employerHsaAnnualBonus
    : 0;
  const employerLumpTotal = employerAnnualLump + employerHsaBonus;
  const employerLump =
    !isContributionsPaused &&
    employerLumpTotal > 0 &&
    calendarMonth === retirement.employerAnnualLumpMonth
      ? employerLumpTotal * contributionScale
      : 0;

  return {
    employeeContribution,
    employerContribution: employerMatch + employerLump,
  };
}

/**
Money coming back out of the HSA -- a purchase-timed or fixed-month
reimbursement, plus ongoing medical spend (modelling note 9c).
*/
function computeHsaFlows(
  retirement: Assumptions["retirement"],
  buyMonth: number | null,
  m: number,
): { hsaReimbursed: number; hsaMedicalPaid: number } {
  const reimbursementMonth = retirement.hsaReimbursementAtPurchase
    ? buyMonth
    : retirement.hsaReimbursementMonth;
  const hsaReimbursed =
    reimbursementMonth !== null &&
    m === reimbursementMonth &&
    retirement.hsaTakeReimbursement &&
    retirement.hsaReimbursement > 0
      ? retirement.hsaReimbursement
      : 0;
  const hsaMedicalPaid = retirement.hsaPayMedical
    ? retirement.hsaMedicalMonthly
    : 0;
  return { hsaReimbursed, hsaMedicalPaid };
}

/**
Apply a month's return, cash flow, and the sweep between the two savings
pools (modelling note 7): shortfalls drain cash first then sell investments
-- never clamped -- and anything above the buffer target sweeps the other
way.
*/
function applyCashSweep(
  cash: number,
  investments: number,
  cashReturn: number,
  investmentReturn: number,
  netCashFlow: number,
  purchaseOutflow: number,
  bufferTarget: number,
): { cash: number; investments: number } {
  let nextCash = cash * (1 + cashReturn);
  let nextInvestments = investments * (1 + investmentReturn);

  nextCash += netCashFlow - purchaseOutflow;

  if (nextCash < 0 && nextInvestments > 0) {
    const sold = Math.min(nextInvestments, -nextCash);
    nextInvestments -= sold;
    nextCash += sold;
  }

  if (nextCash > bufferTarget) {
    const excess = nextCash - bufferTarget;
    nextCash -= excess;
    nextInvestments += excess;
  }

  return { cash: nextCash, investments: nextInvestments };
}

/**
 * Project a single scenario forward month by month.
 *
 * @param assumptions       the shared household model
 * @param scenario          which house-buying / job-loss variant to run
 * @param months            horizon length (60 = five years)
 * @param grossAnnualSalary base salary before bonus -- lives in `Settings`,
 *                          not `Assumptions`, so it comes in as its own
 *                          argument. Drives the 401(k) contribution, which
 *                          is stored as a share of it (`retirement.k401Pct`).
 *                          Defaults to the seed household's salary so callers
 *                          that don't care about it (most tests) don't need
 *                          to pass one.
 */
export function runProjection(
  assumptions: Assumptions,
  scenario: ScenarioConfig,
  months: number,
  grossAnnualSalary: number = SEED_SETTINGS.grossAnnualSalary,
): MonthlyResult[] {
  const { income, expenses, retirement, savings, home } = assumptions;
  const jl = resolveJobLoss(assumptions.jobLoss, scenario);
  const grossMonthly = grossAnnualSalary / 12;

  const incomeGrowth = monthlyGeometric(income.growthAnnual);
  const inflation = monthlyGeometric(expenses.inflationAnnual);
  const retirementReturn = monthlyGeometric(retirement.returnAnnual);
  const cashReturn = monthlyGeometric(savings.cashReturnAnnual);
  const investmentReturn = monthlyGeometric(savings.investmentReturnAnnual);
  const appreciation = monthlyGeometric(home.appreciationAnnual);

  const mortgageRate = monthlyNominal(home.mortgageRateAnnual);
  const termMonths = Math.round(home.mortgageTermYears * 12);

  // --- Purchase terms are locked in at the buy month -----------------------
  const buyMonth = scenario.buyMonth;
  const purchasePrice =
    buyMonth === null ? 0 : homePriceAtMonth(assumptions, buyMonth);
  const downPayment = purchasePrice * home.downPaymentPct;
  const closingCosts = purchasePrice * home.closingCostPct;
  const loanAmount = purchasePrice - downPayment;
  const piPayment = monthlyPayment(loanAmount, mortgageRate, termMonths);
  // PMI is quoted against the original loan, not the current balance.
  const pmiFullMonthly = (loanAmount * home.pmiAnnualPct) / 12;
  // A small down payment can also carry a one-off premium at closing.
  const isNeedsMortgageInsurance =
    purchasePrice > 0 &&
    isPmiRequired(loanAmount / purchasePrice, home.pmiRemovedAtLtv);
  const upfrontPmi = isNeedsMortgageInsurance
    ? loanAmount * home.pmiUpfrontPct
    : 0;

  // Down-payment assistance reduces the cash you need on the day, but until it
  // is forgiven it is a lien -- so it does NOT add to net worth at closing.
  const assistanceAmount = computeAssistanceAmount(purchasePrice, home);
  const assistanceTermMonths = Math.max(
    1,
    Math.round(home.assistanceTermYears * 12),
  );

  let cash = savings.cashBalance;
  let investments = savings.investmentBalance;
  let retirementBalance = retirement.currentBalance;

  const results: MonthlyResult[] = [];

  for (let m = 1; m <= months; m++) {
    // Matches the `jobLossActive` field name on the public MonthlyResult
    // type (src/model/types.ts), used via object-shorthand below.
    // eslint-disable-next-line unicorn/consistent-boolean-name
    const jobLossActive = isJobLossActive(m, scenario, jl);
    const isOwnsHome = buyMonth !== null && m >= buyMonth;
    const isPurchaseMonth = buyMonth !== null && m === buyMonth;

    // --- Income ----------------------------------------------------------
    // A bonus is a lump, not a monthly average. Which projection months are
    // Januaries depends on when the projection starts.
    const calendarMonth = ((income.calendarStartMonth - 1 + (m - 1)) % 12) + 1;
    const { netIncome, bonusIncome } = computeEmploymentIncome(
      income,
      incomeGrowth,
      m,
      calendarMonth,
      jobLossActive,
      jl,
    );

    // --- A partner returning to work --------------------------------------
    // Kept apart from the main salary: it starts on its own schedule, brings
    // its own costs, and usually survives the other earner losing their job.
    const { secondIncome, secondIncomeCosts, dependentCareTaxSaving } =
      computeSecondIncome(
        assumptions.secondIncome,
        m,
        incomeGrowth,
        inflation,
        jobLossActive,
        jl,
      );

    // --- A co-resident's contribution ------------------------------------
    // Deliberately NOT reduced during a job loss: their income does not depend
    // on your job. That independence is most of its value.
    const coResidentIncome = computeCoResidentIncome(
      assumptions.coResident,
      m,
      inflation,
      isOwnsHome,
    );

    // --- Living expenses (housing excluded, handled below) ----------------
    const totalExpenses = computeTotalExpenses(
      expenses,
      m,
      inflation,
      jobLossActive,
      jl,
    );

    // Fixed commitments. Deliberately outside both the inflation and the
    // job-loss cut above -- see TimedObligation for why.
    const obligations = obligationsDue(assumptions, m);

    // --- Housing: rent, then PITI + PMI, plus upkeep on the side -----------
    const {
      housingPayment,
      pmiPayment,
      homeMaintenance,
      homeValue,
      mortgageBalance,
    } = computeHousing(
      m,
      isOwnsHome,
      buyMonth,
      purchasePrice,
      appreciation,
      loanAmount,
      mortgageRate,
      termMonths,
      piPayment,
      pmiFullMonthly,
      home,
      expenses,
      inflation,
    );

    // What is still owed on any down-payment assistance. Forgiven assistance
    // melts away over its term; deferred assistance sits there until you sell.
    // Either way it is a second lien, so equity has to be net of it.
    const assistanceOutstanding = computeAssistanceOutstanding(
      m,
      isOwnsHome,
      buyMonth,
      assistanceAmount,
      assistanceTermMonths,
      home.assistanceRepayment,
    );

    const homeEquity = isOwnsHome
      ? homeValue - mortgageBalance - assistanceOutstanding
      : 0;

    // --- Retirement -------------------------------------------------------
    const contributionsPaused =
      jobLossActive && jl.pauseRetirementContributions;
    const { employeeContribution, employerContribution } =
      computeRetirementContribution(
        retirement,
        grossMonthly,
        m,
        calendarMonth,
        incomeGrowth,
        contributionsPaused,
      );

    // --- Money coming back OUT of the HSA ---------------------------------
    // The HSA sits inside the retirement balance, so spending from it moves
    // money from long-term compounding into present-day cash. Never more than
    // the balance holds.
    const { hsaReimbursed, hsaMedicalPaid } = computeHsaFlows(
      retirement,
      buyMonth,
      m,
    );

    retirementBalance =
      retirementBalance * (1 + retirementReturn) +
      employeeContribution +
      employerContribution;

    const drawnFromHsa = Math.min(
      hsaReimbursed + hsaMedicalPaid,
      Math.max(retirementBalance, 0),
    );
    retirementBalance -= drawnFromHsa;

    // --- Cash, investments, and the sweep between them --------------------
    const netCashFlow =
      netIncome +
      coResidentIncome +
      secondIncome -
      secondIncomeCosts +
      // Medical paid from the HSA is spending you no longer fund from cash.
      drawnFromHsa -
      totalExpenses -
      obligations -
      housingPayment -
      homeMaintenance -
      employeeContribution;
    const purchaseOutflow = isPurchaseMonth
      ? downPayment + closingCosts + upfrontPmi - assistanceAmount
      : 0;
    const assistanceReceived = isPurchaseMonth ? assistanceAmount : 0;

    // Emergency buffer target the sweep aims to leave in cash.
    const bufferTarget =
      savings.cashBufferMonths *
      (totalExpenses +
        obligations +
        housingPayment +
        homeMaintenance +
        secondIncomeCosts);

    ({ cash, investments } = applyCashSweep(
      cash,
      investments,
      cashReturn,
      investmentReturn,
      netCashFlow,
      purchaseOutflow,
      bufferTarget,
    ));

    const liquidSavings = cash + investments;

    results.push({
      month: m,
      year: Math.ceil(m / 12),
      netIncome,
      bonusIncome,
      coResidentIncome,
      secondIncome,
      secondIncomeCosts,
      dependentCareTaxSaving,
      hsaMedicalPaid: Math.min(hsaMedicalPaid, drawnFromHsa),
      hsaReimbursed: Math.min(hsaReimbursed, drawnFromHsa),
      totalExpenses,
      obligations,
      housingPayment,
      pmiPayment,
      homeMaintenance,
      jobLossActive,
      ownsHome: isOwnsHome,
      netCashFlow,
      employeeContribution,
      employerContribution,
      cashBalance: cash,
      investmentBalance: investments,
      liquidSavings,
      age: ageAtMonth(assumptions, m),
      retirementBalance,
      homeValue,
      mortgageBalance,
      homeEquity,
      netWorth: liquidSavings + retirementBalance + homeEquity,
      purchaseOutflow,
      assistanceReceived,
      assistanceOutstanding,
    });
  }

  return results;
}

/**
The first month a shadow "never buy" run has saved enough to afford the
house, and what that would cost by then.
*/
function computeReadiness(
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
function wasFundedAtPurchase(
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
function computeMinCashBuffer(monthsResult: MonthlyResult[]): {
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

function computeNetWorthAtYear(
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
function computeMilestones(
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

interface MortgageLifeStats {
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
function computeMortgageLifeStats(
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

/**
 * Turn a raw projection into the handful of numbers the dashboard actually
 * shows: when we can afford the house, whether we could afford the one we
 * bought, and how thin the cash gets along the way.
 *
 * "Readiness" is measured against a shadow run of the same scenario in which we
 * never buy. That answers the question a person actually asks -- "when will we
 * have enough saved up?" -- without the answer being distorted by the purchase
 * we are testing.
 */
export function summarizeScenario(
  assumptions: Assumptions,
  scenario: ScenarioConfig,
  months: number,
  grossAnnualSalary: number = SEED_SETTINGS.grossAnnualSalary,
  milestoneAges: number[] = [],
): ScenarioSummary {
  const monthsResult = runProjection(
    assumptions,
    scenario,
    months,
    grossAnnualSalary,
  );

  const neverBuy = runProjection(
    assumptions,
    { ...scenario, buyMonth: null },
    months,
    grossAnnualSalary,
  );

  const { readinessMonth, readinessCashRequired } = computeReadiness(
    assumptions,
    neverBuy,
    months,
  );
  const isFundedAtPurchase = wasFundedAtPurchase(scenario, monthsResult);
  const { minCashBuffer, minCashBufferMonth } =
    computeMinCashBuffer(monthsResult);
  const netWorthAtYear = computeNetWorthAtYear(monthsResult);
  const { netWorthAtAge, retirementAtAge, homeEquityAtAge, investmentsAtAge } =
    computeMilestones(assumptions, monthsResult, months, milestoneAges);
  const mortgageLife = computeMortgageLifeStats(assumptions, monthsResult);

  const last = monthsResult.at(-1);

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    color: scenario.color,
    months: monthsResult,
    readinessMonth,
    readinessCashRequired,
    fundedAtPurchase: isFundedAtPurchase,
    minCashBuffer,
    minCashBufferMonth,
    goesNegative: minCashBuffer < 0,
    netWorthAtYear,
    netWorthAtAge,
    retirementAtAge,
    homeEquityAtAge,
    investmentsAtAge,
    ...mortgageLife,
    endingNetWorth: last ? last.netWorth : 0,
  };
}

/**
Run every enabled scenario through the engine.
*/
export function runAllScenarios(
  assumptions: Assumptions,
  scenarios: ScenarioConfig[],
  months: number,
  grossAnnualSalary: number = SEED_SETTINGS.grossAnnualSalary,
  milestoneAges: number[] = [],
): ScenarioSummary[] {
  return scenarios
    .filter((s) => s.enabled)
    .map((s) =>
      summarizeScenario(
        assumptions,
        s,
        months,
        grossAnnualSalary,
        milestoneAges,
      ),
    );
}
