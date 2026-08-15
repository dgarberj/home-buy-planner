import { describe, expect, it } from 'vitest';
import { COUNTY_INFO } from './localMarket';
import { climateRiskFor } from './climateRisk';

describe('climate risk covers every county in the switcher', () => {
  it('has a FEMA NRI entry for every county in COUNTY_INFO', () => {
    for (const c of COUNTY_INFO) {
      expect(climateRiskFor(c.key), c.name).not.toBeNull();
    }
  });

  it('returns null rather than a default for an unknown county', () => {
    expect(climateRiskFor('nonexistent')).toBeNull();
  });

  it('keeps every score within the 0-100 national-percentile range', () => {
    for (const c of COUNTY_INFO) {
      const risk = climateRiskFor(c.key)!;
      const numericEntries = Object.entries(risk).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      );
      for (const [key, value] of numericEntries) {
        expect(value, `${c.name} ${key}`).toBeGreaterThanOrEqual(0);
        expect(value, `${c.name} ${key}`).toBeLessThanOrEqual(100);
      }
    }
  });
});
