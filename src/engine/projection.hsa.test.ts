import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { runProjection, summarizeScenario } from "./projection";
import { at, BUY_M12, FLAT, RENT_FOREVER } from "./projection.test-helpers";

describe("drawing on the HSA rather than hoarding it", () => {
  const spendIt: Assumptions = {
    ...FLAT,
    retirement: { ...FLAT.retirement, hsaMedicalMonthly: 300 },
  };
  const reimburse: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      hsaReimbursement: 3_000,
      hsaReimbursementMonth: 1,
    },
  };

  it("turns monthly medical spending into cash flow", () => {
    const rows = runProjection(spendIt, RENT_FOREVER, 24);
    expect(at(rows, 1).hsaMedicalPaid).toBe(300);
    expect(at(rows, 1).netCashFlow).toBeCloseTo(2_000 + 300, 6);
  });

  it("takes it straight out of the retirement balance", () => {
    const rows = runProjection(spendIt, RENT_FOREVER, 24);
    const plain = runProjection(FLAT, RENT_FOREVER, 24);
    expect(at(rows, 1).retirementBalance).toBeCloseTo(
      at(plain, 1).retirementBalance - 300,
      6,
    );
  });

  it("lands the reimbursement at closing when tied to the purchase", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const rows = runProjection(atPurchase, BUY_M12, 24);
    expect(at(rows, 12).hsaReimbursed).toBe(6_000);
    expect(at(rows, 1).hsaReimbursed).toBe(0);
    expect(rows.filter((r) => r.hsaReimbursed > 0)).toHaveLength(1);
  });

  it("follows the buy month as the scenario changes", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const later = runProjection(atPurchase, { ...BUY_M12, buyMonth: 30 }, 40);
    expect(at(later, 30).hsaReimbursed).toBe(6_000);
    expect(at(later, 12).hsaReimbursed).toBe(0);
  });

  it("never takes the reimbursement in a scenario that never buys", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const renting = runProjection(atPurchase, RENT_FOREVER, 60);
    expect(renting.every((r) => r.hsaReimbursed === 0)).toBe(true);
  });

  it("arrives in time to help with the cash needed at closing", () => {
    // The whole point of timing it to the purchase.
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const withIt = runProjection(atPurchase, BUY_M12, 24);
    const without = runProjection(FLAT, BUY_M12, 24);
    expect(
      at(withIt, 12).liquidSavings - at(without, 12).liquidSavings,
    ).toBeCloseTo(6_000, 6);
  });

  it("lands a one-off reimbursement in the month you choose", () => {
    const rows = runProjection(reimburse, RENT_FOREVER, 24);
    expect(at(rows, 1).hsaReimbursed).toBe(3_000);
    expect(at(rows, 2).hsaReimbursed).toBe(0);
    expect(at(rows, 1).liquidSavings).toBeCloseTo(
      at(runProjection(FLAT, RENT_FOREVER, 24), 1).liquidSavings + 3_000,
      6,
    );
  });

  it("is a straight transfer -- net worth is unchanged the month it happens", () => {
    // The money moves from one pocket to another. Only the compounding differs.
    const rows = runProjection(reimburse, RENT_FOREVER, 1);
    const plain = runProjection(FLAT, RENT_FOREVER, 1);
    expect(at(rows, 1).netWorth).toBeCloseTo(at(plain, 1).netWorth, 6);
  });

  it("costs long-run growth, because the HSA compounds faster than cash", () => {
    const growing: Assumptions = {
      ...reimburse,
      retirement: { ...reimburse.retirement, returnAnnual: 0.07 },
      savings: {
        ...FLAT.savings,
        cashReturnAnnual: 0.04,
        investmentReturnAnnual: 0.04,
      },
    };
    const kept: Assumptions = {
      ...growing,
      retirement: { ...growing.retirement, hsaReimbursement: 0 },
    };
    const a = summarizeScenario(growing, RENT_FOREVER, 240);
    const b = summarizeScenario(kept, RENT_FOREVER, 240);
    expect(a.endingNetWorth).toBeLessThan(b.endingNetWorth);
  });

  it("never draws more than the HSA actually holds", () => {
    const overdrawn: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        currentBalance: 500,
        hsaReimbursement: 50_000,
      },
    };
    const rows = runProjection(overdrawn, RENT_FOREVER, 12);
    expect(at(rows, 1).retirementBalance).toBeGreaterThanOrEqual(0);
    expect(at(rows, 1).hsaReimbursed).toBeLessThan(50_000);
  });

  it("does nothing at all when both are left at zero", () => {
    const a = runProjection(FLAT, RENT_FOREVER, 24);
    for (const row of a) {
      expect(row.hsaMedicalPaid).toBe(0);
      expect(row.hsaReimbursed).toBe(0);
    }
  });
});

