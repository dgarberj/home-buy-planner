import { describe, expect, it } from "vitest";
import { baseData, deepMerge, migrateSaved, seedData } from "./migrate";
import { SEED_VERSION } from "../data/seed";

/**
 * These exist because of a real bug: a saved localStorage payload written
 * against an older shape replaced the whole assumptions tree, every
 * `assumptions.household.primaryAge` in the UI threw, and the app rendered a
 * blank white page. Anything that reads old saved data gets tested.
 */

/**
Roughly what version 1 of the app wrote to localStorage.
*/
const V1_SAVE = {
  assumptions: {
    income: { monthlyTakeHome: 7_777, growthAnnual: 0.04 },
    expenses: {
      fixedMonthly: 1_111,
      variableMonthly: 2_222,
      inflationAnnual: 0.025,
      currentRentMonthly: 1_900,
    },
    retirement: {
      currentBalance: 55_555,
      employeeMonthly: 800,
      employerMatchMonthly: 300,
      returnAnnual: 0.06,
    },
    // The old single-pool shape.
    savings: { currentBalance: 33_333, returnAnnual: 0.045 },
    home: {
      targetPrice: 450_000,
      downPaymentPct: 0.15,
      closingCostPct: 0.03,
      mortgageRateAnnual: 0.061,
      mortgageTermYears: 30,
      taxInsuranceHoaMonthly: 700,
      appreciationAnnual: 0.028,
    },
    jobLoss: {
      startMonth: 20,
      durationMonths: 4,
      incomeReplacementPct: 0.5,
      expenseCutPct: 0.15,
      pauseRetirementContributions: false,
    },
  },
  budget: [
    {
      id: "x",
      label: "Old line",
      category: "Food",
      type: "variable",
      amount: 123,
    },
  ],
  balances: [],
  scenarios: [
    {
      id: "a",
      name: "Old scenario",
      buyMonth: 18,
      hasJobLoss: false,
      enabled: true,
      color: "#123456",
    },
  ],
  settings: {
    horizonMonths: 60,
    startDate: "2026-01",
    useBudgetTotals: false,
    useLatestBalances: false,
  },
};

describe("deepMerge", () => {
  it("fills in keys the saved data never had", () => {
    const out = deepMerge({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 9 } });
    expect(out).toEqual({ a: 1, b: { c: 9, d: 3 } });
  });

  it("prefers the saved value wherever there is one", () => {
    expect(deepMerge({ a: 1 }, { a: 5 })).toEqual({ a: 5 });
  });

  it("ignores undefined rather than blanking a default", () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
  });

  it("replaces arrays wholesale instead of merging them index by index", () => {
    expect(deepMerge({ xs: [1, 2, 3] }, { xs: [9] })).toEqual({ xs: [9] });
  });

  it("falls back to the defaults when there is nothing saved", () => {
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });
});

describe("migrateSaved -- base data (seed + local override) is the source of truth", () => {
  it("replaces saved state written against an older seed", () => {
    // The whole point: editing seed.ts (or the local override file) must
    // actually show up in the app, even on a machine that already has saved
    // state.
    const stale = { ...V1_SAVE, seedVersion: "something-older" };
    const out = migrateSaved(stale);
    expect(out.assumptions.income.monthlyTakeHome).toBe(
      baseData().assumptions.income.monthlyTakeHome,
    );
    expect(out.assumptions.expenses.currentRentMonthly).toBe(
      baseData().assumptions.expenses.currentRentMonthly,
    );
    expect(out.seedVersion).toBe(SEED_VERSION);
  });

  it("replaces saved state that predates versioning entirely", () => {
    const out = migrateSaved(V1_SAVE); // no seedVersion key at all
    expect(out.assumptions.income.monthlyTakeHome).toBe(
      baseData().assumptions.income.monthlyTakeHome,
    );
  });

  it("keeps your edits when the seed has not changed", () => {
    const current = {
      ...V1_SAVE,
      seedVersion: SEED_VERSION,
    };
    const out = migrateSaved(current);
    expect(out.assumptions.income.monthlyTakeHome).toBe(7_777);
    expect(out.assumptions.expenses.currentRentMonthly).toBe(1_900);
    expect(out.budget[0]?.label).toBe("Old line");
    expect(out.scenarios[0]?.name).toBe("Old scenario");
    expect(out.settings.horizonMonths).toBe(60);
  });

  it("stamps fresh seed data with the current version", () => {
    expect(seedData().seedVersion).toBe(SEED_VERSION);
  });
});

