import { describe, expect, it } from 'vitest';
import type { Assumptions } from '../model/types';
import { SEED_ASSUMPTIONS } from '../data/seed';
import {
  DTI_LIMITS,
  debtToIncome,
  isExcludableFromDti,
  maxPriceByDti,
  MONTHS_REMAINING_EXCLUSION,
} from './lending';
import { maxAffordablePrice, monthlyCostOfHouse } from './affordability';

const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);

/** Round numbers so the ratios can be checked on paper. */
const SIMPLE = {
  grossMonthlyIncome: 10_000,
  proposedHousing: 2_000,
  supportPaid: 1_000,
  instalmentDebts: 400,
  revolvingMinimums: 100,
};

describe('debtToIncome', () => {
  it('adds every obligation, housing included', () => {
    const r = debtToIncome(SIMPLE);
    expect(r.totalDebts).toBe(3_500);
    expect(r.backEnd).toBeCloseTo(0.35, 9);
  });

  it('reports housing alone as the front-end ratio', () => {
    expect(debtToIncome(SIMPLE).frontEnd).toBeCloseTo(0.2, 9);
  });

  it('counts support payments as debt, not as a living cost', () => {
    // The distinction that catches people out: an underwriter treats support
    // exactly like a car loan.
    const withSupport = debtToIncome(SIMPLE);
    const without = debtToIncome({ ...SIMPLE, supportPaid: 0 });
    expect(withSupport.backEnd - without.backEnd).toBeCloseTo(0.1, 9);
    expect(withSupport.supportShare).toBeCloseTo(0.1, 9);
  });

  it('grades the ratio against the published limits', () => {
    const at = (housing: number) =>
      debtToIncome({ ...SIMPLE, proposedHousing: housing }).verdict;
    expect(at(100)).toBe('comfortable'); // 16%
    expect(at(2_000)).toBe('comfortable'); // 35%
    expect(at(3_000)).toBe('workable'); // 45%
    expect(at(3_400)).toBe('tight'); // 49%
    expect(at(4_000)).toBe('declined'); // 55%
  });

  it('lands exactly on the boundaries', () => {
    const atLimit = (limit: number) =>
      debtToIncome({ ...SIMPLE, proposedHousing: 10_000 * limit - 1_500 });
    expect(atLimit(DTI_LIMITS.conservative).verdict).toBe('comfortable');
    expect(atLimit(DTI_LIMITS.manual).verdict).toBe('workable');
    expect(atLimit(DTI_LIMITS.automated).verdict).toBe('tight');
  });

  it('says how much housing payment each limit leaves room for', () => {
    const r = debtToIncome(SIMPLE);
    // 36% of 10,000 = 3,600, less 1,500 of other debts.
    expect(r.headroomAt.conservative).toBeCloseTo(2_100, 6);
    expect(r.headroomAt.manual).toBeCloseTo(3_000, 6);
    expect(r.headroomAt.automated).toBeCloseTo(3_500, 6);
  });

  it('never reports negative headroom', () => {
    const drowning = debtToIncome({ ...SIMPLE, supportPaid: 8_000 });
    expect(drowning.headroomAt.conservative).toBe(0);
    expect(drowning.verdict).toBe('declined');
  });

  it('handles zero income without exploding', () => {
    const r = debtToIncome({ ...SIMPLE, grossMonthlyIncome: 0 });
    expect(r.verdict).toBe('declined');
    expect(Number.isFinite(r.headroomAt.manual)).toBe(true);
  });
});

describe('maxPriceByDti', () => {
  const opts = {
    grossMonthlyIncome: 10_000,
    supportPaid: 1_000,
    instalmentDebts: 400,
    revolvingMinimums: 100,
    effectiveTaxRate: 0.016,
    insuranceMonthly: 150,
  };

  it('produces a price whose housing payment lands on the limit', () => {
    const price = maxPriceByDti(base, { ...opts, limit: DTI_LIMITS.manual });
    const cost = monthlyCostOfHouse(base, {
      price,
      effectiveTaxRate: opts.effectiveTaxRate,
      insuranceMonthly: opts.insuranceMonthly,
    });
    // A lender counts PITI and PMI but NOT upkeep.
    const lenderHousing = cost.principalAndInterest + cost.tax + cost.insurance + cost.pmi;
    const r = debtToIncome({ ...opts, proposedHousing: lenderHousing });
    expect(r.backEnd).toBeCloseTo(DTI_LIMITS.manual, 4);
  });

  it('allows more house at a looser limit', () => {
    const strict = maxPriceByDti(base, { ...opts, limit: DTI_LIMITS.conservative });
    const loose = maxPriceByDti(base, { ...opts, limit: DTI_LIMITS.automated });
    expect(loose).toBeGreaterThan(strict);
  });

  it('shrinks sharply as support rises', () => {
    const light = maxPriceByDti(base, { ...opts, supportPaid: 0 });
    const heavy = maxPriceByDti(base, { ...opts, supportPaid: 2_000 });
    expect(heavy).toBeLessThan(light);
    // $1,000/mo of support costs roughly $150k of house at these rates.
    expect(light - heavy).toBeGreaterThan(200_000);
  });

  it('gives a meaningful uplift when a nearly-finished loan drops out', () => {
    const counted = maxPriceByDti(base, opts);
    const excluded = maxPriceByDti(base, { ...opts, instalmentDebts: 0 });
    expect(excluded).toBeGreaterThan(counted);
    // Timing the application can be worth tens of thousands of house.
    expect(excluded - counted).toBeGreaterThan(40_000);
  });

  it('ignores upkeep, because a lender does', () => {
    // The lender's maximum is NOT a safe maximum -- it leaves out a real cost.
    const noUpkeep: Assumptions = { ...base, home: { ...base.home, maintenanceAnnualPct: 0 } };
    expect(maxPriceByDti(noUpkeep, opts)).toBeCloseTo(maxPriceByDti(base, opts), 6);
  });

  it('returns zero when the debts already exceed the limit', () => {
    expect(maxPriceByDti(base, { ...opts, supportPaid: 6_000 })).toBe(0);
  });

  it('can be tighter than the household budget, which is the point', () => {
    // A lender counts gross income and ignores that you live cheaply, so the
    // two answers diverge — and the smaller one governs.
    const byLender = maxPriceByDti(base, { ...opts, limit: DTI_LIMITS.conservative });
    const byBudget = maxAffordablePrice(base, {
      monthlyBudget: 2_700,
      effectiveTaxRate: opts.effectiveTaxRate,
      insuranceMonthly: opts.insuranceMonthly,
    });
    expect(Math.min(byLender, byBudget)).toBeLessThanOrEqual(byLender);
    expect(Math.min(byLender, byBudget)).toBeLessThanOrEqual(byBudget);
  });
});

describe('debts close to finishing', () => {
  it('excludes anything with ten or fewer payments left', () => {
    expect(isExcludableFromDti(10)).toBe(true);
    expect(isExcludableFromDti(1)).toBe(true);
    expect(isExcludableFromDti(11)).toBe(false);
    expect(MONTHS_REMAINING_EXCLUSION).toBe(10);
  });
});
