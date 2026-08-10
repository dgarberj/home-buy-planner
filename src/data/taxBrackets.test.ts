import { describe, expect, it } from "vitest";
import {
  FEDERAL_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  federalTaxOn,
  marginalRate,
} from "./taxBrackets";

describe("federalTaxOn", () => {
  it("charges nothing on zero or negative taxable income", () => {
    expect(federalTaxOn(0, "single")).toBe(0);
    expect(federalTaxOn(-500, "single")).toBe(0);
  });

  it("taxes fully within the first bracket at that bracket's rate", () => {
    expect(federalTaxOn(10_000, "single")).toBeCloseTo(1_000, 6);
  });

  it("walks multiple brackets rather than applying one flat rate", () => {
    // 12,400 at 10% + (50,400-12,400) at 12% + (60,000-50,400) at 22%.
    const expected = 12_400 * 0.1 + (50_400 - 12_400) * 0.12 + (60_000 - 50_400) * 0.22;
    expect(federalTaxOn(60_000, "single")).toBeCloseTo(expected, 6);
  });

  it("handles income landing exactly on a bracket boundary", () => {
    const upTo = FEDERAL_BRACKETS_2026.single[0]!.upTo;
    expect(federalTaxOn(upTo, "single")).toBeCloseTo(upTo * 0.1, 6);
  });

  it("married-filing-jointly brackets are wider than single at the same income", () => {
    expect(federalTaxOn(90_000, "marriedJoint")).toBeLessThan(
      federalTaxOn(90_000, "single"),
    );
  });
});

describe("marginalRate", () => {
  it("returns the bottom rate for income entirely inside the standard deduction", () => {
    expect(marginalRate(STANDARD_DEDUCTION_2026.single, "single")).toBe(0.1);
  });

  it("returns the top rate for very high income", () => {
    expect(marginalRate(10_000_000, "single")).toBe(0.37);
  });

  it("moving from single to married, at the same gross, does not raise the rate", () => {
    const gross = 150_000;
    expect(marginalRate(gross, "marriedJoint")).toBeLessThanOrEqual(
      marginalRate(gross, "single"),
    );
  });
});
