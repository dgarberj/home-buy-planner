/**
 * Staleness policy for fetched data. See docs/adr/0001-stale-data-threshold.md
 * for why these categories and thresholds exist. The actual threshold values
 * live in src/config.ts (the centralized, Zod-validated config) -- this file
 * is the typed, per-category API the rest of the codebase calls, so nothing
 * else has to know the config's shape or reach into it directly.
 *
 * Every module that carries a fetched date -- a source's `retrieved` date in
 * sources.ts, a sale's `saleDate` in recentSales.ts -- should compare it
 * against one of these thresholds via `isStale()` rather than presenting it
 * as trustworthy indefinitely. Different kinds of data go stale at
 * different rates: a six-month-old home sale is still market signal, a
 * six-month-old climate-risk score is unremarkable, a six-month-old crime
 * count would be unusually fast for this data to even exist.
 */

import { CONFIG } from '../config';

export type DataCategory = 'homeSales' | 'crime' | 'schools' | 'climate';

/**
 * How many days old data in each category is allowed to be before it counts
 * as stale. Sourced from CONFIG.staleness so there is exactly one place --
 * config.ts -- where these numbers are actually set.
 */
export const STALE_THRESHOLD_DAYS: Record<DataCategory, number> = {
  homeSales: CONFIG.staleness.homeSalesDays,
  crime: CONFIG.staleness.crimeDays,
  schools: CONFIG.staleness.schoolsDays,
  climate: CONFIG.staleness.climateDays,
};

/**
 * "1 year", "3 years", "45 days" -- derived from STALE_THRESHOLD_DAYS rather
 * than hand-maintained, so a label can never drift out of sync with the
 * number it describes.
 */
function yearsOrDaysLabel(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
Human-readable form of the same thresholds, for UI copy and error messages.
*/
export const STALE_THRESHOLD_LABEL: Record<DataCategory, string> = {
  homeSales: yearsOrDaysLabel(STALE_THRESHOLD_DAYS.homeSales),
  crime: yearsOrDaysLabel(STALE_THRESHOLD_DAYS.crime),
  schools: yearsOrDaysLabel(STALE_THRESHOLD_DAYS.schools),
  climate: yearsOrDaysLabel(STALE_THRESHOLD_DAYS.climate),
};

/**
 * Days between an ISO date (YYYY-MM-DD, or any Date-parseable string) and
 * `asOf` (defaults to now). Positive when the date is in the past.
 */
export function daysSince(dateISO: string, asOf: Date = new Date()): number {
  const then = new Date(dateISO).getTime();
  if (Number.isNaN(then)) {
    throw new TypeError(`Not a parseable date: "${dateISO}"`);
  }
  return (asOf.getTime() - then) / (1000 * 60 * 60 * 24);
}

/**
 * Whether a date is too old to trust for the given category, per the
 * thresholds in docs/adr/0001-stale-data-threshold.md. This is the one
 * function every data module should call rather than comparing dates itself.
 */
export function isStale(
  dateISO: string,
  category: DataCategory,
  asOf: Date = new Date(),
): boolean {
  return daysSince(dateISO, asOf) > STALE_THRESHOLD_DAYS[category];
}
