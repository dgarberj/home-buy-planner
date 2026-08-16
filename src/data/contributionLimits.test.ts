import { describe, expect, it } from "vitest";
import { IRA_LIMITS, ROTH_PHASEOUT_2026, rothIraRoom } from "./contributionLimits";

describe("rothIraRoom", () => {
  it("gives the full limit below the phase-out range", () => {
    expect(rothIraRoom(100_000, "single")).toBe(IRA_LIMITS.contribution2026);
    expect(rothIraRoom(200_000, "marriedJoint")).toBe(
      IRA_LIMITS.contribution2026,
    );
  });

  it("zeroes out at or above the top of the phase-out range", () => {
    expect(rothIraRoom(ROTH_PHASEOUT_2026.single.end, "single")).toBe(0);
    expect(rothIraRoom(200_000, "single")).toBe(0);
    expect(
      rothIraRoom(ROTH_PHASEOUT_2026.marriedJoint.end, "marriedJoint"),
    ).toBe(0);
  });

  it("phases down linearly across the range", () => {
    const { start, end } = ROTH_PHASEOUT_2026.single;
    const midpoint = (start + end) / 2;
    expect(rothIraRoom(midpoint, "single")).toBeCloseTo(
      IRA_LIMITS.contribution2026 / 2,
      -1,
    );
  });

  it("uses the married-filing-jointly range for that filing status", () => {
    const { start } = ROTH_PHASEOUT_2026.marriedJoint;
    expect(rothIraRoom(start - 1, "marriedJoint")).toBe(
      IRA_LIMITS.contribution2026,
    );
    expect(rothIraRoom(start + 1, "marriedJoint")).toBeLessThan(
      IRA_LIMITS.contribution2026,
    );
  });
});
