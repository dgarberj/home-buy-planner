import { describe, expect, it } from "vitest";
import { clusterForHash } from "./clusters";

describe("clusterForHash", () => {
  it("defaults to setup for an empty hash", () => {
    expect(clusterForHash("")).toBe("setup");
  });

  it("maps a known section id to its cluster", () => {
    expect(clusterForHash("#detail")).toBe("results");
  });

  it("never treats a share hash as a section id", () => {
    expect(clusterForHash("#share=abc123")).toBe("setup");
  });

  it("falls back to setup for an unknown id", () => {
    expect(clusterForHash("#nonexistent")).toBe("setup");
  });
});
