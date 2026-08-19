import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { SEED_ASSUMPTIONS } from "../data/seed";
import {
  affordabilityTimeline,
  waitingVerdict,
} from "./affordability-timeline";

const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);

/**
A deliberately simple set-up so the arithmetic can be checked by hand.
*/
const SIMPLE: Assumptions = {
  ...base,
  income: { ...base.income, monthlyTakeHome: 10_000 },
  expenses: { ...base.expenses, fixedMonthly: 1_000, variableMonthly: 2_000 },
  // 400/mo at the 100,000 default `housingBudget` falls back to when a test
  // doesn't pass `grossAnnualSalary`.
  retirement: {
    ...base.retirement,
    k401Pct: 0.048,
    hsaMonthly: 600,
    iraMonthly: 0,
  },
  obligations: [
    {
      id: "a",
      label: "Obligation",
      monthlyAmount: 500,
      startMonth: 1,
      endMonth: 24,
    },
  ],
  coResident: { ...base.coResident, enabled: true, monthlyAmount: 800 },
  secondIncome: { ...base.secondIncome, enabled: false },
  home: {
    ...base.home,
    downPaymentPct: 0.2,
    mortgageRateAnnual: 0.06,
    mortgageTermYears: 30,
    maintenanceAnnualPct: 0.01,
    pmiAnnualPct: 0.0055,
    pmiRemovedAtLtv: 0.8,
  },
};

describe("affordabilityTimeline -- is it worth waiting?", () => {
  const cashTrack = Array.from(
    { length: 120 },
    (_, index) => 20_000 + index * 500,
  );
  const common = {
    effectiveTaxRate: 0.016,
    insuranceMonthly: 150,
    months: 120,
    reserveForSavings: 0,
    cashTrack,
    bufferMonthsRequired: 3,
  };

  it("returns one point per month", () => {
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
    });
    expect(t).toHaveLength(120);
    expect(t[0]?.month).toBe(1);
  });

  it("appreciates the house while you wait", () => {
    const appreciating: Assumptions = {
      ...SIMPLE,
      home: { ...SIMPLE.home, appreciationAnnual: 0.03 },
    };
    const t = affordabilityTimeline(appreciating, {
      ...common,
      medianPriceToday: 250_000,
    });
    expect(t[0]?.price).toBeCloseTo(250_000, 4);
    expect(t[12]?.price).toBeCloseTo(250_000 * 1.03, 2);
  });

  it("grows what you can carry as your pay rises", () => {
    const raising: Assumptions = {
      ...SIMPLE,
      income: { ...SIMPLE.income, growthAnnual: 0.03 },
      home: { ...SIMPLE.home, appreciationAnnual: 0 },
    };
    const t = affordabilityTimeline(raising, {
      ...common,
      medianPriceToday: 250_000,
    });
    expect(t[12]!.maxPrice).toBeGreaterThan(t[0]!.maxPrice);
  });

  it("steps the budget up sharply when a commitment ends", () => {
    // SIMPLE carries $500 of support to month 24. Freeze pay growth so the
    // step is the commitment ending and nothing else.
    const frozenPay: Assumptions = {
      ...SIMPLE,
      income: { ...SIMPLE.income, growthAnnual: 0 },
    };
    const t = affordabilityTimeline(frozenPay, {
      ...common,
      medianPriceToday: 250_000,
    });
    expect(t[24]!.monthlyBudget - t[22]!.monthlyBudget).toBeCloseTo(500, 6);
    // Which buys a meaningfully dearer house overnight.
    expect(t[24]!.maxPrice).toBeGreaterThan(t[22]!.maxPrice + 40_000);
  });

  it("lets pay growth and a commitment ending compound", () => {
    // With pay rising too, the step is larger than the commitment alone.
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
    });
    expect(t[24]!.monthlyBudget - t[22]!.monthlyBudget).toBeGreaterThan(500);
  });

  it("names the constraint that is actually binding", () => {
    // Cheap house, no cash: the deposit is the problem, not the payment.
    const poor = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 150_000,
      cashTrack: Array.from({ length: 120 }, () => 0),
    });
    expect(poor[0]?.binding).toBe("cash");

    // Mansion, plenty of cash: the payment is the problem.
    const rich = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 2_000_000,
      cashTrack: Array.from({ length: 120 }, () => 5_000_000),
    });
    expect(rich[0]?.binding).toBe("monthly payment");

    // Neither: affordable outright.
    const easy = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 150_000,
      cashTrack: Array.from({ length: 120 }, () => 500_000),
    });
    expect(easy[0]?.binding).toBe("none");
    expect(easy[0]?.affordable).toBe(true);
  });

  it("requires a buffer on top of the cash to close", () => {
    const withBuffer = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
      bufferMonthsRequired: 6,
    });
    const without = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
      bufferMonthsRequired: 0,
    });
    expect(withBuffer[0]!.cashNeeded).toBeGreaterThan(without[0]!.cashNeeded);
  });

  it("is only affordable when BOTH constraints clear", () => {
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
    });
    for (const p of t) {
      expect(p.affordable).toBe(p.monthlyGap <= 0 && p.cashGap <= 0);
    }
  });
});

