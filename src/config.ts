import { z } from "zod";

/**
 * ============================================================================
 *  Centralized, validated APPLICATION policy.
 * ============================================================================
 *
 * This file is for numbers the application itself is opinionated about --
 * not something a user should be able to dial in from a settings panel. The
 * staleness thresholds are the model case: docs/adr/0001-stale-data-threshold.md
 * decided that a home sale over a year old is not trustworthy market signal,
 * full stop. That is a data-integrity policy, not a preference.
 *
 * Cost-estimate defaults (a flat insurance guess, a default savings reserve,
 * the "typical" tax rate used before a specific town is known) used to live
 * here too, but they are exactly the kind of number a user might reasonably
 * want to override, so they moved to costDefaults.ts -- plain, unvalidated
 * constants, not locked behind Zod the way policy is here. See that file's
 * header for the distinction.
 *
 * This is also NOT the place for sourced reference data with its own
 * citation -- IRS contribution limits (contributionLimits.ts), Fannie Mae
 * DTI limits (engine/lending.ts), county millage (localMarket.ts) and the
 * like stay where they are, each with the provenance comment that belongs
 * next to it.
 *
 * Validated with Zod so a nonsensical edit (a threshold of zero or a
 * fractional number of days) fails immediately and loudly at import time, in
 * every environment (dev, test, build), rather than surfacing later as a
 * silently wrong number on screen.
 */

const positiveInt = z.number().int().positive();

export const ConfigSchema = z.object({
  /**
   * Staleness thresholds, in days, per docs/adr/0001-stale-data-threshold.md.
   * Data older than its category's threshold must not be presented as
   * trustworthy -- see src/data/freshness.ts for the enforcement.
   */
  staleness: z.object({
    homeSalesDays: positiveInt,
    crimeDays: positiveInt,
    schoolsDays: positiveInt,
    climateDays: positiveInt,
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

const rawConfig: AppConfig = {
  staleness: {
    homeSalesDays: 365,
    crimeDays: 365 * 3,
    schoolsDays: 365 * 3,
    climateDays: 365 * 10,
  },
};

/**
 * Parsed and validated at import time -- if this throws, the app should not
 * start. `parse` (not `safeParse`) is intentional: an invalid config is a
 * programming error to fix, not a runtime condition to handle gracefully.
 */
export const CONFIG: AppConfig = ConfigSchema.parse(rawConfig);