describe("migrateSaved -- filling in a same-version payload", () => {
  const out = migrateSaved({ ...V1_SAVE, seedVersion: SEED_VERSION });

  it("keeps every value the user had actually set", () => {
    expect(out.assumptions.income.monthlyTakeHome).toBe(7_777);
    expect(out.assumptions.retirement.currentBalance).toBe(55_555);
    expect(out.assumptions.home.targetPrice).toBe(450_000);
    expect(out.assumptions.jobLoss.startMonth).toBe(20);
  });

  it("supplies the sections that did not exist yet", () => {
    // These are exactly what the blank-page crash was reading.
    expect(out.assumptions.household).toBeDefined();
    expect(typeof out.assumptions.household.primaryAge).toBe("number");
    expect(Array.isArray(out.assumptions.obligations)).toBe(true);
    expect(out.assumptions.drawdown).toBeDefined();
    expect(typeof out.assumptions.drawdown.retirementAge).toBe("number");
  });

  it("supplies newer home fields without touching the saved ones", () => {
    expect(out.assumptions.home.maintenanceAnnualPct).toBeDefined();
    expect(out.assumptions.home.pmiAnnualPct).toBeDefined();
    expect(out.assumptions.home.pmiUpfrontPct).toBeDefined();
    expect(out.assumptions.home.mortgageRateAnnual).toBe(0.061);
  });

  it("carries the old single savings pool into the new split one", () => {
    expect(out.assumptions.savings.cashBalance).toBe(33_333);
    expect(out.assumptions.savings.investmentBalance).toBe(0);
    expect(out.assumptions.savings.cashReturnAnnual).toBe(0.045);
    expect(out.assumptions.savings.investmentReturnAnnual).toBe(0.045);
    expect(out.assumptions.savings.cashBufferMonths).toBeDefined();
  });

  it("supplies newer settings the old save never wrote", () => {
    expect(Array.isArray(out.settings.milestoneAges)).toBe(true);
    expect(out.settings.milestoneAges.length).toBeGreaterThan(0);
    expect(typeof out.settings.grossAnnualSalary).toBe("number");
    expect(typeof out.settings.paychecksPerYear).toBe("number");
  });

  it("supplies the retirement contribution-growth flag", () => {
    expect(typeof out.assumptions.retirement.contributionsGrowWithIncome).toBe(
      "boolean",
    );
  });
});

describe("migrateSaved -- junk input", () => {
  it("returns the seed data when there is nothing saved", () => {
    expect(migrateSaved(undefined).assumptions.household).toBeDefined();
    expect(migrateSaved(null).budget.length).toBeGreaterThan(0);
  });

  it("survives a payload that is not an object at all", () => {
    expect(migrateSaved("nonsense").assumptions.household).toBeDefined();
    expect(migrateSaved(42).scenarios.length).toBeGreaterThan(0);
  });

  it("forces arrays back to arrays when the save had rubbish in them", () => {
    const out = migrateSaved({
      seedVersion: SEED_VERSION,
      assumptions: { obligations: "not an array" },
      budget: null,
      balances: "nope",
      scenarios: 7,
      settings: { milestoneAges: {} },
    });
    expect(Array.isArray(out.assumptions.obligations)).toBe(true);
    expect(Array.isArray(out.budget)).toBe(true);
    expect(Array.isArray(out.balances)).toBe(true);
    expect(Array.isArray(out.scenarios)).toBe(true);
    expect(Array.isArray(out.settings.milestoneAges)).toBe(true);
  });

  it("handles a half-written assumptions tree", () => {
    const out = migrateSaved({
      seedVersion: SEED_VERSION,
      assumptions: { income: { monthlyTakeHome: 5_000 } },
    });
    expect(out.assumptions.income.monthlyTakeHome).toBe(5_000);
    expect(out.assumptions.income.growthAnnual).toBeDefined();
    expect(out.assumptions.expenses).toBeDefined();
    expect(out.assumptions.household).toBeDefined();
  });

  it("never hands back a shape the app cannot render", () => {
    // Every field the components dereference without a guard.
    for (const junk of [
      undefined,
      null,
      {},
      "x",
      0,
      [],
      { assumptions: null },
    ]) {
      const out = migrateSaved(junk);
      expect(typeof out.assumptions.household.primaryAge).toBe("number");
      expect(typeof out.assumptions.drawdown.retirementAge).toBe("number");
      expect(typeof out.assumptions.savings.cashBalance).toBe("number");
      expect(Array.isArray(out.assumptions.obligations)).toBe(true);
      expect(typeof out.settings.grossAnnualSalary).toBe("number");
    }
  });

  it("does not mutate the seed defaults between calls", () => {
    const a = migrateSaved({
      seedVersion: SEED_VERSION,
      assumptions: { income: { monthlyTakeHome: 1 } },
    });
    const b = seedData();
    expect(a.assumptions.income.monthlyTakeHome).toBe(1);
    expect(b.assumptions.income.monthlyTakeHome).not.toBe(1);
  });
});
