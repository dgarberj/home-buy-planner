import { describe, expect, it } from "vitest";
import type {
  Assumptions,
  MonthlyResult,
  ScenarioConfig,
} from "../model/types";
import { runProjection, summarizeScenario } from "./projection";
import {
  CASES,
  HORIZON,
  SCENARIOS,
  expectFiniteNumericFields,
  forEachCase,
} from "./invariants.fixtures";

/**
 * ============================================================================
 *  Invariants -- properties that must hold for ANY inputs (continued).
 * ============================================================================
 *
 * See `invariants.fixtures.ts` for the shared cases/scenarios these run
 * across, and `invariants.core.test.ts` for the rest of this suite
 * (balance-sheet identities, cash flow, retirement, the mortgage, the cash
 * buffer sweep, and obligations).
 */

/**
Both prices compound at the same rate from the same starting month, so the
premium's contribution scales with the no-premium value by a fixed ratio --
it never needs to be compounded separately.
*/
function expectHomeValueMatchesPremium(
  withPremium: MonthlyResult[],
  withoutPremium: MonthlyResult[],
  assumptions: Assumptions,
  label: string,
) {
  for (const [index, row] of withPremium.entries()) {
    if (!row.ownsHome) continue;
    const expectedPremium =
      withoutPremium[index]!.homeValue *
      (assumptions.coResident.homePricePremium / assumptions.home.targetPrice);
    expect(
      Math.abs(
        row.homeValue - withoutPremium[index]!.homeValue - expectedPremium,
      ),
      `${label} month ${row.month}`,
    ).toBeLessThan(1e-3);
  }
}

describe("summary totals agree with the month-by-month rows", () => {
  it("reconciles every total it reports", () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const rows = summary.months;
      const sum = (pick: (r: (typeof rows)[number]) => number) =>
        rows.reduce((accumulator, r) => accumulator + pick(r), 0);

      expect(
        Math.abs(summary.totalHousingPaid - sum((r) => r.housingPayment)),
        label,
      ).toBeLessThan(1e-6);
      expect(
        Math.abs(summary.totalMaintenancePaid - sum((r) => r.homeMaintenance)),
        label,
      ).toBeLessThan(1e-6);
      expect(
        Math.abs(summary.totalPmiPaid - sum((r) => r.pmiPayment)),
        label,
      ).toBeLessThan(1e-6);
      expect(
        Math.abs(summary.totalObligationsPaid - sum((r) => r.obligations)),
        label,
      ).toBeLessThan(1e-6);
      expect(
        Math.abs(
          summary.totalCoResidentIncome - sum((r) => r.coResidentIncome),
        ),
        label,
      ).toBeLessThan(1e-6);
      expect(summary.endingNetWorth, label).toBe(rows.at(-1)!.netWorth);
    });
  });

  it("reports a minimum buffer that actually occurs in the data", () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const actualMin = Math.min(...summary.months.map((r) => r.liquidSavings));
      expect(Math.abs(summary.minCashBuffer - actualMin), label).toBeLessThan(
        1e-6,
      );
      expect(
        summary.months[summary.minCashBufferMonth - 1]?.liquidSavings,
        label,
      ).toBeCloseTo(summary.minCashBuffer, 6);
    });
  });

  it("flags going negative exactly when it happens", () => {
    forEachCase((a, s, label) => {
      const summary = summarizeScenario(a, s, HORIZON);
      const anyNegative = summary.months.some((r) => r.liquidSavings < 0);
      expect(summary.goesNegative, label).toBe(anyNegative);
    });
  });
});

describe("down-payment assistance behaves like a lien, not a gift", () => {
  it("never owes more than was received, and never owes a negative amount", () => {
    forEachCase((a, s, label) => {
      if (!a.home.assistanceEnabled) return;
      let totalReceived = 0;
      for (const row of runProjection(a, s, HORIZON)) {
        totalReceived += row.assistanceReceived;
        expect(
          row.assistanceOutstanding,
          `${label} month ${row.month}`,
        ).toBeGreaterThanOrEqual(-1e-6);
        expect(
          row.assistanceOutstanding,
          `${label} month ${row.month}`,
        ).toBeLessThanOrEqual(totalReceived + 1e-6);
      }
    });
  });

  it("is received exactly once, on the purchase month, and never again", () => {
    forEachCase((a, s, label) => {
      if (!a.home.assistanceEnabled) return;
      const rows = runProjection(a, s, HORIZON).filter(
        (r) => r.assistanceReceived > 0,
      );
      expect(rows.length, label).toBeLessThanOrEqual(1);
      if (s.buyMonth !== null && s.buyMonth <= HORIZON) {
        expect(rows[0]?.month, label).toBe(s.buyMonth);
      }
    });
  });

  it("melts away monotonically when forgiven or amortised, but never for a deferred lien", () => {
    for (const c of CASES) {
      if (!c.assumptions.home.assistanceEnabled) continue;
      const isMelting =
        c.assumptions.home.assistanceRepayment === "forgiven" ||
        c.assumptions.home.assistanceRepayment === "amortised";
      for (const s of SCENARIOS) {
        const rows = runProjection(c.assumptions, s, HORIZON).filter(
          (r) => r.ownsHome,
        );
        for (let index = 1; index < rows.length; index++) {
          const label = `${c.name} / ${s.name} month ${rows[index]!.month}`;
          if (isMelting) {
            expect(
              rows[index]!.assistanceOutstanding,
              label,
            ).toBeLessThanOrEqual(
              rows[index - 1]!.assistanceOutstanding + 1e-6,
            );
          } else {
            expect(
              Math.abs(
                rows[index]!.assistanceOutstanding -
                  rows[index - 1]!.assistanceOutstanding,
              ),
              label,
            ).toBeLessThan(1e-6);
          }
        }
      }
    }
  });

  it("reaches zero by the end of its term when forgiven or amortised", () => {
    for (const c of CASES) {
      if (!c.assumptions.home.assistanceEnabled) continue;
      if (
        c.assumptions.home.assistanceRepayment !== "forgiven" &&
        c.assumptions.home.assistanceRepayment !== "amortised"
      )
        continue;
      const termMonths = Math.round(
        c.assumptions.home.assistanceTermYears * 12,
      );
      const buyingScenarios = SCENARIOS.filter(
        (s): s is ScenarioConfig & { buyMonth: number } => s.buyMonth !== null,
      );
      for (const s of buyingScenarios) {
        const payoffMonth = s.buyMonth + termMonths;
        if (payoffMonth <= HORIZON) {
          const rows = runProjection(c.assumptions, s, HORIZON);
          expect(
            rows[payoffMonth - 1]?.assistanceOutstanding,
            `${c.name} / ${s.name}`,
          ).toBeLessThan(1e-6);
        }
      }
    }
  });
});

