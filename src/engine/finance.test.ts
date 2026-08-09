import { describe, expect, it } from "vitest";
import {
  compound,
  monthlyGeometric,
  monthlyNominal,
  monthlyPayment,
  remainingBalance,
} from "./finance";

describe("rate conversions", () => {
  it("monthlyGeometric compounds back to the annual rate exactly", () => {
    expect(Math.pow(1 + monthlyGeometric(0.12), 12)).toBeCloseTo(1.12, 12);
    expect(Math.pow(1 + monthlyGeometric(0.07), 12)).toBeCloseTo(1.07, 12);
    expect(monthlyGeometric(0)).toBe(0);
  });

  it("monthlyGeometric is slightly below the naive annual/12", () => {
    // 12%/yr compounded monthly is 0.9489%/mo, not 1%/mo.
    expect(monthlyGeometric(0.12)).toBeCloseTo(0.00948879, 8);
    expect(monthlyGeometric(0.12)).toBeLessThan(0.12 / 12);
  });

  it("monthlyNominal follows the mortgage convention of annual / 12", () => {
    expect(monthlyNominal(0.06)).toBeCloseTo(0.005, 12);
  });

  it("compound applies the rate the given number of times", () => {
    expect(compound(1000, 0.01, 0)).toBe(1000);
    expect(compound(1000, 0.01, 1)).toBeCloseTo(1010, 10);
    expect(compound(1000, 0.01, 3)).toBeCloseTo(1030.301, 10);
  });
});

describe("monthlyPayment (PMT)", () => {
  it("matches the textbook 30-year payment on a $320,000 loan at 6%", () => {
    // Hand-computed: 320000 * 0.005 / (1 - 1.005^-360) = 1918.56
    expect(monthlyPayment(320_000, 0.005, 360)).toBeCloseTo(1918.56, 2);
  });

  it("matches a 15-year payment on a $200,000 loan at 5%", () => {
    // 200000 * (0.05/12) / (1 - (1+0.05/12)^-180) = 1581.59
    expect(monthlyPayment(200_000, 0.05 / 12, 180)).toBeCloseTo(1581.59, 2);
  });

  it("spreads a 0% loan evenly with no divide-by-zero", () => {
    expect(monthlyPayment(1200, 0, 12)).toBe(100);
  });

  it("is zero for an empty or nonexistent loan", () => {
    expect(monthlyPayment(0, 0.005, 360)).toBe(0);
    expect(monthlyPayment(320_000, 0.005, 0)).toBe(0);
  });
});

describe("remainingBalance", () => {
  const L = 320_000;
  const r = 0.005;
  const n = 360;

  it("is the full principal before any payment", () => {
    expect(remainingBalance(L, r, n, 0)).toBe(L);
  });

  it("matches a hand-computed balance after one payment", () => {
    // 320000 * 1.005 - 1918.5607 = 319,681.44
    expect(remainingBalance(L, r, n, 1)).toBeCloseTo(319_681.44, 2);
  });

  it("agrees with a month-by-month interest/principal simulation", () => {
    // Independent check: walk the amortisation schedule the long way round.
    const payment = monthlyPayment(L, r, n);
    let balance = L;
    for (let k = 1; k <= 120; k++) {
      const interest = balance * r;
      balance = balance + interest - payment;
      expect(remainingBalance(L, r, n, k)).toBeCloseTo(balance, 6);
    }
  });

  it("is fully paid off at the end of the term", () => {
    expect(remainingBalance(L, r, n, n)).toBe(0);
    expect(remainingBalance(L, r, n, n + 24)).toBe(0);
  });

  it("never reports a negative balance", () => {
    expect(remainingBalance(L, r, n, 359)).toBeGreaterThanOrEqual(0);
  });

  it("handles a 0% loan linearly", () => {
    expect(remainingBalance(1200, 0, 12, 3)).toBeCloseTo(900, 10);
  });
});
