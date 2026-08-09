import { describe, expect, it } from 'vitest';
import type { Assumptions, ScenarioConfig } from '../model/types';
import { monthlyPayment, monthlyNominal } from './finance';
import { obligationsDue, runProjection, summarizeScenario } from './projection';
import { SEED_ASSUMPTIONS } from '../data/seed';

/**
 * ============================================================================
 *  Invariants -- properties that must hold for ANY inputs.
 * ============================================================================
 *
 * The hand-computed tests elsewhere check that specific numbers come out right.
 * These check the model is internally coherent no matter what you feed it,
 * which is what catches the class of bug where two parts of the engine quietly
 * stop agreeing with each other.
 *
 * Every case below runs across a matrix of deliberately awkward inputs:
 * zero income, enormous contributions, negative cash, 100% down payments,
 * job losses that overlap the purchase, and so on.
 */

const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);

/** A spread of assumption sets designed to poke at the edges. */
const CASES: { name: string; assumptions: Assumptions }[] = [
  { name: 'seed defaults', assumptions: base },
  {
    name: 'no growth anywhere',
    assumptions: {
      ...base,
      income: { ...base.income, growthAnnual: 0 },
      expenses: { ...base.expenses, inflationAnnual: 0 },
      retirement: { ...base.retirement, returnAnnual: 0 },
      savings: { ...base.savings, cashReturnAnnual: 0, investmentReturnAnnual: 0 },
      home: { ...base.home, appreciationAnnual: 0 },
    },
  },
  {
    name: 'broke -- no cash, no investments',
    assumptions: { ...base, savings: { ...base.savings, cashBalance: 0, investmentBalance: 0 } },
  },
  {
    name: 'contributions larger than income',
    assumptions: { ...base, retirement: { ...base.retirement, employeeMonthly: 20_000 } },
  },
  {
    name: 'no income at all',
    assumptions: { ...base, income: { ...base.income, monthlyTakeHome: 0, annualBonusNet: 0 } },
  },
  {
    name: 'full cash purchase (100% down)',
    assumptions: { ...base, home: { ...base.home, downPaymentPct: 1, pmiAnnualPct: 0 } },
  },
  {
    name: 'tiny deposit with expensive PMI',
    assumptions: {
      ...base,
      home: { ...base.home, downPaymentPct: 0.03, pmiAnnualPct: 0.02, pmiUpfrontPct: 0.0175 },
    },
  },
  {
    name: 'zero-interest mortgage',
    assumptions: { ...base, home: { ...base.home, mortgageRateAnnual: 0 } },
  },
  {
    name: 'huge employer lump, no match',
    assumptions: {
      ...base,
      retirement: { ...base.retirement, employerMatchMonthly: 0, employerAnnualLump: 40_000 },
    },
  },
  {
    name: 'no emergency buffer at all',
    assumptions: { ...base, savings: { ...base.savings, cashBufferMonths: 0 } },
  },
  {
    name: 'co-resident from day one, no premium',
    assumptions: {
      ...base,
      coResident: { ...base.coResident, requiresHomePurchase: false, homePricePremium: 0 },
    },
  },
  {
    name: 'severe permanent job loss',
    assumptions: {
      ...base,
      jobLoss: {
        startMonth: 2,
        durationMonths: 200,
        incomeReplacementPct: 0,
        expenseCutPct: 0,
        pauseRetirementContributions: true,
      },
    },
  },
];

const SCENARIOS: ScenarioConfig[] = [
  { id: 'rent', name: 'Rent', buyMonth: null, hasJobLoss: false, enabled: true, color: '#000' },
  { id: 'buy1', name: 'Buy month 1', buyMonth: 1, hasJobLoss: false, enabled: true, color: '#000' },
  { id: 'buy24', name: 'Buy month 24', buyMonth: 24, hasJobLoss: false, enabled: true, color: '#000' },
  { id: 'buyjl', name: 'Buy + job loss', buyMonth: 18, hasJobLoss: true, enabled: true, color: '#000' },
];

