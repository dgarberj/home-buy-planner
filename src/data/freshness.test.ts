import { describe, expect, it } from 'vitest';
import { daysSince, formatMaxAge, isStale } from './freshness';

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
    expect(isStale('2025-08-10', 365, asOf)).toBe(false);
    expect(isStale('2025-08-09', 365, asOf)).toBe(true);
  });

  it('treats the same date differently depending on the threshold given', () => {
    const fiveYearsAgo = '2021-08-10';
    expect(isStale(fiveYearsAgo, 365, asOf)).toBe(true);
    expect(isStale(fiveYearsAgo, 365 * 3, asOf)).toBe(true);
    expect(isStale(fiveYearsAgo, 365 * 10, asOf)).toBe(false);
  });
});

describe('formatMaxAge', () => {
  it('renders whole-year day counts as "N years" rather than a raw count', () => {
    expect(formatMaxAge(365)).toBe('1 year');
    expect(formatMaxAge(365 * 3)).toBe('3 years');
    expect(formatMaxAge(365 * 10)).toBe('10 years');
  });

  it('falls back to a day count for anything that is not a whole number of years', () => {
    expect(formatMaxAge(30)).toBe('30 days');
    expect(formatMaxAge(1)).toBe('1 day');
  });
});
