/**
 * ============================================================================
 *  Montgomery County, PA -- individual property sale records (real, sourced).
 * ============================================================================
 *
 * Unlike the single `medianPrice` figure per town in `localMarket.ts` (a
 * commercial estimate, hand-transcribed from Zillow/Redfin), these are actual
 * transactions pulled straight from the county's own assessment database --
 * one row per sale, with the address, price, date and (where recorded) beds,
 * baths and square footage.
 *
 * Source: Montgomery County Parcels, Montgomery County GIS
 *   https://www.montgomerycountypa.gov/departments/board-assessment-appeals/property-data-data-requests
 *   Live feature service (free, no key, updated monthly from the assessment
 *   database):
 *   https://services1.arcgis.com/kOChldNuKsox8qZD/arcgis/rest/services/Montgomery_County_Parcels/FeatureServer/6
 * Retrieved: 2026-08-10
 * Refresh: monthly (county publishes a new snapshot on a published schedule --
 *   see the service's own description for the current month's date).
 *
 * ---------------------------------------------------------------------------
 *  READ THIS BEFORE TREATING THE AGGREGATE AS A MEDIAN
 * ---------------------------------------------------------------------------
 *
 * This is a small, hand-pulled sample (a handful of records per town, not a
 * systematic recent-sales query) -- see `scripts/fetch-montco-sales.mjs` for
 * why: the county service caps how much a single request can return, and
 * pulling full, current coverage for all ~60 Montgomery municipalities means
 * running that script for real, not fetching by hand in a chat session. Some
 * records here are recent (2024-2026); others are a decade or more old,
 * because the query that produced this file wasn't filtered by date. Do NOT
 * treat `medianOf()` below as a real median sale price -- it is a range
 * across whatever sales happened to be pulled, useful for a rough sense of
 * what a town's housing stock looks like, not a market snapshot. Re-running
 * the fetch script with a recency filter would fix this.
 *
 * County sale records also include non-arm's-length transfers (family
 * transfers, deed corrections, sheriff sales) that can carry unrealistic
 * prices. Every record here has already been filtered to CONSIDERAT > $50,000
 * and to residential parcels with recorded beds/baths/sqft, which rules out
 * the obvious ones, but it is not a substitute for a real filter on transfer
 * type.
 *
 * ---------------------------------------------------------------------------
 *  STALENESS
 * ---------------------------------------------------------------------------
 *
 * Per docs/adr/0001-stale-data-threshold.md, a home sale older than 1 year is
 * stale and not trustworthy as a market signal -- most of the records above
 * fail that test on the day this was written, which is exactly the problem
 * the ADR exists to catch. `salesIn()` returns every record on file
 * (unfiltered, for audit purposes); `freshSalesIn()` is what the UI and any
 * aggregate should use instead, since it drops anything past the threshold.
 */

import { isStale } from './freshness';

export interface RecentSale {
  /**
  Matches `Municipality.name` in `localMarket.ts` (Montgomery County only, so far).
  */
  municipality: string;
  address: string;
  /**
  ISO date the deed was recorded, YYYY-MM-DD.
  */
  saleDate: string;
  /**
  The deed's stated consideration -- what the county recorded as the price.
  */
  salePrice: number;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  halfBaths?: number;
  sqft?: number;
}