const HORIZON = 120;

/** Run every assumption set against every scenario. */
function forEachCase(fn: (a: Assumptions, s: ScenarioConfig, label: string) => void) {
  for (const c of CASES) {
    for (const s of SCENARIOS) {
      fn(c.assumptions, s, `${c.name} / ${s.name}`);
    }
  }
}

describe('balance-sheet identities', () => {
  it('always reports liquid savings as cash plus investments', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(
          Math.abs(row.liquidSavings - (row.cashBalance + row.investmentBalance)),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it('always reports net worth as liquid plus retirement plus equity', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const expected = row.liquidSavings + row.retirementBalance + row.homeEquity;
        expect(Math.abs(row.netWorth - expected), `${label} month ${row.month}`).toBeLessThan(1e-6);
      }
    });
  });

  it('always reports home equity as value minus what is owed', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const expected = row.ownsHome ? row.homeValue - row.mortgageBalance : 0;
        expect(Math.abs(row.homeEquity - expected), `${label} month ${row.month}`).toBeLessThan(1e-6);
      }
    });
  });

  it('never shows a house, a loan or equity before the buy month', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        if (row.ownsHome) continue;
        expect(row.homeValue, label).toBe(0);
        expect(row.mortgageBalance, label).toBe(0);
        expect(row.homeEquity, label).toBe(0);
        expect(row.pmiPayment, label).toBe(0);
        expect(row.homeMaintenance, label).toBe(0);
      }
    });
  });
});