describe("the HSA levers switch cleanly on and off", () => {
  const drawing: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      hsaMedicalMonthly: 300,
      hsaReimbursement: 6_000,
      hsaReimbursementAtPurchase: true,
    },
  };

  it("pays no medical from the HSA when the toggle is off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaPayMedical: false },
    };
    const rows = runProjection(off, BUY_M12, 24);
    expect(rows.every((r) => r.hsaMedicalPaid === 0)).toBe(true);
  });

  it("takes no reimbursement when that toggle is off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaTakeReimbursement: false },
    };
    const rows = runProjection(off, BUY_M12, 24);
    expect(rows.every((r) => r.hsaReimbursed === 0)).toBe(true);
  });

  it("switches each independently of the other", () => {
    const medicalOnly: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaTakeReimbursement: false },
    };
    const rows = runProjection(medicalOnly, BUY_M12, 24);
    expect(at(rows, 12).hsaMedicalPaid).toBe(300);
    expect(at(rows, 12).hsaReimbursed).toBe(0);
  });

  it("returns to the untouched baseline with both off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: {
        ...drawing.retirement,
        hsaPayMedical: false,
        hsaTakeReimbursement: false,
      },
    };
    expect(JSON.stringify(runProjection(off, BUY_M12, 24))).toBe(
      JSON.stringify(runProjection(FLAT, BUY_M12, 24)),
    );
  });
});

describe("diverting the HSA to the deposit", () => {
  const diverted: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      pauseHsaMax: true,
    },
  };

  it("lowers what goes into retirement each month", () => {
    const rows = runProjection(diverted, RENT_FOREVER, 24);
    expect(at(rows, 1).employeeContribution).toBeCloseTo(400, 9);
    expect(
      at(runProjection(FLAT, RENT_FOREVER, 24), 1).employeeContribution,
    ).toBe(1_000);
  });

  it("puts the difference straight into cash flow", () => {
    const rows = runProjection(diverted, RENT_FOREVER, 24);
    const plain = runProjection(FLAT, RENT_FOREVER, 24);
    expect(at(rows, 1).netCashFlow - at(plain, 1).netCashFlow).toBeCloseTo(
      600,
      6,
    );
  });

  it("builds the buffer faster, which is the whole point", () => {
    const a = summarizeScenario(diverted, RENT_FOREVER, 60);
    const b = summarizeScenario(FLAT, RENT_FOREVER, 60);
    expect(at(a.months, 24).liquidSavings).toBeGreaterThan(
      at(b.months, 24).liquidSavings,
    );
  });

  it("costs long-run retirement, which is the price", () => {
    const a = summarizeScenario(diverted, RENT_FOREVER, 240);
    const b = summarizeScenario(FLAT, RENT_FOREVER, 240);
    expect(a.months[239]!.retirementBalance).toBeLessThan(
      b.months[239]!.retirementBalance,
    );
  });

  it("does nothing when switched off", () => {
    const off: Assumptions = {
      ...diverted,
      retirement: { ...diverted.retirement, pauseHsaMax: false },
    };
    expect(JSON.stringify(runProjection(off, RENT_FOREVER, 24))).toBe(
      JSON.stringify(runProjection(FLAT, RENT_FOREVER, 24)),
    );
  });
});
