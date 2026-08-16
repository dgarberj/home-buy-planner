import { describe, expect, it } from "vitest";
import { CONFIG, ConfigSchema } from "./config";

describe("centralized application config", () => {
  it("exposes the data source registry", () => {
    expect(CONFIG.dataSources.length).toBeGreaterThan(20);
  });

  it("parses the real, current config without throwing", () => {
    expect(() => ConfigSchema.parse(CONFIG)).not.toThrow();
  });

  it("rejects a zero or fractional staleAfterDays", () => {
    const zero = {
      dataSources: [{ ...CONFIG.dataSources[0], staleAfterDays: 0 }],
    };
    const fractional = {
      dataSources: [{ ...CONFIG.dataSources[0], staleAfterDays: 1.5 }],
    };
    expect(() => ConfigSchema.parse(zero)).toThrow();
    expect(() => ConfigSchema.parse(fractional)).toThrow();
  });

  it("rejects a malformed fetchedAt", () => {
    const bad = {
      dataSources: [{ ...CONFIG.dataSources[0], fetchedAt: "not-a-date" }],
    };
    expect(() => ConfigSchema.parse(bad)).toThrow();
  });

  it("rejects a source with no URL", () => {
    const bad = {
      dataSources: [{ ...CONFIG.dataSources[0], url: "not-a-url" }],
    };
    expect(() => ConfigSchema.parse(bad)).toThrow();
  });

  it("has no cost defaults -- those live in costDefaults.ts, not here", () => {
    // config.ts is fixed application policy the user shouldn't tune;
    // user-adjustable defaults (insurance estimate, savings reserve, etc.)
    // live separately in costDefaults.ts. See that file's header comment.
    expect("cost" in CONFIG).toBe(false);
  });
});
