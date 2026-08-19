import type { Assumptions, ScenarioConfig } from "../model/types";

/**
 * A deliberately boring fixture: every growth rate is ZERO so that each month
 * can be worked out on paper. Growth is then reintroduced one rate at a time in
 * the later blocks, which is what makes these assertions meaningful rather than
 * a re-implementation of the engine.
 *
 * Baseline monthly picture (no house, no job loss):
 *   income   10,000
 *   expenses  5,000  (3,000 fixed + 2,000 variable)
 *   rent      2,000
 *   401k      1,000 employee (out of cash) + 500 match (not out of cash)
 *   -> net cash flow = 10,000 - 5,000 - 2,000 - 1,000 = +2,000 / month
 */
export const FLAT: Assumptions = {
  household: { primaryAge: 40, partnerAge: 40 },
  obligations: [],
  coResident: {
    enabled: false,
    label: "None",
    monthlyAmount: 0,
    requiresHomePurchase: true,
    homePricePremium: 0,
    growsWithInflation: true,
    endMonth: null,
  },
  secondIncome: {
    enabled: false,
    label: "Second income",
    monthlyTakeHome: 0,
    startMonth: 1,
    additionalCostsMonthly: 0,
    additionalCostsEndMonth: null,
    dependentCareFsaAnnual: 0,
    dependentCareFsaTaxRate: 0,
    growsWithIncome: true,
    affectedByJobLoss: false,
  },
  drawdown: {
    retirementAge: 65,
    withdrawalRate: 0.04,
    desiredMonthlySpendToday: 5_000,
    returnAnnual: 0.05,
    inflationAnnual: 0,
    includeHomeEquity: false,
    planToAge: 95,
    taxRateOnWithdrawal: 0,
  },
  income: {
    monthlyTakeHome: 10_000,
    growthAnnual: 0,
    annualBonusNet: 0,
    annualBonusMonth: 1,
    calendarStartMonth: 1,
  },
  expenses: {
    fixedMonthly: 3_000,
    variableMonthly: 2_000,
    inflationAnnual: 0,
    currentRentMonthly: 2_000,
  },
  retirement: {
    currentBalance: 100_000,
    // 400/mo at the default 100,000 gross salary runProjection falls back to
    // when a test doesn't pass one -- keeps this fixture's dollar amounts
    // identical to the pre-percentage figures baked into the comments below.
    k401Pct: 0.048,
    hasK401Plan: true,
    hsaMonthly: 600,
    employerMatchMonthly: 500,
    employerAnnualLump: 0,
    employerHsaAnnualBonus: 0,
    employerAnnualLumpMonth: 1,
    returnAnnual: 0,
    hsaPayMedical: true,
    hsaTakeReimbursement: true,
    pauseHsaMax: false,
    hasHsaPlan: true,
    hsaCoverageTier: "family",
    hsaMedicalMonthly: 0,
    hsaReimbursement: 0,
    hsaReimbursementMonth: 1,
    hsaReimbursementAtPurchase: false,
    iraMonthly: 0,
    hasIraPlan: false,
    contributionsGrowWithIncome: false,
  },
  // Both pools earn nothing and the buffer is generous, so cash and
  // investments behave as one pot -- which keeps the arithmetic below doable
  // on paper. The split is exercised on its own further down.
  savings: {
    cashBalance: 150_000,
    investmentBalance: 0,
    cashReturnAnnual: 0,
    investmentReturnAnnual: 0,
    cashBufferMonths: 6,
  },
  home: {
    targetPrice: 400_000,
    downPaymentPct: 0.2,
    closingCostPct: 0.03,
    mortgageRateAnnual: 0.06,
    mortgageTermYears: 30,
    taxInsuranceHoaMonthly: 800,
    appreciationAnnual: 0,
    // Off in the baseline fixture so the arithmetic stays hand-checkable;
    // both are exercised in their own blocks below.
    maintenanceAnnualPct: 0,
    pmiAnnualPct: 0,
    pmiRemovedAtLtv: 0.8,
    pmiUpfrontPct: 0,
    assistanceEnabled: false,
    assistancePctOfPrice: 0,
    assistanceMaxAmount: null,
    assistanceRepayment: "none" as const,
    assistanceTermYears: 10,
  },
  jobLoss: {
    startMonth: 13,
    durationMonths: 6,
    incomeReplacementPct: 0.4,
    expenseCutPct: 0.2,
    pauseRetirementContributions: true,
  },
};

export const RENT_FOREVER: ScenarioConfig = {
  id: "rent",
  name: "Keep renting",
  buyMonth: null,
  hasJobLoss: false,
  enabled: true,
  color: "#000",
};

export const BUY_M12: ScenarioConfig = {
  ...RENT_FOREVER,
  id: "buy12",
  name: "Buy at 12",
  buyMonth: 12,
};

/**
1-based month lookup, so tests read the way the model is described.
*/
export function at<T>(rows: T[], month: number): T {
  const row = rows[month - 1];
  if (!row) throw new Error(`no result for month ${month}`);
  return row;
}

// The hand-computed mortgage for this fixture: $320,000 at 6% over 30 years.
export const PI = 1918.5607;
