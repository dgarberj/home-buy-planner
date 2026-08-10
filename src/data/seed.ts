import type {
  Assumptions,
  BalanceSnapshot,
  BudgetItem,
  ScenarioConfig,
} from '../model/types';

/**
 * ============================================================================
 *  GENERIC DEFAULTS -- no real household data belongs in this file.
 * ============================================================================
 *
 * The app opens with these figures, so there is nothing to import before it is
 * useful. They are deliberately round, invented numbers, safe to commit.
 *
 * To use your own numbers: either edit them through the app's forms (saved to
 * localStorage), or keep a personal copy of this file's shape in a gitignored
 * location and load it yourself -- never commit real balances, income or
 * family details here.
 */

/**
Bump when the figures below change; see the store's migration logic.
*/
export const SEED_VERSION = 'generic-4';

export const SEED_ASSUMPTIONS: Assumptions = {
  household: {
    primaryAge: 30,
    partnerAge: 30,
  },

  // Commitments with an end date. Derived from the dated budget lines below,
  // so keep the two in step.
  obligations: [
    { id: 'obligation-a', label: 'Fixed-term obligation A', monthlyAmount: 500, startMonth: 1, endMonth: 24 },
    { id: 'obligation-b', label: 'Fixed-term obligation B', monthlyAmount: 1_000, startMonth: 1, endMonth: 60 },
  ],

  // A relative contributing once there is room for them.
  coResident: {
    enabled: false,
    label: 'Additional household contribution',
    monthlyAmount: 0,
    requiresHomePurchase: true,
    homePricePremium: 0,
    growsWithInflation: true,
    endMonth: null,
  },

  // A second household income. OFF by default -- flip it on to see the effect.
  secondIncome: {
    enabled: false,
    label: 'Second income',
    monthlyTakeHome: 2_500,
    startMonth: 12,
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
    inflationAnnual: 0.03,
    includeHomeEquity: false,
    planToAge: 95,
    taxRateOnWithdrawal: 0.15,
  },

  income: {
    monthlyTakeHome: 7_000,
    growthAnnual: 0.03,
    annualBonusNet: 4_000,
    annualBonusMonth: 1,
    // Overwritten from the projection start date; this is just a default.
    calendarStartMonth: 8,
  },

  expenses: {
    fixedMonthly: 900,
    variableMonthly: 2_200,
    inflationAnnual: 0.03,
    currentRentMonthly: 1_800,
  },

  retirement: {
    currentBalance: 90_000,
    k401Monthly: 400,
    hsaMonthly: 500,
    hasHsaPlan: true,
    hsaCoverageTier: 'family',
    employerMatchMonthly: 400,
    employerAnnualLump: 1_500,
    employerAnnualLumpMonth: 1,

    hsaPayMedical: true,
    hsaTakeReimbursement: true,
    pauseHsaMax: false,
    hsaMedicalMonthly: 250,
    hsaReimbursement: 3_000,
    hsaReimbursementMonth: 1,
    hsaReimbursementAtPurchase: true,

    returnAnnual: 0.07,
    contributionsGrowWithIncome: true,
  },

  savings: {
    cashBalance: 25_000,
    investmentBalance: 5_000,
    cashReturnAnnual: 0.04,
    investmentReturnAnnual: 0.06,
    cashBufferMonths: 6,
  },

  home: {
    targetPrice: 350_000,
    downPaymentPct: 0.1,
    closingCostPct: 0.03,
    mortgageRateAnnual: 0.065,
    mortgageTermYears: 30,
    taxInsuranceHoaMonthly: 700,
    appreciationAnnual: 0.03,
    maintenanceAnnualPct: 0.01,
    pmiAnnualPct: 0.006,
    pmiRemovedAtLtv: 0.8,
    pmiUpfrontPct: 0,

    // Modelled on K-FIT: 5% of price, no cap, forgiven over ten years.
    assistanceEnabled: false,
    assistancePctOfPrice: 0.05,
    assistanceMaxAmount: null,
    assistanceRepayment: 'forgiven',
    assistanceTermYears: 10,
  },

  jobLoss: {
    startMonth: 18,
    durationMonths: 6,
    incomeReplacementPct: 0.4,
    expenseCutPct: 0.2,
    pauseRetirementContributions: true,
  },
};

