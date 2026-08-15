import { describe, expect, it } from 'vitest';
import { ALL_MUNICIPALITIES } from './localMarket';
import {
  DISTRICT_AUN,
  PA_STATE_AVERAGE,
  SCHOOL_DISTRICTS,
  districtFor,
  ratingBand,
  ratingSummary,
} from './schools';

/**
 * Every district a municipality actually points at must resolve, and the
 * AUN mapping used to fetch the Future Ready PA Index data must cover the
 * same set -- otherwise a municipality silently loses its school data with
 * nothing failing to say so.
 */
describe('every municipality resolves to a sourced-or-honestly-null district', () => {
  const districtNames = new Set(ALL_MUNICIPALITIES.map((m) => m.schoolDistrict));

  it('has a SCHOOL_DISTRICTS entry for every district a municipality uses', () => {
    for (const name of districtNames) {
      expect(SCHOOL_DISTRICTS[name], name).toBeDefined();
    }
  });

  it('has an AUN mapping for every sourced district', () => {
    for (const [key, district] of Object.entries(SCHOOL_DISTRICTS)) {
      if (district.mathProficiency === null) continue; // e.g. Bryn Athyn, no schools
      expect(DISTRICT_AUN[key], key).toBeDefined();
    }
  });
});

describe('the Future Ready PA Index aggregation', () => {
  // Hand-checked against the SY2024-25 workbook (futurereadypa.org, AUN
  // 125237903): 6 buildings, mean maths 73.8%, mean ELA 79.3%.
  it('matches the source for Rose Tree Media', () => {
    const d = SCHOOL_DISTRICTS['Rose Tree Media']!;
    expect(d.mathProficiency).toBe(73.8);
    expect(d.readingProficiency).toBe(79.3);
    expect(d.sourceSchoolCount).toBe(6);
  });

  it('leaves Bryn Athyn null rather than guessing, since it has no schools in the workbook', () => {
    const d = SCHOOL_DISTRICTS['Bryn Athyn']!;
    expect(d.mathProficiency).toBeNull();
    expect(d.note).toMatch(/no schools/i);
  });
});

describe('rating helpers never fabricate a figure', () => {
  it('returns null/unknown for an unsourced district rather than a default', () => {
    expect(districtFor('Nonexistent District')).toBeNull();
    expect(ratingSummary('Nonexistent District')).toBeNull();
    expect(ratingBand('Nonexistent District')).toBe('unknown');
  });

  it('bands a strong district above the "strong" threshold', () => {
    // Radnor: 82.3% maths, well over PA_STATE_AVERAGE.math (41.7) + 15.
    expect(ratingBand('Radnor')).toBe('strong');
  });

  it('bands a below-average district correctly', () => {
    expect(SCHOOL_DISTRICTS['Chester/Upland']!.mathProficiency!).toBeLessThan(
      PA_STATE_AVERAGE.math,
    );
    expect(ratingBand('Chester/Upland')).toBe('below');
  });
});
