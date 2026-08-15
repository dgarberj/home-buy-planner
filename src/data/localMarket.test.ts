import { describe, expect, it } from 'vitest';
import {
  ALL_MUNICIPALITIES,
  CLR_FACTORS,
  COUNTY_INFO,
  DELCO_MUNICIPALITIES,
  MONTCO_MUNICIPALITIES,
  PHILADELPHIA_MUNICIPALITIES,
  clrFactorFor,
  effectiveRate,
  estimatedAnnualTax,
  municipalitiesIn,
  qualityPerDollar,
  rankedByQualityPerDollar,
} from './localMarket';

const HOME = {
  downPaymentPct: 0.1,
  mortgageRateAnnual: 0.065,
  mortgageTermYears: 30,
  maintenanceAnnualPct: 0.01,
  pmiAnnualPct: 0.006,
  pmiRemovedAtLtv: 0.8,
};

/**
 * Integrity checks on the tax data.
 *
 * These exist because of a real incident: a UI change filtered the "where to
 * buy" table to towns with a sourced median price, which silently dropped 94 of
 * 112 municipalities. Nothing failed, nothing warned -- the table just got
 * short. Pinning the counts here means any future loss shows up as a failure
 * rather than as a table that quietly looks emptier.
 */

describe('the tax data is all present', () => {
  it('has every Delaware County municipality', () => {
    expect(DELCO_MUNICIPALITIES).toHaveLength(49);
  });

  it('has every Montgomery County municipality from the published table', () => {
    expect(MONTCO_MUNICIPALITIES).toHaveLength(62);
  });

  it('has Philadelphia as a single taxing district', () => {
    expect(PHILADELPHIA_MUNICIPALITIES).toHaveLength(1);
  });

  it('exposes all three counties together', () => {
    expect(ALL_MUNICIPALITIES).toHaveLength(112);
    expect(ALL_MUNICIPALITIES).toHaveLength(
      DELCO_MUNICIPALITIES.length +
        MONTCO_MUNICIPALITIES.length +
        PHILADELPHIA_MUNICIPALITIES.length,
    );
  });

  it('files every municipality under a real county', () => {
    for (const m of ALL_MUNICIPALITIES) {
      expect(COUNTY_INFO.some((c) => c.key === m.countyKey), m.name).toBe(true);
      expect(CLR_FACTORS[m.countyKey], m.name).toBeDefined();
    }
  });

  it('splits cleanly back out by county', () => {
    const total = COUNTY_INFO.reduce((sum, c) => sum + municipalitiesIn(c.key).length, 0);
    expect(total).toBe(ALL_MUNICIPALITIES.length);
  });
});

describe('every municipality is usable', () => {
  it('has a name, a school district and a county', () => {
    for (const m of ALL_MUNICIPALITIES) {
      expect(m.name.length, JSON.stringify(m)).toBeGreaterThan(0);
      expect(m.schoolDistrict.length, m.name).toBeGreaterThan(0);
      expect(m.countyKey.length, m.name).toBeGreaterThan(0);
    }
  });

  it('has millage that adds up to its stated total', () => {
    for (const m of ALL_MUNICIPALITIES) {
      expect(Math.abs(m.county + m.local + m.school - m.total), m.name).toBeLessThan(0.001);
    }
  });

  it('has a plausible, finite tax rate', () => {
    for (const m of ALL_MUNICIPALITIES) {
      const rate = effectiveRate(m);
      expect(Number.isFinite(rate), m.name).toBe(true);
      // Nothing in south-east PA sits outside roughly 0.4% to 4% of value.
      expect(rate, m.name).toBeGreaterThan(0.003);
      expect(rate, m.name).toBeLessThan(0.04);
    }
  });

  it('uses its own county’s assessment factor, not Delaware’s', () => {
    const montco = MONTCO_MUNICIPALITIES[0]!;
    expect(clrFactorFor(montco)).toBe(CLR_FACTORS.montgomery);
    expect(clrFactorFor(DELCO_MUNICIPALITIES[0]!)).toBe(CLR_FACTORS.delaware);
    // Which is the whole point: identical millage, very different bills.
    const fakeDelco = { ...montco, countyKey: 'delaware' };
    expect(estimatedAnnualTax(400_000, montco)).toBeLessThan(
      estimatedAnnualTax(400_000, fakeDelco),
    );
  });

  it('has no duplicate town names within a county', () => {
    for (const c of COUNTY_INFO) {
      const names = municipalitiesIn(c.key).map((m) => m.name);
      expect(new Set(names).size, c.name).toBe(names.length);
    }
  });
});

describe('median price coverage is partial, and known to be', () => {
  const priced = ALL_MUNICIPALITIES.filter((m) => m.medianPrice);

  it('has prices for the towns actually under consideration', () => {
    for (const name of ['Brookhaven', 'Ridley Park', 'Aston', 'Springfield', 'Media', 'Marple']) {
      const m = ALL_MUNICIPALITIES.find((x) => x.name === name);
      expect(m?.medianPrice, `${name} should have a sourced price`).toBeDefined();
    }
  });

  it('records where each price came from', () => {
    for (const m of priced) {
      expect(m.priceSource, m.name).toBeDefined();
      expect((m.priceSource ?? '').length, m.name).toBeGreaterThan(3);
    }
  });

  it('has plausible prices', () => {
    for (const m of priced) {
      expect(m.medianPrice!, m.name).toBeGreaterThan(50_000);
      expect(m.medianPrice!, m.name).toBeLessThan(5_000_000);
    }
  });

  it('covers only a minority of towns — a gap in sourcing, not in the towns', () => {
    // Documented rather than hidden. If this number moves, it should move
    // because prices were added, not because towns were dropped.
    expect(priced).toHaveLength(28);
    expect(ALL_MUNICIPALITIES.length - priced.length).toBe(84);
  });
});

describe('the value score reaches every municipality, not just the priced ones', () => {
  it('scores a town whose district is sourced but has no median price', () => {
    // Bethel has no sourced medianPrice but its district (Garnet Valley) is sourced.
    const bethel = ALL_MUNICIPALITIES.find((m) => m.name === 'Bethel')!;
    expect(bethel.medianPrice).toBeUndefined();
    expect(qualityPerDollar(bethel, HOME)).not.toBeNull();
  });

  it('returns null, not a default, for an unsourced district', () => {
    const bryn = ALL_MUNICIPALITIES.find((m) => m.schoolDistrict === 'Bryn Athyn')!;
    expect(qualityPerDollar(bryn, HOME)).toBeNull();
  });

  it('sorts unsourced districts to the end rather than dropping them', () => {
    const ranked = rankedByQualityPerDollar(HOME, 'montgomery');
    const names = ranked.map((m) => m.name);
    expect(names).toHaveLength(municipalitiesIn('montgomery').length);
    const lastScored = ranked.findLastIndex(
      (m) => qualityPerDollar(m, HOME) !== null,
    );
    for (let index = lastScored + 1; index < ranked.length; index++) {
      expect(qualityPerDollar(ranked[index]!, HOME)).toBeNull();
    }
  });

  it('still has complete tax data for every unpriced town', () => {
    const unpriced = ALL_MUNICIPALITIES.filter((x) => !x.medianPrice);
    for (const m of unpriced) {
      expect(m.total, m.name).toBeGreaterThan(0);
      expect(Number.isFinite(effectiveRate(m)), m.name).toBe(true);
    }
  });
});
