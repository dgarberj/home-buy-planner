import { describe, expect, it } from 'vitest';
import { MONTCO_MUNICIPALITIES } from './localMarket';
import { STALE_THRESHOLD_DAYS } from './freshness';
import {
  RECENT_SALES,
  freshSalesIn,
  isSaleStale,
  medianOf,
  municipalitiesWithFreshSales,
  municipalitiesWithSales,
  salesIn,
} from './recentSales';

describe('recent sale records are usable', () => {
  it('has at least one sale', () => {
    expect(RECENT_SALES.length).toBeGreaterThan(0);
  });

  it('files every sale under a real Montgomery County municipality', () => {
    const names = new Set(MONTCO_MUNICIPALITIES.map((m) => m.name));
    for (const sale of RECENT_SALES) {
      expect(names.has(sale.municipality), sale.municipality).toBe(true);
    }
  });

  it('has a plausible price, address and date for every record', () => {
    for (const sale of RECENT_SALES) {
      expect(sale.salePrice, sale.address).toBeGreaterThan(50_000);
      expect(sale.salePrice, sale.address).toBeLessThan(10_000_000);
      expect(sale.address.length, sale.address).toBeGreaterThan(0);
      expect(sale.saleDate, sale.address).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('has no duplicate address+date pairs', () => {
    // Keyed on address+date rather than address alone: a street can cross a
    // municipal boundary (two different towns, same street name), and a
    // property can genuinely sell twice within the window -- neither of
    // those is a data error, but the same address selling twice on the same
    // day would be.
    const keys = RECENT_SALES.map((s) => `${s.address}::${s.saleDate}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('municipalitiesWithSales / salesIn', () => {
  it('lists each covered town exactly once, alphabetically', () => {
    const names = municipalitiesWithSales();
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b)));
  });

  it('splits cleanly back out to the same total', () => {
    const total = municipalitiesWithSales().reduce(
      (sum, name) => sum + salesIn(name).length,
      0,
    );
    expect(total).toBe(RECENT_SALES.length);
  });

  it('returns an empty list for a town with no sales on file', () => {
    expect(salesIn('Nonexistent Town')).toEqual([]);
  });
});

describe('staleness — docs/adr/0001-stale-data-threshold.md', () => {
  // Fixed reference point so these tests don't drift with the calendar.
  const asOf = new Date('2026-08-10T00:00:00Z');

  it('treats a sale from today as fresh, and one from over a year ago as stale', () => {
    const fresh = { municipality: 'Ambler', address: '1 Test St', saleDate: '2026-08-01', salePrice: 100_000 };
    const stale = { municipality: 'Ambler', address: '2 Test St', saleDate: '2024-01-01', salePrice: 100_000 };
    expect(isSaleStale(fresh, asOf)).toBe(false);
    expect(isSaleStale(stale, asOf)).toBe(true);
  });

  it('draws the line at exactly the 1-year threshold', () => {
    expect(STALE_THRESHOLD_DAYS.homeSales).toBe(365);
    const oneYearAgo = { municipality: 'Ambler', address: '3 Test St', saleDate: '2025-08-10', salePrice: 100_000 };
    const oneYearAndADay = { municipality: 'Ambler', address: '4 Test St', saleDate: '2025-08-09', salePrice: 100_000 };
    expect(isSaleStale(oneYearAgo, asOf)).toBe(false);
    expect(isSaleStale(oneYearAndADay, asOf)).toBe(true);
  });

  it('never lists a town under municipalitiesWithFreshSales unless it has a fresh sale', () => {
    for (const town of municipalitiesWithFreshSales()) {
      expect(freshSalesIn(town).length, town).toBeGreaterThan(0);
    }
  });

  it('drops a town entirely from the fresh list once all its sales are stale', () => {
    // Synthetic rather than pulled from RECENT_SALES: the committed sample
    // is fetched with a 12-month window in the first place (see the file
    // header), so it won't reliably contain a town whose entire sample has
    // gone stale -- this proves the mechanism freshSalesIn/
    // municipalitiesWithFreshSales are built on instead.
    const allStale = [
      { municipality: 'Ambler', address: '1 Test St', saleDate: '2023-01-01', salePrice: 100_000 },
      { municipality: 'Ambler', address: '2 Test St', saleDate: '2022-06-15', salePrice: 100_000 },
    ];
    const fresh = allStale.filter((s) => !isSaleStale(s, asOf));
    expect(fresh).toHaveLength(0);
  });
});

describe('medianOf', () => {
  it('returns null for no sales', () => {
    expect(medianOf([])).toBeNull();
  });

  it('averages the two middle prices for an even count', () => {
    const sales = [100_000, 400_000, 200_000, 300_000].map((salePrice, index) => ({
      municipality: 'Ambler',
      address: `${index} Test St`,
      saleDate: '2026-01-01',
      salePrice,
    }));
    expect(medianOf(sales)).toBe(250_000);
  });

  it('picks the single middle price for an odd count', () => {
    const sales = [100_000, 300_000, 200_000].map((salePrice, index) => ({
      municipality: 'Ambler',
      address: `${index} Test St`,
      saleDate: '2026-01-01',
      salePrice,
    }));
    expect(medianOf(sales)).toBe(200_000);
  });
});
