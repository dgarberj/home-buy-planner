import type { FilingStatus } from "./taxBrackets";

/**
 * Contribution limits and household targets.
 *
 * Kept apart from the market data because these need revisiting every January,
 * when the IRS publishes the new numbers.
 *
 * Source: IRS Notice 2026-05 (2026 HSA and HDHP limits), cross-checked against
 * Fidelity and SHRM summaries, August 2026. IRA figures and Roth phase-outs
 * from irs.gov, "401(k) limit increases to $24,500 for 2026, IRA limit
 * increases to $7,500," August 2026.
 */

export const HSA_LIMITS = {
  selfOnly2026: 4_400,
  family2026: 8_750,
  /**
  Extra allowance from age 55, if not enrolled in Medicare.
  */
  catchUp55: 1_000,
  hdhpMinDeductibleFamily: 3_400,
  hdhpMaxOutOfPocketFamily: 17_000,
};

/**
401(k) employee elective deferral limit, 2026.
*/
export const K401_LIMITS = {
  employeeDeferral2026: 24_500,
  catchUp50: 8_000,
};

/**
IRA contribution limit (Roth or traditional, combined), 2026.
*/
export const IRA_LIMITS = {
  contribution2026: 7_500,
  catchUp50: 1_100,
};

/**
Roth IRA MAGI phase-out range, 2026: full room below `start`, zero at/above
`end`, linear in between.
*/
export const ROTH_PHASEOUT_2026: Record<
  FilingStatus,
  { start: number; end: number }
> = {
  single: { start: 153_000, end: 168_000 },
  marriedJoint: { start: 242_000, end: 252_000 },
};

/**
 * The household's own contribution structure.
 *
 * The subtlety worth spelling out: the HSA family limit counts EMPLOYER AND
 * EMPLOYEE money together. An employer seed does not sit on top of the limit,
 * it eats into your own room. Getting that backwards means over-contributing
 * and paying a penalty.
 */
export const RETIREMENT_TARGETS = {
  /**
   * Stage-2 priority target: employee 401(k) contribution PLUS the
   * recurring employer match, combined, as a share of gross salary. The
   * January profit-share lump does not count toward this -- it is
   * discretionary employer money, not something to plan a contribution
   * election around.
   */
  combinedK401TargetPct: 0.1,
  /**
  Employer's monthly 401(k) match, as a share of gross salary.
  */
  employerMatchPct: 0.045,
  /**
  Employer's once-a-year 401(k) contribution, as a share of gross salary.
  */
  employerAnnual401kPct: 0.015,
  /**
  Employer's once-a-year HSA seed, in dollars.
  */
  employerAnnualHsaSeed: 1_000,
  /**
  Fund the HSA to the family limit, counting the employer seed towards it.
  */
  maxOutHsa: true,
  /**
  Calendar month the employer's annual contributions land.
  */
  employerLumpMonth: 1,
};

/**
 * Your own HSA room once the employer seed is counted against the limit.
 *
 * The limit depends on HDHP coverage tier (self-only vs. family), not filing
 * status -- a married couple can carry self-only coverage and a single
 * person can carry family coverage. `coverage` defaults to `"family"` to
 * match this household's plan.
 */
export function employeeHsaRoom(
  coverage: "selfOnly" | "family" = "family",
  employerSeed: number = RETIREMENT_TARGETS.employerAnnualHsaSeed,
): number {
  const limit =
    coverage === "selfOnly" ? HSA_LIMITS.selfOnly2026 : HSA_LIMITS.family2026;
  return Math.max(0, limit - employerSeed);
}

/**
 * Max Roth IRA contribution room at a given MAGI, phased out linearly across
 * the IRS range and floored at $0 above it.
 */
export function rothIraRoom(magi: number, filingStatus: FilingStatus): number {
  const { start, end } = ROTH_PHASEOUT_2026[filingStatus];
  if (magi <= start) return IRA_LIMITS.contribution2026;
  if (magi >= end) return 0;
  const phaseFraction = (magi - start) / (end - start);
  return Math.round(IRA_LIMITS.contribution2026 * (1 - phaseFraction));
}