export const RECENT_SALES: RecentSale[] = [
  // --- Conshohocken --------------------------------------------------------
  { municipality: 'Conshohocken', address: '515 Spring Mill Ave', saleDate: '2020-09-30', salePrice: 245_000, yearBuilt: 1870, beds: 4, baths: 1, sqft: 1267 },
  { municipality: 'Conshohocken', address: '512 Hector St', saleDate: '2010-05-07', salePrice: 356_000, yearBuilt: 2008, beds: 3, baths: 2, halfBaths: 1, sqft: 2030 },
  { municipality: 'Conshohocken', address: '134 W Fourth Ave', saleDate: '2021-12-27', salePrice: 325_000, yearBuilt: 1948, beds: 3, baths: 1, sqft: 1500 },
  { municipality: 'Conshohocken', address: '130 W Fourth Ave', saleDate: '2013-04-08', salePrice: 475_000, yearBuilt: 2008, beds: 4, baths: 2, halfBaths: 2, sqft: 2978 },

  // --- Lansdale --------------------------------------------------------------
  { municipality: 'Lansdale', address: '37 E Blaine St', saleDate: '2006-04-26', salePrice: 159_000, yearBuilt: 1890, beds: 1, baths: 1, sqft: 1184 },

  // --- Ambler ----------------------------------------------------------------
  { municipality: 'Ambler', address: '100 S Bethlehem Pike', saleDate: '1989-11-30', salePrice: 225_000, yearBuilt: 1900, beds: 3, baths: 4, sqft: 3428 },
  { municipality: 'Ambler', address: '330 Euclid Ave', saleDate: '2006-05-24', salePrice: 535_000, yearBuilt: 1900, beds: 7, baths: 3, halfBaths: 1, sqft: 4185 },
  { municipality: 'Ambler', address: '320 Euclid Ave', saleDate: '2007-04-26', salePrice: 225_000, yearBuilt: 1900, beds: 2, baths: 1, sqft: 1110 },

  // --- Upper Dublin ------------------------------------------------------------
  { municipality: 'Upper Dublin', address: '346 Logan Ave', saleDate: '2020-10-09', salePrice: 355_000, yearBuilt: 2008, beds: 3, baths: 2, halfBaths: 1, sqft: 1762 },
  { municipality: 'Upper Dublin', address: '340 Logan Ave', saleDate: '2007-08-30', salePrice: 190_000, yearBuilt: 1971, beds: 4, baths: 2, halfBaths: 1, sqft: 1627 },
  { municipality: 'Upper Dublin', address: '323 Girard Ave', saleDate: '2024-06-04', salePrice: 455_000, yearBuilt: 2006, beds: 2, baths: 2, sqft: 1520 },

  // --- Pottstown ---------------------------------------------------------------
  { municipality: 'Pottstown', address: '123 S Penn St', saleDate: '2025-05-29', salePrice: 285_000, yearBuilt: 2013, beds: 3, baths: 2, halfBaths: 1, sqft: 1520 },
  { municipality: 'Pottstown', address: '1223 Feist Ave', saleDate: '2023-06-10', salePrice: 275_000, yearBuilt: 1959, beds: 3, baths: 2, sqft: 1334 },
  { municipality: 'Pottstown', address: '1047 Sycamore Dr', saleDate: '2015-06-05', salePrice: 125_000, yearBuilt: 1965, beds: 2, baths: 1, sqft: 1232 },
  { municipality: 'Pottstown', address: '1201 Feist Ave', saleDate: '1990-03-19', salePrice: 131_500, yearBuilt: 1990, beds: 3, baths: 2, sqft: 1792 },
];

/**
Distinct municipalities represented in a list of sales, alphabetical. Shared
by municipalitiesWithSales/municipalitiesWithFreshSales below so the two
don't drift into different dedup/sort implementations.
*/
function uniqueMunicipalities(sales: RecentSale[]): string[] {
  return [...new Set(sales.map((s) => s.municipality))].toSorted((a, b) =>
    a.localeCompare(b),
  );
}

/**
Every municipality with at least one sale on file (fresh or stale), alphabetical.
*/
export function municipalitiesWithSales(): string[] {
  return uniqueMunicipalities(RECENT_SALES);
}

/**
Every municipality with at least one FRESH sale on file -- what the UI should
actually iterate over, since a town whose only records are stale has nothing
trustworthy to show.
*/
export function municipalitiesWithFreshSales(asOf: Date = new Date()): string[] {
  return uniqueMunicipalities(RECENT_SALES.filter((s) => !isSaleStale(s, asOf)));
}

/**
Whether a sale is too old to trust as market signal. See
docs/adr/0001-stale-data-threshold.md -- home sales go stale after 1 year.
*/
export function isSaleStale(sale: RecentSale, asOf: Date = new Date()): boolean {
  return isStale(sale.saleDate, 'homeSales', asOf);
}

/**
Every record on file, unfiltered -- includes stale sales. Use for audit/tests;
UI code should prefer `freshSalesIn`.
*/
export function salesIn(municipality: string): RecentSale[] {
  return RECENT_SALES.filter((s) => s.municipality === municipality);
}

/**
Sales on file that are still within the 1-year staleness threshold. This is
what `medianOf` and the UI should be called with -- a 1989 sale is not market
signal for a decision made today.
*/
export function freshSalesIn(municipality: string, asOf: Date = new Date()): RecentSale[] {
  return salesIn(municipality).filter((s) => !isSaleStale(s, asOf));
}

/**
Middle value of a town's sales on file -- explicitly NOT a statistical
median (see the file header). Named `medianOf` rather than `medianPriceFor`
so it can't be mistaken for the sourced `medianPrice` field in
`localMarket.ts` at a glance.
*/
export function medianOf(sales: RecentSale[]): number | null {
  if (sales.length === 0) return null;
  const sorted = sales.map((s) => s.salePrice).toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
