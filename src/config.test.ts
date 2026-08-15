import { describe, expect, it } from "vitest";
import { CONFIG, ConfigSchema } from "./config";

describe("centralized application config", () => {
  it("validates and exposes the staleness thresholds from the ADR", () => {
    expect(CONFIG.staleness.homeSalesDays).toBe(365);
    expect(CONFIG.staleness.crimeDays).toBe(365 * 3);
    expect(CONFIG.staleness.schoolsDays).toBe(365 * 3);
    expect(CONFIG.staleness.climateDays).toBe(365 * 10);
  });

  it("parses the real, current config without throwing", () => {
    expect(() => ConfigSchema.parse(CONFIG)).not.toThrow();
  });

  it("rejects a zero or fractional staleness threshold", () => {
    const zero = {
      ...CONFIG,
      staleness: { ...CONFIG.staleness, homeSalesDays: 0 },
    };
    const fractional = {
      ...CONFIG,
      staleness: { ...CONFIG.staleness, homeSalesDays: 1.5 },
    };
    expect(() => ConfigSchema.parse(zero)).toThrow();
    expect(() => ConfigSchema.parse(fractional)).toThrow();
  });

  it("has no cost defaults -- those live in costDefaults.ts, not here", () => {
    // config.ts is fixed application policy the user shouldn't tune;
    // user-adjustable defaults (insurance estimate, savings reserve, etc.)
    // live separately in costDefaults.ts. See that file's header comment.
    expect("cost" in CONFIG).toBe(false);
  });
});