describe('cash-flow identity', () => {
  it('always equals every source of money in, less every outgoing', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const expected =
          row.netIncome +
          row.coResidentIncome +
          row.secondIncome -
          row.secondIncomeCosts +
          // Medical paid from the HSA, and any reimbursement, are spending you
          // no longer fund from cash.
          row.hsaMedicalPaid +
          row.hsaReimbursed -
          row.totalExpenses -
          row.obligations -
          row.housingPayment -
          row.homeMaintenance -
          row.employeeContribution;
        expect(Math.abs(row.netCashFlow - expected), `${label} month ${row.month}`).toBeLessThan(
          1e-6,
        );
      }
    });
  });

  it('never lets the employer contribution touch cash flow', () => {
    for (const c of CASES) {
      const withEmployer = runProjection(c.assumptions, SCENARIOS[0]!, HORIZON);
      const withoutEmployer = runProjection(
        {
          ...c.assumptions,
          retirement: {
            ...c.assumptions.retirement,
            employerMatchMonthly: 0,
            employerAnnualLump: 0,
          },
        },
        SCENARIOS[0]!,
        HORIZON,
      );
      for (let i = 0; i < withEmployer.length; i++) {
        expect(
          Math.abs(withEmployer[i]!.liquidSavings - withoutEmployer[i]!.liquidSavings),
          c.name,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it('always includes the bonus inside net income', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(row.bonusIncome, label).toBeLessThanOrEqual(row.netIncome + 1e-6);
        expect(row.bonusIncome, label).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe('the retirement balance moves only by contributions and return', () => {
  it('reconciles every month, in every case', () => {
    for (const c of CASES) {
      const monthlyReturn = Math.pow(1 + c.assumptions.retirement.returnAnnual, 1 / 12) - 1;
      for (const s of SCENARIOS) {
        const rows = runProjection(c.assumptions, s, HORIZON);
        let previous = c.assumptions.retirement.currentBalance;
        for (const row of rows) {
          // Contributions in, HSA withdrawals out. Both sides have to appear or
          // the identity silently stops holding.
          const expected =
            previous * (1 + monthlyReturn) +
            row.employeeContribution +
            row.employerContribution -
            row.hsaMedicalPaid -
            row.hsaReimbursed;
          expect(
            Math.abs(row.retirementBalance - expected),
            `${c.name} / ${s.name} month ${row.month}`,
          ).toBeLessThan(1e-6);
          previous = row.retirementBalance;
        }
      }
    }
  });

  it('never goes backwards when nothing is being drawn out of it', () => {
    forEachCase((a, s, label) => {
      if (a.retirement.returnAnnual < 0) return;
      // Drawing on the HSA legitimately shrinks the balance, so the monotonic
      // claim only holds in months with no withdrawal.
      const rows = runProjection(a, s, HORIZON);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]!;
        if (row.hsaMedicalPaid > 0 || row.hsaReimbursed > 0) continue;
        expect(row.retirementBalance, label).toBeGreaterThanOrEqual(
          rows[i - 1]!.retirementBalance - 1e-6,
        );
      }
    });
  });

  it('shrinks by exactly what is withdrawn, when a withdrawal happens', () => {
    const drawing: Assumptions = {
      ...base,
      retirement: { ...base.retirement, returnAnnual: 0, hsaMedicalMonthly: 250 },
    };
    const rows = runProjection(drawing, SCENARIOS[0]!, 24);
    for (let i = 1; i < rows.length; i++) {
      const change = rows[i]!.retirementBalance - rows[i - 1]!.retirementBalance;
      const expected =
        rows[i]!.employeeContribution + rows[i]!.employerContribution - rows[i]!.hsaMedicalPaid;
      expect(Math.abs(change - expected)).toBeLessThan(1e-6);
    }
  });
});

describe('the mortgage behaves like a mortgage', () => {
  it('never owes more than was borrowed, and never owes a negative amount', () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON);
      const purchase = rows.find((r) => r.purchaseOutflow > 0);
      if (!purchase) return;
      const originalLoan = purchase.homeValue * (1 - a.home.downPaymentPct);
      for (const row of rows) {
        expect(row.mortgageBalance, `${label} month ${row.month}`).toBeGreaterThanOrEqual(0);
        expect(row.mortgageBalance, `${label} month ${row.month}`).toBeLessThanOrEqual(
          originalLoan + 1e-6,
        );
      }
    });
  });

  it('pays the balance down monotonically once owned', () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON).filter((r) => r.ownsHome);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i]!.mortgageBalance, label).toBeLessThanOrEqual(
          rows[i - 1]!.mortgageBalance + 1e-6,
        );
      }
    });
  });

  it('charges the scheduled payment, plus escrow, plus PMI -- and nothing else', () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON);
      const purchase = rows.find((r) => r.purchaseOutflow > 0);
      if (!purchase) return;
      const loan = purchase.homeValue * (1 - a.home.downPaymentPct);
      const pi = monthlyPayment(
        loan,
        monthlyNominal(a.home.mortgageRateAnnual),
        a.home.mortgageTermYears * 12,
      );
      for (const row of rows.filter((r) => r.ownsHome)) {
        const expected = pi + a.home.taxInsuranceHoaMonthly + row.pmiPayment;
        expect(Math.abs(row.housingPayment - expected), `${label} month ${row.month}`).toBeLessThan(
          1e-6,
        );
      }
    });
  });

  it('drops PMI once, and never brings it back', () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON).filter((r) => r.ownsHome);
      let hasStopped = false;
      for (const row of rows) {
        if (row.pmiPayment === 0) hasStopped = true;
        else if (hasStopped) throw new Error(`PMI restarted in ${label} at month ${row.month}`);
      }
      expect(true).toBe(true);
    });
  });

  it('takes the purchase money out exactly once', () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON);
      const outflows = rows.filter((r) => r.purchaseOutflow > 0);
      expect(outflows.length, label).toBeLessThanOrEqual(1);
      if (s.buyMonth !== null && s.buyMonth <= HORIZON) {
        expect(outflows[0]?.month, label).toBe(s.buyMonth);
      }
    });
  });
});

