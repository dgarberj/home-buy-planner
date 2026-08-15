import { describe, expect, it } from "vitest";
import { COST_DEFAULTS } from "./costDefaults";

describe("user-adjustable cost defaults", () => {
  it("has plausible values for every default", () => {
    expect(COST_DEFAULTS.flatMonthlyInsuranceUsd).toBeGreaterThan(0);
    expect(COST_DEFAULTS.defaultReserveForSavingsUsd).toBeGreaterThanOrEqual(0);
    expect(COST_DEFAULTS.typicalEffectiveTaxRate).toBeGreaterThan(0);
    expect(COST_DEFAULTS.typicalEffectiveTaxRate).toBeLessThan(1);
    expect(COST_DEFAULTS.valueScoreReferencePriceUsd).toBeGreaterThan(0);
  });

  it("is not wrapped in the Zod-validated app config -- it is a plain object", () => {
    // Deliberately not schema-validated; see the file's header for why. This
    // just documents the shape stays a plain object, not a parsed schema.
    expect(COST_DEFAULTS.constructor).toBe(Object);
  });
});
