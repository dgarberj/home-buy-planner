/**
 * ============================================================================
 *  User-adjustable cost defaults.
 * ============================================================================
 *
 * Unlike config.ts (fixed, Zod-validated application policy this codebase is
 * opinionated about), these are starting values for numbers a PERSON using
 * the app might reasonably want to change -- what insurance costs, how much
 * to hold back in savings each month, what "typical" tax rate to assume
 * before picking a town, what reference price to compare school value at.
 *
 * They're plain constants today because no settings panel exposes them yet
 * -- every call site just uses the default. They live in their own,
 * unvalidated file rather than inside config.ts specifically so that when a
 * "customize these" UI does get built, it's editing user preferences, not
 * reaching into application policy to do it. Nothing here should grow a Zod
 * schema; if these need validation later, it belongs at the settings-form
 * boundary (the same place `assumptions`/`settings` in the Zustand store
 * would validate user input), not here.
 */

export const COST_DEFAULTS = {
  /**
   * Flat monthly homeowner's-insurance estimate used wherever the app prices
   * a house, since insurance quotes aren't sourced per-town the way tax and
   * school data are. Deliberately a single number, not a per-county table --
   * see the caveat wherever it's used.
   */
  flatMonthlyInsuranceUsd: 150,
  /**
   * Default amount held back from the housing budget each month so the
   * projection doesn't assume every spare dollar goes to a mortgage payment.
   * Already user-adjustable via the "Reserve for saving" field in the UI;
   * this is only the starting value.
   */
  defaultReserveForSavingsUsd: 400,
  /**
   * Typical all-in effective property tax rate (share of market value) used
   * for the rough affordability "ceiling" figure, before a specific town's
   * own rate is known.
   */
  typicalEffectiveTaxRate: 0.018,
  /**
   * Reference home price used to compare school quality per dollar across
   * EVERY municipality on equal footing, rather than being limited to the
   * ~18 towns with a sourced median price. See qualityPerDollar() in
   * localMarket.ts -- the "value score" shown in the UI.
   */
  valueScoreReferencePriceUsd: 400_000,
};