describe('the cash buffer sweep', () => {
  it('never holds cash above the target while investments could take it', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const target =
          a.savings.cashBufferMonths *
          (row.totalExpenses + row.obligations + row.housingPayment + row.homeMaintenance);
        // Cash above the target is only ever swept out, never left sitting.
        expect(row.cashBalance, `${label} month ${row.month}`).toBeLessThanOrEqual(target + 1e-6);
      }
    });
  });

  it('never holds investments while cash is negative', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        if (row.cashBalance < -1e-6) {
          expect(row.investmentBalance, `${label} month ${row.month}`).toBeLessThan(1e-6);
        }
      }
    });
  });

  it('never reports negative investments', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(row.investmentBalance, `${label} month ${row.month}`).toBeGreaterThanOrEqual(-1e-6);
      }
    });
  });
});

describe('obligations are fixed, not inflated or cut', () => {
  it('always matches the schedule exactly, whatever else is happening', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(Math.abs(row.obligations - obligationsDue(a, row.month)), label).toBeLessThan(1e-9);
      }
    });
  });

  it('is unaffected by inflation or by a job loss', () => {
    const inflating: Assumptions = {
      ...base,
      expenses: { ...base.expenses, inflationAnnual: 0.2 },
    };
    const rows = runProjection(inflating, SCENARIOS[3]!, HORIZON);
    for (const row of rows) {
      expect(row.obligations).toBe(obligationsDue(inflating, row.month));
    }
  });
});

describe('summary totals agree with the month-by-month rows', () => {
  it('reconciles every total it reports', () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const rows = summary.months;
      const sum = (pick: (r: (typeof rows)[number]) => number) =>
        rows.reduce((acc, r) => acc + pick(r), 0);

      expect(Math.abs(summary.totalHousingPaid - sum((r) => r.housingPayment)), label).toBeLessThan(
        1e-6,
      );
      expect(
        Math.abs(summary.totalMaintenancePaid - sum((r) => r.homeMaintenance)),
        label,
      ).toBeLessThan(1e-6);
      expect(Math.abs(summary.totalPmiPaid - sum((r) => r.pmiPayment)), label).toBeLessThan(1e-6);
      expect(
        Math.abs(summary.totalObligationsPaid - sum((r) => r.obligations)),
        label,
      ).toBeLessThan(1e-6);
      expect(
        Math.abs(summary.totalCoResidentIncome - sum((r) => r.coResidentIncome)),
        label,
      ).toBeLessThan(1e-6);
      expect(summary.endingNetWorth, label).toBe(rows[rows.length - 1]!.netWorth);
    });
  });

  it('reports a minimum buffer that actually occurs in the data', () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const actualMin = Math.min(...summary.months.map((r) => r.liquidSavings));
      expect(Math.abs(summary.minCashBuffer - actualMin), label).toBeLessThan(1e-6);
      expect(
        summary.months[summary.minCashBufferMonth - 1]?.liquidSavings,
        label,
      ).toBeCloseTo(summary.minCashBuffer, 6);
    });
  });

  it('flags going negative exactly when it happens', () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const anyNegative = summary.months.some((r) => r.liquidSavings < 0);
      expect(summary.goesNegative, label).toBe(anyNegative);
    });
  });
});

describe('purity', () => {
  it('never mutates the assumptions it is given', () => {
    for (const c of CASES) {
      const before = JSON.stringify(c.assumptions);
      for (const s of SCENARIOS) summarizeScenario(c.assumptions, s, HORIZON);
      expect(JSON.stringify(c.assumptions), c.name).toBe(before);
    }
  });

  it('gives identical results on repeated runs', () => {
    forEachCase((a, s, label) => {
      const first = JSON.stringify(runProjection(a, s, 60));
      const second = JSON.stringify(runProjection(a, s, 60));
      expect(first === second, label).toBe(true);
    });
  });

  it('produces a finite number for every field, in every month', () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        for (const [key, value] of Object.entries(row)) {
          if (typeof value !== 'number') continue;
          expect(Number.isFinite(value), `${label} month ${row.month} field ${key}`).toBe(true);
        }
      }
    });
  });

  it('returns exactly the number of months asked for', () => {
    forEachCase((a, s, label) => {
      for (const n of [1, 12, 61, 200]) {
        expect(runProjection(a, s, n).length, label).toBe(n);
      }
    });
  });
});
