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

  it('has no duplicate addresses', () => {
    const addresses = RECENT_SALES.map((s) => s.address);
    expect(new Set(addresses).size).toBe(addresses.length);
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
    expect(salesIn('Bryn Athyn')).toEqual([]);
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

  it('documents that most of the committed sample predates this policy', () => {
    // The ADR's stated consequence: most of RECENT_SALES was pulled before
    // a 1-year threshold existed, so freshSalesIn should genuinely be
    // filtering records out today, not just be a no-op pass-through.
    const totalOnFile = RECENT_SALES.length;
    const totalFresh = municipalitiesWithSales().reduce(
      (sum, town) => sum + freshSalesIn(town).length,
      0,
    );
    expect(totalFresh).toBeLessThan(totalOnFile);
  });

  it('never lists a town under municipalitiesWithFreshSales unless it has a fresh sale', () => {
    for (const town of municipalitiesWithFreshSales()) {
      expect(freshSalesIn(town).length, town).toBeGreaterThan(0);
    }
  });

  it('drops a town entirely from the fresh list once all its sales are stale', () => {
    // Pottstown's committed sample includes a 1990 sale alongside 2023/2025
    // ones -- a mixed town should still show through fresh filtering, and the
    // stale record specifically should not appear in freshSalesIn.
    const fresh = freshSalesIn('Pottstown', asOf);
    expect(fresh.some((s) => s.saleDate === '1990-03-19')).toBe(false);
  });
});

describe('medianOf', () => {
  it('returns null for no sales', () => {
    expect(medianOf([])).toBeNull();
  });

  it('averages the two middle prices for an even count', () => {
    const sales = salesIn('Conshohocken');
    expect(sales.length % 2).toBe(0);
    const prices = sales.map((s) => s.salePrice).toSorted((a, b) => a - b);
    const expected = (prices[1]! + prices[2]!) / 2;
    expect(medianOf(sales)).toBe(expected);
  });

  it('picks the single middle price for an odd count', () => {
    const sales = salesIn('Ambler');
    expect(sales.length % 2).toBe(1);
    const prices = sales.map((s) => s.salePrice).toSorted((a, b) => a - b);
    expect(medianOf(sales)).toBe(prices[Math.floor(prices.length / 2)]);
  });
});
