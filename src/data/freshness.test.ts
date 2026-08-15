import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { STALE_THRESHOLD_DAYS, STALE_THRESHOLD_LABEL, daysSince, isStale } from './freshness';

describe('freshness thresholds match docs/adr/0001-stale-data-threshold.md', () => {
  it('has the four documented categories at the documented thresholds', () => {
    expect(STALE_THRESHOLD_DAYS.homeSales).toBe(365);
    expect(STALE_THRESHOLD_DAYS.crime).toBe(365 * 3);
    expect(STALE_THRESHOLD_DAYS.schools).toBe(365 * 3);
    expect(STALE_THRESHOLD_DAYS.climate).toBe(365 * 10);
  });

  it('has a human-readable label for every threshold', () => {
    for (const category of Object.keys(STALE_THRESHOLD_DAYS) as (keyof typeof STALE_THRESHOLD_DAYS)[]) {
      expect(STALE_THRESHOLD_LABEL[category], category).toBeDefined();
    }
  });

  it('derives every threshold from CONFIG.staleness, not a second hardcoded copy', () => {
    expect(STALE_THRESHOLD_DAYS.homeSales).toBe(CONFIG.staleness.homeSalesDays);
    expect(STALE_THRESHOLD_DAYS.crime).toBe(CONFIG.staleness.crimeDays);
    expect(STALE_THRESHOLD_DAYS.schools).toBe(CONFIG.staleness.schoolsDays);
    expect(STALE_THRESHOLD_DAYS.climate).toBe(CONFIG.staleness.climateDays);
  });

  it('renders whole-year thresholds as "N years" rather than a raw day count', () => {
    expect(STALE_THRESHOLD_LABEL.homeSales).toBe('1 year');
    expect(STALE_THRESHOLD_LABEL.crime).toBe('3 years');
    expect(STALE_THRESHOLD_LABEL.schools).toBe('3 years');
    expect(STALE_THRESHOLD_LABEL.climate).toBe('10 years');
  });
});

describe('daysSince', () => {
  it('is positive for a date in the past', () => {
    expect(daysSince('2026-01-01', new Date('2026-02-01'))).toBeCloseTo(31, 0);
  });

  it('throws on an unparseable date rather than silently returning NaN', () => {
    expect(() => daysSince('not-a-date')).toThrow();
  });
});

describe('isStale', () => {
  const asOf = new Date('2026-08-10');

  it('is false exactly at the threshold and true one day past it', () => {
    expect(isStale('2025-08-10', 'homeSales', asOf)).toBe(false);
    expect(isStale('2025-08-09', 'homeSales', asOf)).toBe(true);
  });

  it('treats the same date differently depending on category', () => {
    const fiveYearsAgo = '2021-08-10';
    expect(isStale(fiveYearsAgo, 'homeSales', asOf)).toBe(true);
    expect(isStale(fiveYearsAgo, 'crime', asOf)).toBe(true);
    expect(isStale(fiveYearsAgo, 'schools', asOf)).toBe(true);
    expect(isStale(fiveYearsAgo, 'climate', asOf)).toBe(false);
  });
});
