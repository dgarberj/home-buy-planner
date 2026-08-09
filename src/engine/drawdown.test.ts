import { describe, expect, it } from 'vitest';
import type { Assumptions, ScenarioConfig } from '../model/types';
import { requiredPortfolio, runDrawdown } from './drawdown';
import { runProjection } from './projection';

/**
 * Same trick as the projection tests: every rate is zero so the arithmetic can
 * be checked on paper, then rates are reintroduced one at a time.
 *
 * Baseline, renting forever with no growth anywhere:
 *   retirement grows 1,500/mo  -> 100,000 + 301 * 1,500 = 551,500 at month 301
 *   liquid grows     2,000/mo  -> 150,000 + 301 * 2,000 = 752,000 at month 301
 *   pot at 65                  -> 1,303,500
 */
const FLAT: Assumptions = {
  household: { primaryAge: 40, partnerAge: 40 },
  obligations: [],
  coResident: {
    enabled: false,
    label: 'None',
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
    desiredMonthlySpendToday: 5_000,
    returnAnnual: 0,
    inflationAnnual: 0,
    includeHomeEquity: false,
    planToAge: 95,
  },
  income: { monthlyTakeHome: 10_000, growthAnnual: 0, annualBonusNet: 0, annualBonusMonth: 1, calendarStartMonth: 1 },
  expenses: {
    fixedMonthly: 3_000,
    variableMonthly: 2_000,
    inflationAnnual: 0,
    currentRentMonthly: 2_000,
  },
  retirement: {
    currentBalance: 100_000,
    employeeMonthly: 1_000,
    employerMatchMonthly: 500,
    employerAnnualLump: 0,
    employerAnnualLumpMonth: 1,
    returnAnnual: 0,
    hsaPayMedical: true,
    hsaTakeReimbursement: true,
    pauseHsaMax: false,
    pausedEmployeeMonthly: 0,
    hsaMedicalMonthly: 0,
    hsaReimbursement: 0,
    hsaReimbursementMonth: 1,
    hsaReimbursementAtPurchase: false,
    contributionsGrowWithIncome: false,
  },
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
    maintenanceAnnualPct: 0,
    pmiAnnualPct: 0,
    pmiRemovedAtLtv: 0.8,
    pmiUpfrontPct: 0,
    assistanceEnabled: false,
    assistancePctOfPrice: 0,
    assistanceMaxAmount: null,
    assistanceRepayment: 'none' as const,
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

const RENT: ScenarioConfig = {
  id: 'rent',
  name: 'Keep renting',
  buyMonth: null,
  hasJobLoss: false,
  enabled: true,
  color: '#000',
};

/** Age 65 is month 301 when you are 40 today. */
const RETIREMENT_MONTH = 301;
const POT = 1_303_500;

const project = (a: Assumptions = FLAT, months = RETIREMENT_MONTH) =>
  runProjection(a, RENT, months);

describe('runDrawdown -- the pot at retirement', () => {
  it('finds the month the primary person retires', () => {
    const r = runDrawdown(project(), FLAT);
    expect(r.retirementMonth).toBe(RETIREMENT_MONTH);
  });

  it('adds up retirement accounts and liquid savings', () => {
    const r = runDrawdown(project(), FLAT);
    expect(r.retirementAccountsAtRetirement).toBeCloseTo(551_500, 4);
    expect(r.liquidAtRetirement).toBeCloseTo(752_000, 4);
    expect(r.portfolioAtRetirement).toBeCloseTo(POT, 4);
  });

  it('leaves the house out of the pot by default', () => {
    const owner = runProjection(FLAT, { ...RENT, buyMonth: 12 }, RETIREMENT_MONTH);
    const r = runDrawdown(owner, FLAT);
    expect(r.homeEquityAtRetirement).toBeGreaterThan(0);
    expect(r.portfolioAtRetirement).toBeCloseTo(
      r.retirementAccountsAtRetirement + r.liquidAtRetirement,
      4,
    );
  });

  it('counts the house when told to', () => {
    const owner = runProjection(FLAT, { ...RENT, buyMonth: 12 }, RETIREMENT_MONTH);
    const withHouse: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, includeHomeEquity: true },
    };
    const r = runDrawdown(owner, withHouse);
    expect(r.portfolioAtRetirement).toBeCloseTo(
      r.retirementAccountsAtRetirement + r.liquidAtRetirement + r.homeEquityAtRetirement,
      4,
    );
  });

  it('gives up gracefully when retirement is outside the projection', () => {
    const r = runDrawdown(project(FLAT, 60), FLAT);
    expect(r.retirementMonth).toBeNull();
    expect(r.portfolioAtRetirement).toBe(0);
    expect(r.track).toHaveLength(0);
  });
});

