import { describe, expect, it } from "vitest";
import type { Assumptions, ScenarioConfig } from "../model/types";
import { runAllScenarios, summarizeScenario } from "./projection";
import { BUY_M12, FLAT, RENT_FOREVER } from "./projection.test-helpers";

describe("summarizeScenario", () => {
  const saving: Assumptions = {
    ...FLAT,
    savings: { ...FLAT.savings, cashBalance: 50_000 },
  };

  it("finds the first month the down payment is fully funded", () => {
    // Needs 92,000. Cash is 50,000 + 2,000 * m, so month 21 is the first to clear.
    const s = summarizeScenario(saving, RENT_FOREVER, 60);
    expect(s.readinessMonth).toBe(21);
    expect(s.readinessCashRequired).toBeCloseTo(92_000, 6);
  });

  it("measures readiness independently of the scenario’s own purchase", () => {
    // Buying at month 12 drains the account, but the question "when could we
    // afford it" still has the same answer.
    const s = summarizeScenario(saving, { ...BUY_M12 }, 60);
    expect(s.readinessMonth).toBe(21);
  });

  it("reports not-on-track when the horizon runs out first", () => {
    const tight: Assumptions = {
      ...saving,
      expenses: { ...FLAT.expenses, variableMonthly: 4_000 }, // net cash flow now 0
    };
    const s = summarizeScenario(tight, RENT_FOREVER, 60);
    expect(s.readinessMonth).toBeNull();
  });

  it("flags a purchase that the model cannot actually fund", () => {
    const s = summarizeScenario(saving, BUY_M12, 60);
    expect(s.fundedAtPurchase).toBe(false);
    expect(s.goesNegative).toBe(true);
    expect(s.minCashBuffer).toBeLessThan(0);
    expect(s.minCashBufferMonth).toBe(12);
  });

  it("confirms a purchase the model can fund", () => {
    const s = summarizeScenario(FLAT, BUY_M12, 60);
    expect(s.fundedAtPurchase).toBe(true);
    expect(s.goesNegative).toBe(false);
    expect(s.minCashBuffer).toBeCloseTo(81_281.44, 2);
    expect(s.minCashBufferMonth).toBe(12);
  });

  it("puts the minimum buffer at the bottom of a deep job-loss dip", () => {
    // A total income stop with no belt-tightening: -7,000 a month for a year.
    const severe: Assumptions = {
      ...FLAT,
      jobLoss: {
        ...FLAT.jobLoss,
        durationMonths: 12,
        incomeReplacementPct: 0,
        expenseCutPct: 0,
      },
    };
    const s = summarizeScenario(
      severe,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    // Cash peaks at 174,000 in month 12, then drains through month 24.
    expect(s.minCashBufferMonth).toBe(24);
    expect(s.minCashBuffer).toBeCloseTo(174_000 - 12 * 7_000, 6);
    expect(s.goesNegative).toBe(false);
  });

  it("reports the starting balance as the buffer when we only ever save", () => {
    // A mild disruption that never digs below where we started is not a buffer
    // event: the thinnest cash moment is still month 1.
    const s = summarizeScenario(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(s.minCashBufferMonth).toBe(1);
    expect(s.minCashBuffer).toBeCloseTo(152_000, 6);
    // ...but the job-loss trough is still visible in the month-by-month data.
    const trough = s.months[17];
    expect(trough?.liquidSavings).toBeCloseTo(162_000, 6);
  });

  it("reports net worth at years 1, 3 and 5", () => {
    const s = summarizeScenario(FLAT, RENT_FOREVER, 60);
    expect(s.netWorthAtYear[1]).toBeCloseTo(174_000 + 118_000, 6);
    expect(s.netWorthAtYear[3]).toBeCloseTo(
      150_000 + 36 * 2_000 + 100_000 + 36 * 1_500,
      6,
    );
    expect(s.netWorthAtYear[5]).toBeCloseTo(s.endingNetWorth, 9);
  });

  it("omits year markers beyond a shorter horizon", () => {
    const s = summarizeScenario(FLAT, RENT_FOREVER, 24);
    expect(s.netWorthAtYear[1]).toBeDefined();
    expect(s.netWorthAtYear[3]).toBeUndefined();
  });
});

describe("runAllScenarios", () => {
  const scenarios: ScenarioConfig[] = [
    BUY_M12,
    { ...RENT_FOREVER, id: "off", name: "Hidden", enabled: false },
  ];

  it("runs only the enabled scenarios", () => {
    const out = runAllScenarios(FLAT, scenarios, 60);
    expect(out).toHaveLength(1);
    expect(out[0]?.scenarioId).toBe("buy12");
    expect(out[0]?.months).toHaveLength(60);
  });

  it("is pure: repeated runs give identical results", () => {
    const a = runAllScenarios(FLAT, scenarios, 60);
    const b = runAllScenarios(FLAT, scenarios, 60);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("does not mutate the assumptions it is given", () => {
    const snapshot = JSON.stringify(FLAT);
    runAllScenarios(FLAT, scenarios, 60);
    expect(JSON.stringify(FLAT)).toBe(snapshot);
  });
});
