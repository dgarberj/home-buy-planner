/**
 * Staleness policy for fetched data. See docs/adr/0001-stale-data-threshold.md
 * for the principle (data has a shelf life; stale data must not be presented
 * as trustworthy) and its "Update" note for how the mechanism works today:
 * each source in data/dataSources.ts's `DATA_SOURCES` carries its own
 * `staleAfterDays` threshold rather than sharing one of a few fixed
 * categories. This file is just the pure date-math underneath that -- it
 * doesn't know what a "source" or a "category" is.
 *
 * Every module that carries a fetched date -- a source's `fetchedAt` in
 * dataSources.ts, a sale's `saleDate` in recentSales.ts -- should compare it
 * against its own threshold via `isStale()` rather than presenting it as
 * trustworthy indefinitely.
 */

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
 * Whether a date is more than `maxAgeDays` old. This is the one function
 * every data module should call rather than comparing dates itself.
 */
export function isStale(dateISO: string, maxAgeDays: number, asOf: Date = new Date()): boolean {
  return daysSince(dateISO, asOf) > maxAgeDays;
}

/**
 * "1 year", "3 years", "45 days" -- derived from a day count rather than
 * hand-maintained per threshold, so a label can never drift out of sync
 * with the number it describes.
 */
export function formatMaxAge(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}
