import type { Assumptions, BalanceSnapshot, BudgetItem, ScenarioConfig } from '../model/types';

/**
 * ============================================================================
 *  TEMPLATE -- documents the shape `seed.ts` expects.
 * ============================================================================
 *
 * Both this file and `seed.ts` are tracked in git and must stay generic --
 * see CLAUDE.md's "Personal reports" section. Real household numbers go
 * through the app's own forms (saved to localStorage) or a gitignored file,
 * never into either of these.
 *
 *  PLACEHOLDER DATA -- THESE ARE NOT REAL NUMBERS.
 * Deliberately round, obviously-invented figures so this file is safe to commit.
 */

/**
Bump when the figures below change; see seed.ts for why.
*/
export const SEED_VERSION = 'example';

export const SEED_ASSUMPTIONS: Assumptions = {
  household: {
    // PLACEHOLDER AGES -- set these to your real ones; every retirement
    // milestone on the dashboard is measured from primaryAge.
    primaryAge: 32,
    partnerAge: 30,
  },
  // Fixed commitments with an end date. These are DERIVED from any budget line
  // that has a start or end month, so keep the two in step.
  obligations: [
    { id: 'o1', label: 'Fixed-term obligation A', monthlyAmount: 1000, startMonth: 1, endMonth: 24 },
    { id: 'o2', label: 'Fixed-term obligation B', monthlyAmount: 800, startMonth: 25, endMonth: 84 },
  ],
  // A relative moving in, if you buy somewhere with room for them.
  coResident: {
    enabled: false,
    label: 'Additional household contribution',
    monthlyAmount: 0,
    requiresHomePurchase: true,
    homePricePremium: 0,
    growsWithInflation: true,
    endMonth: null,
  },
  secondIncome: {
    enabled: false,
    label: 'Second income',
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
    desiredMonthlySpendToday: 6000,
    // Deliberately lower than the accumulation return: portfolios usually get
    // more conservative once you are living off them.
    returnAnnual: 0.05,
    inflationAnnual: 0.03,
    includeHomeEquity: false,
    planToAge: 95,
  },
  income: {
    monthlyTakeHome: 9000,
    growthAnnual: 0.03,
    annualBonusNet: 0,
    annualBonusMonth: 1,
    calendarStartMonth: 1,
  },
  expenses: {
    fixedMonthly: 970,
    variableMonthly: 2680,
    inflationAnnual: 0.03,
    currentRentMonthly: 2200,
  },
  retirement: {
    currentBalance: 120000,
    employeeMonthly: 1000,
    employerMatchMonthly: 400,
    employerAnnualLump: 0,
    employerAnnualLumpMonth: 1,
    returnAnnual: 0.07,
    hsaPayMedical: true,
    hsaTakeReimbursement: true,
    pauseHsaMax: false,
    pausedEmployeeMonthly: 0,
    hsaMedicalMonthly: 0,
    hsaReimbursement: 0,
    hsaReimbursementMonth: 1,
    hsaReimbursementAtPurchase: false,
    contributionsGrowWithIncome: true,
  },
  savings: {
    cashBalance: 53000,
    investmentBalance: 11000,
    cashReturnAnnual: 0.04,
    investmentReturnAnnual: 0.06,
    cashBufferMonths: 6,
  },
  home: {
    targetPrice: 500000,
    downPaymentPct: 0.2,
    closingCostPct: 0.03,
    mortgageRateAnnual: 0.065,
    mortgageTermYears: 30,
    taxInsuranceHoaMonthly: 900,
    appreciationAnnual: 0.03,
    // 1%/yr of home value is the common rule of thumb for upkeep.
    maintenanceAnnualPct: 0.01,
    // Only bites below a 20% down payment; drops off at 80% loan-to-value.
    pmiAnnualPct: 0.006,
    pmiRemovedAtLtv: 0.8,
    // Conventional loans charge nothing upfront; FHA charges 1.75%.
    pmiUpfrontPct: 0,
    assistanceEnabled: false,
    assistancePctOfPrice: 0,
    assistanceMaxAmount: null,
    assistanceRepayment: 'none' as const,
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
  { id: 'b01', label: 'Paycheck A (net)', category: 'Income', type: 'income', amount: 5500 },
  { id: 'b02', label: 'Paycheck B (net)', category: 'Income', type: 'income', amount: 3500 },

  // --- Housing (rent is flagged: it disappears at the buy month) -----------
  { id: 'b03', label: 'Rent', category: 'Housing', type: 'fixed', amount: 2200, isRent: true },

  // --- Fixed costs --------------------------------------------------------
  { id: 'b05', label: 'Car insurance', category: 'Transport', type: 'fixed', amount: 160 },
  { id: 'b06', label: 'Health insurance', category: 'Health', type: 'fixed', amount: 250 },
  { id: 'b07', label: "Renter's insurance", category: 'Housing', type: 'fixed', amount: 20 },
  { id: 'b08', label: 'Phone', category: 'Utilities', type: 'fixed', amount: 110 },
  { id: 'b09', label: 'Internet', category: 'Utilities', type: 'fixed', amount: 70 },
  { id: 'b10', label: 'Electric & gas', category: 'Utilities', type: 'fixed', amount: 160 },
  { id: 'b11', label: 'Water & trash', category: 'Utilities', type: 'fixed', amount: 60 },
  { id: 'b13', label: 'Streaming & subscriptions', category: 'Lifestyle', type: 'fixed', amount: 80 },
  { id: 'b14', label: 'Gym', category: 'Health', type: 'fixed', amount: 60 },

  // --- Fixed commitments with an end date ---------------------------------
  // Giving a line a start or end month turns it into an obligation: it stops
  // inflating and stops being cut during a job loss. PLACEHOLDER dates.
  {
    id: 'b27',
    label: 'Fixed-term obligation A',
    category: 'Debt',
    type: 'fixed',
    amount: 1000,
    endsOn: '2028-01',
  },
  {
    id: 'b28',
    label: 'Fixed-term obligation B',
    category: 'Debt',
    type: 'fixed',
    amount: 800,
    startsOn: '2028-02',
    endsOn: '2033-01',
  },

  // --- Variable costs -----------------------------------------------------
  { id: 'b15', label: 'Groceries', category: 'Food', type: 'variable', amount: 800 },
  { id: 'b16', label: 'Dining out & coffee', category: 'Food', type: 'variable', amount: 400 },
  { id: 'b17', label: 'Fuel & transit', category: 'Transport', type: 'variable', amount: 180 },
  { id: 'b18', label: 'Household & supplies', category: 'Home', type: 'variable', amount: 120 },
  { id: 'b19', label: 'Personal care', category: 'Health', type: 'variable', amount: 80 },
  { id: 'b20', label: 'Medical out-of-pocket', category: 'Health', type: 'variable', amount: 100 },
  { id: 'b21', label: 'Pets', category: 'Home', type: 'variable', amount: 80 },
  { id: 'b22', label: 'Shopping & clothing', category: 'Lifestyle', type: 'variable', amount: 250 },
  { id: 'b23', label: 'Entertainment', category: 'Lifestyle', type: 'variable', amount: 120 },
  { id: 'b24', label: 'Gifts & giving', category: 'Lifestyle', type: 'variable', amount: 100 },
  { id: 'b25', label: 'Travel fund', category: 'Lifestyle', type: 'variable', amount: 300 },
  { id: 'b26', label: 'Misc buffer', category: 'Other', type: 'variable', amount: 150 },
];

export const SEED_BALANCES: BalanceSnapshot[] = [
  {
    id: 's1',
    date: '2026-06-01',
    checking: 8000,
    savings: 40000,
    investments: 10000,
    retirement: 114000,
    debt: 0,
    note: 'Example snapshot -- replace with real numbers',
  },
  {
    id: 's2',
    date: '2026-08-01',
    checking: 9000,
    savings: 44000,
    investments: 11000,
    retirement: 120000,
    debt: 0,
    note: 'Example snapshot -- replace with real numbers',
  },
];

export const SEED_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'sc1',
    name: 'Buy Early, No Disruption',
    buyMonth: 12,
    hasJobLoss: false,
    enabled: true,
    color: '#2563eb',
  },
  {
    id: 'sc2',
    name: 'Buy Early + Job Loss',
    buyMonth: 12,
    hasJobLoss: true,
    enabled: true,
    color: '#f97316',
  },
  {
    id: 'sc3',
    name: 'Buy Later, No Disruption',
    buyMonth: 36,
    hasJobLoss: false,
    enabled: true,
    color: '#16a34a',
  },
  {
    id: 'sc4',
    name: 'Buy Later + Job Loss',
    buyMonth: 36,
    hasJobLoss: true,
    enabled: true,
    color: '#dc2626',
  },
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
  grossAnnualSalary: 100_000,
  paychecksPerYear: 26,
  creditScore: 740,
  shortlist: [] as string[],
};