describe('runDrawdown -- the withdrawal-rate view', () => {
  it('applies the withdrawal rate to the pot', () => {
    const r = runDrawdown(project(), FLAT);
    // 4% of 1,303,500
    expect(r.sustainableAnnualIncome).toBeCloseTo(52_140, 4);
  });

  it('scales with the withdrawal rate', () => {
    const cautious: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, withdrawalRate: 0.03 },
    };
    const r = runDrawdown(project(), cautious);
    expect(r.sustainableAnnualIncome).toBeCloseTo(POT * 0.03, 4);
  });

  it('compares it against the spending you actually want', () => {
    const r = runDrawdown(project(), FLAT);
    expect(r.desiredAnnualSpendAtRetirement).toBeCloseTo(60_000, 4);
    expect(r.annualShortfall).toBeCloseTo(60_000 - 52_140, 4);
    expect(r.meetsTargetAtWithdrawalRate).toBe(false);
  });

  it('reports meeting the target when the pot is big enough', () => {
    const modest: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, desiredMonthlySpendToday: 3_000 },
    };
    const r = runDrawdown(project(), modest);
    expect(r.annualShortfall).toBeLessThan(0);
    expect(r.meetsTargetAtWithdrawalRate).toBe(true);
  });

  it('translates the sustainable income back into today’s money', () => {
    const inflating: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, inflationAnnual: 0.03 },
    };
    const r = runDrawdown(project(), inflating);
    // 25 years of 3% inflation between now and retirement.
    const factor = Math.pow(1.03, 25);
    expect(r.sustainableAnnualIncomeToday).toBeCloseTo(r.sustainableAnnualIncome / factor, 4);
    expect(r.sustainableAnnualIncomeToday).toBeLessThan(r.sustainableAnnualIncome);
  });

  it('inflates the spending target to the retirement year', () => {
    const inflating: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, inflationAnnual: 0.03 },
    };
    const r = runDrawdown(project(), inflating);
    expect(r.desiredAnnualSpendAtRetirement).toBeCloseTo(60_000 * Math.pow(1.03, 25), 4);
  });
});

describe('runDrawdown -- the simulation view', () => {
  it('runs the money down at the spending rate and reports when it ends', () => {
    const r = runDrawdown(project(), FLAT);
    // 1,303,500 at 5,000 a month with no growth: 261 months, so age 86.75.
    expect(r.depletionAge).toBeCloseTo(65 + 261 / 12, 6);
    expect(r.balanceAtPlanEnd).toBe(0);
    expect(r.yearsOfIncome).toBeCloseTo(261 / 12, 6);
  });

  it('lasts the whole plan when spending is low enough', () => {
    const modest: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, desiredMonthlySpendToday: 2_000 },
    };
    const r = runDrawdown(project(), modest);
    expect(r.depletionAge).toBeNull();
    // 30 years at 24,000 a year, no growth.
    expect(r.balanceAtPlanEnd).toBeCloseTo(POT - 360 * 2_000, 4);
    expect(r.yearsOfIncome).toBe(30);
  });

  it('lasts longer when the portfolio keeps earning', () => {
    const growing: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, returnAnnual: 0.05 },
    };
    const flat = runDrawdown(project(), FLAT);
    const grown = runDrawdown(project(), growing);
    expect(grown.yearsOfIncome).toBeGreaterThan(flat.yearsOfIncome);
  });

  it('never runs out at all once returns outpace the spending', () => {
    // 5% on 1,303,500 is 65,190 a year against 60,000 of spending, so the
    // balance grows rather than drains -- the classic 4%-rule situation.
    const growing: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, returnAnnual: 0.05 },
    };
    const r = runDrawdown(project(), growing);
    expect(r.depletionAge).toBeNull();
    expect(r.balanceAtPlanEnd).toBeGreaterThan(POT);
    expect(r.yearsOfIncome).toBe(30);
  });

  it('runs out sooner when spending inflates', () => {
    const inflating: Assumptions = {
      ...FLAT,
      // Same starting spend in today's money, but rising each year.
      drawdown: { ...FLAT.drawdown, inflationAnnual: 0.03, desiredMonthlySpendToday: 2_000 },
    };
    const level: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, desiredMonthlySpendToday: 2_000 },
    };
    const a = runDrawdown(project(), inflating);
    const b = runDrawdown(project(), level);
    expect(a.balanceAtPlanEnd).toBeLessThan(b.balanceAtPlanEnd);
  });

  it('records one track point per year of the plan', () => {
    const r = runDrawdown(project(), FLAT);
    expect(r.track).toHaveLength(30);
    expect(r.track[0]?.age).toBe(66);
    expect(r.track[29]?.age).toBe(95);
    // Never reports a negative balance, even after the money is gone.
    expect(r.track.every((t) => t.balance >= 0)).toBe(true);
  });

  it('never withdraws more than is left', () => {
    const r = runDrawdown(project(), FLAT);
    const totalWithdrawn = r.track.reduce((sum, t) => sum + t.withdrawal, 0);
    expect(totalWithdrawn).toBeLessThan(POT + 1);
  });

  it('is unaffected by how the pot was accumulated, only by its size', () => {
    // Two different routes to retirement, same drawdown maths.
    const r = runDrawdown(project(), FLAT);
    expect(r.portfolioAtRetirement * FLAT.drawdown.withdrawalRate).toBeCloseTo(
      r.sustainableAnnualIncome,
      6,
    );
  });
});

describe('requiredPortfolio', () => {
  it('is the spending target divided by the withdrawal rate', () => {
    // 60,000 a year at 4% needs 1.5m.
    expect(requiredPortfolio(FLAT, FLAT.drawdown, 25)).toBeCloseTo(1_500_000, 4);
  });

  it('grows with inflation between now and retirement', () => {
    const inflating: Assumptions = {
      ...FLAT,
      drawdown: { ...FLAT.drawdown, inflationAnnual: 0.03 },
    };
    expect(requiredPortfolio(inflating, inflating.drawdown, 25)).toBeCloseTo(
      (60_000 * Math.pow(1.03, 25)) / 0.04,
      4,
    );
  });

  it('is unreachable when the withdrawal rate is zero', () => {
    const zero: Assumptions = { ...FLAT, drawdown: { ...FLAT.drawdown, withdrawalRate: 0 } };
    expect(requiredPortfolio(zero, zero.drawdown, 25)).toBe(Infinity);
  });
});
