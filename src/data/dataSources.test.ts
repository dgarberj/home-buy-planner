import { describe, expect, it } from "vitest";
import { DATA_SOURCES, DataSourcesSchema } from "./dataSources";

describe("the data source registry", () => {
  it("has more than 20 entries", () => {
    expect(DATA_SOURCES.length).toBeGreaterThan(20);
  });

  it("parses the real, current registry without throwing", () => {
    expect(() => DataSourcesSchema.parse(DATA_SOURCES)).not.toThrow();
  });

  it("rejects a zero or fractional staleAfterDays", () => {
    const zero = [{ ...DATA_SOURCES[0], staleAfterDays: 0 }];
    const fractional = [{ ...DATA_SOURCES[0], staleAfterDays: 1.5 }];
    expect(() => DataSourcesSchema.parse(zero)).toThrow();
    expect(() => DataSourcesSchema.parse(fractional)).toThrow();
  });

  it("rejects a malformed fetchedAt", () => {
    const bad = [{ ...DATA_SOURCES[0], fetchedAt: "not-a-date" }];
    expect(() => DataSourcesSchema.parse(bad)).toThrow();
  });

  it("rejects a source with no URL", () => {
    const bad = [{ ...DATA_SOURCES[0], url: "not-a-url" }];
    expect(() => DataSourcesSchema.parse(bad)).toThrow();
  });
});