export const SEED_BUDGET: BudgetItem[] = [
  // --- Money in -----------------------------------------------------------
  { id: 'inc-1', label: 'Paycheck A', category: 'Income', type: 'income', amount: 4_000 },
  { id: 'inc-2', label: 'Paycheck B', category: 'Income', type: 'income', amount: 3_000 },

  // --- Housing (rent disappears at the buy month) -------------------------
  { id: 'rent', label: 'Rent', category: 'Housing', type: 'fixed', amount: 1_800, isRent: true },

  // --- Fixed costs --------------------------------------------------------
  { id: 'f-health', label: 'Health insurance', category: 'Health', type: 'fixed', amount: 360 },
  { id: 'f-carins', label: 'Car insurance', category: 'Transport', type: 'fixed', amount: 130 },
  { id: 'f-rentins', label: "Renter's insurance", category: 'Housing', type: 'fixed', amount: 15 },
  { id: 'f-phone', label: 'Phone', category: 'Utilities', type: 'fixed', amount: 90 },
  { id: 'f-internet', label: 'Internet', category: 'Utilities', type: 'fixed', amount: 60 },
  { id: 'f-power', label: 'Electric & gas', category: 'Utilities', type: 'fixed', amount: 200 },
  { id: 'f-subs', label: 'Subscriptions', category: 'Lifestyle', type: 'fixed', amount: 45 },

  // --- Variable costs -----------------------------------------------------
  { id: 'v-groceries', label: 'Groceries', category: 'Food', type: 'variable', amount: 700 },
  { id: 'v-dining', label: 'Dining out', category: 'Food', type: 'variable', amount: 300 },
  { id: 'v-fuel', label: 'Fuel & transit', category: 'Transport', type: 'variable', amount: 150 },
  { id: 'v-household', label: 'Household & supplies', category: 'Home', type: 'variable', amount: 150 },
  { id: 'v-personal', label: 'Personal care', category: 'Health', type: 'variable', amount: 100 },
  { id: 'v-medical', label: 'Medical out-of-pocket', category: 'Health', type: 'variable', amount: 150 },
  { id: 'v-shopping', label: 'Shopping & clothing', category: 'Lifestyle', type: 'variable', amount: 200 },
  { id: 'v-fun', label: 'Entertainment', category: 'Lifestyle', type: 'variable', amount: 150 },
  { id: 'v-gifts', label: 'Gifts & giving', category: 'Lifestyle', type: 'variable', amount: 100 },
  { id: 'v-misc', label: 'Misc buffer', category: 'Other', type: 'variable', amount: 200 },

  // --- Commitments with an end date ---------------------------------------
  // A start or end date turns a line into an obligation: it stops inflating,
  // stops being cut during a job loss, and ends on the date you set.
  { id: 'obligation-a', label: 'Fixed-term obligation A', category: 'Debt', type: 'fixed', amount: 500, endsOn: '2028-08' },
  { id: 'obligation-b', label: 'Fixed-term obligation B', category: 'Debt', type: 'fixed', amount: 1_000, endsOn: '2031-08' },
];

export const SEED_BALANCES: BalanceSnapshot[] = [
  {
    id: 'snap-2026-08',
    date: '2026-08-01',
    checking: 0,
    savings: 25_000,
    investments: 5_000,
    retirement: 90_000,
    debt: 0,
    note: 'Starting point -- replace with your own numbers',
  },
];

export const SEED_SCENARIOS: ScenarioConfig[] = [
  { id: 'sc1', name: 'Buy early, no disruption', buyMonth: 12, hasJobLoss: false, enabled: true, color: '#2563eb' },
  { id: 'sc2', name: 'Buy early + job loss', buyMonth: 12, hasJobLoss: true, enabled: true, color: '#f97316' },
  { id: 'sc3', name: 'Buy later, no disruption', buyMonth: 36, hasJobLoss: false, enabled: true, color: '#16a34a' },
  { id: 'sc4', name: 'Keep renting', buyMonth: null, hasJobLoss: false, enabled: true, color: '#7c3aed' },
];

/**
Ages the dashboard reports net worth at.
*/
export const DEFAULT_MILESTONE_AGES = [55, 60, 65, 67, 70];

/**
The projection runs until the primary person reaches this age.
*/
export const DEFAULT_PROJECT_TO_AGE = 70;

/**
Five years -- the window the house decision actually lives in.
*/
export const SHORT_HORIZON_MONTHS = 60;

/**
 * Default horizon: far enough to see the mortgage retired and the retirement
 * accounts mature, which is the only way the buy-early question can be
 * answered honestly.
 */
export const DEFAULT_HORIZON_MONTHS =
  (DEFAULT_PROJECT_TO_AGE - SEED_ASSUMPTIONS.household.primaryAge) * 12 + 1;

/**
Non-model defaults: framing, targets and shortlists.
*/
export const SEED_SETTINGS = {
  /**
  Base salary before bonus. The 401(k) target is a share of this.
  */
  grossAnnualSalary: 90_000,
  /**
  Single or married filing jointly, for the federal marginal-rate lookup.
  */
  filingStatus: 'marriedJoint' as const,
  /**
  Biweekly. Two months a year carry three paycheques.
  */
  paychecksPerYear: 26,
  /**
  Sets the mortgage-insurance tier on a low deposit.
  */
  creditScore: 760,
  /**
  Municipalities under active consideration; ringed on the county map.
  */
  shortlist: [] as string[],
};
