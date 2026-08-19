import type {
  Assumptions,
  JobLossAssumptions,
  ScenarioConfig,
} from "../../model/types";
import { compound, isPmiRequired, remainingBalance } from "../finance";

/**
 * ============================================================================
 *  Per-month calculation helpers.
 * ============================================================================
 *
 * These are the building blocks `runProjection` (in `../projection.ts`) calls
 * once per month inside its loop. They are module-private -- nothing outside
 * the engine should need them directly -- split out here purely to keep
 * `projection.ts` a manageable size. See the modelling-decisions comment at
 * the top of `projection.ts` for the numbered notes referenced below.
 */

/**
Resolve shared job-loss assumptions against a scenario's overrides.
*/
export function resolveJobLoss(
  base: JobLossAssumptions,
  scenario: ScenarioConfig,
): JobLossAssumptions {
  return { ...base, ...scenario.jobLossOverride };
}

/**
Is month `m` inside this scenario's job-loss window?
*/
export function isJobLossActive(
  m: number,
  scenario: ScenarioConfig,
  jl: JobLossAssumptions,
): boolean {
  if (!scenario.hasJobLoss) return false;
  if (jl.durationMonths <= 0) return false;
  return m >= jl.startMonth && m < jl.startMonth + jl.durationMonths;
}

/**
Take-home pay for month `m`, including any January-style lump bonus, both
haircut by a job loss the same way (see modelling note 1b).
*/
export function computeEmploymentIncome(
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
export function computeSecondIncome(
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
export function computeCoResidentIncome(
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
export function computeTotalExpenses(
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
export function computeHousing(
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
export function computeAssistanceOutstanding(
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
export function computeRetirementContribution(
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
export function computeHsaFlows(
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
export function applyCashSweep(
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