describe("a co-resident gated on the purchase", () => {
  it("contributes nothing before the home is bought", () => {
    forEachCase((a, s, label) => {
      if (!a.coResident.enabled || !a.coResident.requiresHomePurchase) return;
      for (const row of runProjection(a, s, HORIZON)) {
        if (row.ownsHome) continue;
        expect(row.coResidentIncome, `${label} month ${row.month}`).toBe(0);
      }
    });
  });

  it("contributes something every month once owning, up to any end month", () => {
    forEachCase((a, s, label) => {
      if (!a.coResident.enabled || !a.coResident.requiresHomePurchase) return;
      if (a.coResident.monthlyAmount <= 0) return;
      for (const row of runProjection(a, s, HORIZON)) {
        if (!row.ownsHome) continue;
        const hasEnded =
          a.coResident.endMonth !== null && row.month > a.coResident.endMonth;
        if (hasEnded) {
          expect(row.coResidentIncome, `${label} month ${row.month}`).toBe(0);
        } else {
          expect(
            row.coResidentIncome,
            `${label} month ${row.month}`,
          ).toBeGreaterThan(0);
        }
      }
    });
  });

  it("survives a job loss unchanged", () => {
    forEachCase((a, s, label) => {
      if (!a.coResident.enabled) return;
      const withJobLoss = runProjection(a, { ...s, hasJobLoss: true }, HORIZON);
      const without = runProjection(a, { ...s, hasJobLoss: false }, HORIZON);
      for (const [index, row] of withJobLoss.entries()) {
        expect(
          Math.abs(row.coResidentIncome - without[index]!.coResidentIncome),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });

  it("makes the target house cost more, by exactly the premium, appreciated", () => {
    for (const c of CASES) {
      if (!c.assumptions.coResident.enabled) continue;
      if (c.assumptions.coResident.homePricePremium <= 0) continue;
      const without: Assumptions = {
        ...c.assumptions,
        coResident: { ...c.assumptions.coResident, enabled: false },
      };
      for (const s of SCENARIOS) {
        const withPremium = runProjection(c.assumptions, s, HORIZON);
        const withoutPremium = runProjection(without, s, HORIZON);
        expectHomeValueMatchesPremium(
          withPremium,
          withoutPremium,
          c.assumptions,
          `${c.name} / ${s.name}`,
        );
      }
    }
  });
});

describe("once the mortgage is paid off", () => {
  it("the payment drops to escrow (plus PMI, if any) and stays there", () => {
    forEachCase((a, s, label) => {
      const termMonths = Math.round(a.home.mortgageTermYears * 12);
      const rows = runProjection(a, s, HORIZON).filter((r) => r.ownsHome);
      const purchaseMonth = rows[0]?.month;
      if (purchaseMonth === undefined) return;
      const paidOffFrom = purchaseMonth + termMonths;
      for (const row of rows) {
        if (row.month < paidOffFrom) continue;
        expect(row.mortgageBalance, `${label} month ${row.month}`).toBe(0);
        expect(
          Math.abs(
            row.housingPayment -
              (a.home.taxInsuranceHoaMonthly + row.pmiPayment),
          ),
          `${label} month ${row.month}`,
        ).toBeLessThan(1e-6);
      }
    });
  });
});

describe("purity", () => {
  it("never mutates the assumptions it is given", () => {
    for (const c of CASES) {
      const before = JSON.stringify(c.assumptions);
      for (const s of SCENARIOS) summarizeScenario(c.assumptions, s, HORIZON);
      expect(JSON.stringify(c.assumptions), c.name).toBe(before);
    }
  });

  it("gives identical results on repeated runs", () => {
    forEachCase((a, s, label) => {
      const first = JSON.stringify(runProjection(a, s, 60));
      const second = JSON.stringify(runProjection(a, s, 60));
      expect(first === second, label).toBe(true);
    });
  });

  // The assertions live inside expectFiniteNumericFields, in the shared
  // fixtures module, so the linter's static scan of this test body alone
  // can't see them and flags a false positive.
  // eslint-disable-next-line sonarjs/assertions-in-tests
  it("produces a finite number for every field, in every month", () => {
    forEachCase((a, s, label) => {
      for (const row of runProjection(a, s, HORIZON)) {
        expectFiniteNumericFields(row, label);
      }
    });
  });

  it("returns exactly the number of months asked for", () => {
    forEachCase((a, s, label) => {
      for (const n of [1, 12, 61, 200]) {
        expect(runProjection(a, s, n).length, label).toBe(n);
      }
    });
  });
});