describe("waitingVerdict", () => {
  const cashTrack = Array.from(
    { length: 180 },
    (_, index) => 20_000 + index * 500,
  );
  const common = {
    effectiveTaxRate: 0.016,
    insuranceMonthly: 150,
    months: 180,
    reserveForSavings: 0,
    cashTrack,
    bufferMonthsRequired: 3,
  };

  it("reports the month everything lines up", () => {
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
    });
    const v = waitingVerdict("Test", t);
    expect(v.affordableFrom).toBe(t.find((p) => p.affordable)?.month ?? null);
  });

  it("separates when the payment becomes carryable from when the cash arrives", () => {
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 250_000,
    });
    const v = waitingVerdict("Test", t);
    // Whichever comes later is what actually gates you.
    if (v.affordableFrom !== null) {
      expect(v.affordableFrom).toBe(
        Math.max(v.monthlyGapClosesAt ?? 0, v.cashReadyAt ?? 0),
      );
    }
  });

  it("says never when the house stays out of reach for the whole window", () => {
    const t = affordabilityTimeline(SIMPLE, {
      ...common,
      medianPriceToday: 5_000_000,
    });
    const v = waitingVerdict("Mansion", t);
    expect(v.affordableFrom).toBeNull();
    expect(v.monthlyGapClosesAt).toBeNull();
  });

  it("calls the gap widening when houses outrun your income", () => {
    // Prices climbing at 8% against pay at 1% -- the classic losing race.
    const losing: Assumptions = {
      ...SIMPLE,
      income: { ...SIMPLE.income, growthAnnual: 0.01 },
      home: { ...SIMPLE.home, appreciationAnnual: 0.08 },
      obligations: [],
    };
    const t = affordabilityTimeline(losing, {
      ...common,
      medianPriceToday: 600_000,
    });
    expect(waitingVerdict("Losing", t).monthlyGapTrend).toBe("widening");
  });

  it("calls it closing when your income outruns the houses", () => {
    const winning: Assumptions = {
      ...SIMPLE,
      income: { ...SIMPLE.income, growthAnnual: 0.06 },
      home: { ...SIMPLE.home, appreciationAnnual: 0.01 },
    };
    const t = affordabilityTimeline(winning, {
      ...common,
      medianPriceToday: 600_000,
    });
    expect(waitingVerdict("Winning", t).monthlyGapTrend).toBe("closing");
  });

  it("shows that saving alone cannot fix a monthly-payment problem", () => {
    // Unlimited cash, frozen income, house appreciating. No amount of waiting
    // closes a gap that is about the payment rather than the deposit.
    const frozen: Assumptions = {
      ...SIMPLE,
      income: { ...SIMPLE.income, growthAnnual: 0 },
      home: { ...SIMPLE.home, appreciationAnnual: 0.03 },
      obligations: [],
    };
    const t = affordabilityTimeline(frozen, {
      ...common,
      // Comfortably beyond what a $6,800 budget carries at any point.
      medianPriceToday: 2_000_000,
      cashTrack: Array.from({ length: 180 }, () => 10_000_000),
    });
    const v = waitingVerdict("Frozen", t);
    expect(v.cashReadyAt).toBe(1); // cash was never the issue
    expect(v.monthlyGapClosesAt).toBeNull(); // and waiting never helps
    expect(v.affordableFrom).toBeNull();
    expect(v.monthlyGapTrend).toBe("widening");
  });
});
