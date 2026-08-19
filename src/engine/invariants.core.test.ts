import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { monthlyPayment, monthlyNominal } from "./finance";
import { obligationsDue, runProjection } from "./projection";
import {
  base,
  CASES,
  HORIZON,
  SCENARIOS,
  forEachCase,
} from "./invariants.fixtures";

/**
 * ============================================================================
 *  Invariants -- properties that must hold for ANY inputs.
 * ============================================================================
 *
 * See `invariants.fixtures.ts` for the shared cases/scenarios these run
 * across, and `invariants.summary.test.ts` for the rest of this suite
 * (summary totals, down-payment assistance, the gated co-resident, mortgage
 * payoff, and purity).
 */

describe("balance-sheet identities", () => {
  it("always reports liquid savings as cash plus investments", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(
          Math.abs(
            row.liquidSavings - (row.cashBalance + row.investmentBalance),
          ),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("always reports net worth as liquid plus retirement plus equity", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const expected =
          row.liquidSavings + row.retirementBalance + row.homeEquity;
        expect(
          Math.abs(row.netWorth - expected),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("always reports home equity as value minus mortgage minus any assistance lien", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const expected = row.ownsHome
          ? row.homeValue - row.mortgageBalance - row.assistanceOutstanding
          : 0;
        expect(
          Math.abs(row.homeEquity - expected),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("never shows a house, a loan or equity before the buy month", () => {
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

describe("cash-flow identity", () => {
  it("always equals every source of money in, less every outgoing", () => {
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
        expect(
          Math.abs(row.netCashFlow - expected),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("never lets the employer contribution touch cash flow", () => {
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
      for (const [index, element] of withEmployer.entries()) {
        expect(
          Math.abs(
            element!.liquidSavings - withoutEmployer[index]!.liquidSavings,
          ),
          c.name,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it("always includes the bonus inside net income", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(row.bonusIncome, label).toBeLessThanOrEqual(
          row.netIncome + 1e-6,
        );
        expect(row.bonusIncome, label).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe("the retirement balance moves only by contributions and return", () => {
  it("reconciles every month, in every case", () => {
    for (const c of CASES) {
      const monthlyReturn =
        Math.pow(1 + c.assumptions.retirement.returnAnnual, 1 / 12) - 1;
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

  it("never goes backwards when nothing is being drawn out of it", () => {
    forEachCase((a, s, label) => {
      if (a.retirement.returnAnnual < 0) return;
      // Drawing on the HSA legitimately shrinks the balance, so the monotonic
      // claim only holds in months with no withdrawal.
      const rows = runProjection(a, s, HORIZON);
      for (let index = 1; index < rows.length; index++) {
        const row = rows[index]!;
        if (row.hsaMedicalPaid > 0 || row.hsaReimbursed > 0) continue;
        expect(row.retirementBalance, label).toBeGreaterThanOrEqual(
          rows[index - 1]!.retirementBalance - 1e-6,
        );
      }
    });
  });

  it("shrinks by exactly what is withdrawn, when a withdrawal happens", () => {
    const drawing: Assumptions = {
      ...base,
      retirement: {
        ...base.retirement,
        returnAnnual: 0,
        hsaMedicalMonthly: 250,
      },
    };
    const rows = runProjection(drawing, SCENARIOS[0]!, 24);
    for (let index = 1; index < rows.length; index++) {
      const change =
        rows[index]!.retirementBalance - rows[index - 1]!.retirementBalance;
      const expected =
        rows[index]!.employeeContribution +
        rows[index]!.employerContribution -
        rows[index]!.hsaMedicalPaid;
      expect(Math.abs(change - expected)).toBeLessThan(1e-6);
    }
  });
});

describe("the mortgage behaves like a mortgage", () => {
  it("never owes more than was borrowed, and never owes a negative amount", () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON);
      const purchase = rows.find((r) => r.purchaseOutflow > 0);
      if (!purchase) return;
      const originalLoan = purchase.homeValue * (1 - a.home.downPaymentPct);
      for (const row of rows) {
        expect(
          row.mortgageBalance,
          `${label} month ${row.month}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          row.mortgageBalance,
          `${label} month ${row.month}`,
        ).toBeLessThanOrEqual(originalLoan + 1e-6);
      }
    });
  });

  it("pays the balance down monotonically once owned", () => {
    forEachCase((a, s, label) => {
      const rows = runProjection(a, s, HORIZON).filter((r) => r.ownsHome);
      for (let index = 1; index < rows.length; index++) {
        expect(rows[index]!.mortgageBalance, label).toBeLessThanOrEqual(
          rows[index - 1]!.mortgageBalance + 1e-6,
        );
      }
    });
  });

  it("charges the scheduled payment, plus escrow, plus PMI -- and nothing else, until paid off", () => {
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
      const termMonths = Math.round(a.home.mortgageTermYears * 12);
      const ownedRows = rows.filter((r) => r.ownsHome);
      for (const row of ownedRows) {
        const paymentsMade = row.month - purchase.month + 1;
        const isStillRepaying = paymentsMade <= termMonths;
        const expected =
          (isStillRepaying ? pi : 0) +
          a.home.taxInsuranceHoaMonthly +
          row.pmiPayment;
        expect(
          Math.abs(row.housingPayment - expected),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("drops PMI once, and never brings it back", () => {
    forEachCase((a, s, label) => {
      const allRows = runProjection(a, s, HORIZON);
      const rows = allRows.filter((r) => r.ownsHome);
      let hasStopped = false;
      for (const row of rows) {
        if (row.pmiPayment === 0) hasStopped = true;
        else if (hasStopped)
          throw new Error(`PMI restarted in ${label} at month ${row.month}`);
      }
      expect(allRows).toHaveLength(HORIZON);
    });
  });

  it("takes the purchase money out exactly once", () => {
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

describe("the cash buffer sweep", () => {
  it("never holds cash above the target while investments could take it", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        const target =
          a.savings.cashBufferMonths *
          (row.totalExpenses +
            row.obligations +
            row.housingPayment +
            row.homeMaintenance);
        // Cash above the target is only ever swept out, never left sitting.
        expect(
          row.cashBalance,
          `${label} month ${row.month}`,
        ).toBeLessThanOrEqual(target + 1e-6);
      }
    });
  });

  it("never holds investments while cash is negative", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        if (row.cashBalance < -1e-6) {
          expect(
            row.investmentBalance,
            `${label} month ${row.month}`,
          ).toBeLessThan(1e-6);
        }
      }
    });
  });

  it("never reports negative investments", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(
          row.investmentBalance,
          `${label} month ${row.month}`,
        ).toBeGreaterThanOrEqual(-1e-6);
      }
    });
  });
});

describe("obligations are fixed, not inflated or cut", () => {
  it("always matches the schedule exactly, whatever else is happening", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expect(
          Math.abs(row.obligations - obligationsDue(a, row.month)),
          label,
        ).toBeLessThan(1e-9);
      }
    });
  });

  it("is unaffected by inflation or by a job loss", () => {
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
