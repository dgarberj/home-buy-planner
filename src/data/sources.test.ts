import { describe, expect, it } from 'vitest';
import { SOURCES, SOURCE_TOPICS, isSourceStale, sourceById, sourcesFor, staleSources } from './sources';
import { ALL_MUNICIPALITIES } from './localMarket';
import { SCHOOL_DISTRICTS } from './schools';
import { ASSISTANCE_PROGRAMS } from './homebuyerPrograms';

/**
 * The source registry is the audit trail for every external number in the app,
 * so it gets tested like any other data: no dead references, no orphans,
 * nothing claiming to be sourced that isn't.
 */

describe('every source is properly recorded', () => {
  it('has a unique id', () => {
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length);
  });

  it('has a title, a publisher and a real URL', () => {
    for (const s of SOURCES) {
      expect(s.title.length, s.id).toBeGreaterThan(5);
      expect(s.publisher.length, s.id).toBeGreaterThan(2);
      expect(s.url.startsWith('https://'), `${s.id}: ${s.url}`).toBe(true);
    }
  });

  it('has a real fetchable URL wherever fetchUrl is set', () => {
    for (const s of SOURCES) {
      if (s.fetchUrl === undefined) continue;
      expect(s.fetchUrl.startsWith('https://'), `${s.id}: ${s.fetchUrl}`).toBe(true);
    }
  });

  it('says what it actually covers, not just what it is', () => {
    for (const s of SOURCES) {
      expect(s.covers.length, s.id).toBeGreaterThan(40);
    }
  });

  it('records when it was fetched and how often it goes stale', () => {
    for (const s of SOURCES) {
      expect(s.fetchedAt, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.refresh.length, s.id).toBeGreaterThan(5);
    }
  });

  it('gives every staleAfterDays a positive whole number of days', () => {
    for (const s of SOURCES) {
      if (s.staleAfterDays === undefined) continue;
      expect(Number.isSafeInteger(s.staleAfterDays), s.id).toBe(true);
      expect(s.staleAfterDays, s.id).toBeGreaterThan(0);
    }
  });

  it('grades how far each one can be trusted', () => {
    for (const s of SOURCES) {
      expect(['official', 'commercial', 'secondary'], s.id).toContain(s.reliability);
    }
  });

  it('carries a caveat on every commercial estimate that needs one', () => {
    // Commercial house-price estimates disagree materially; that has to be said.
    const priceSources = SOURCES.filter((s) => s.id.includes('zillow') || s.id.includes('prices'));
    for (const s of priceSources) {
      expect(s.note, `${s.id} should warn about estimate variance`).toBeDefined();
    }
  });
});

describe('topics and sources line up', () => {
  it('has topics with unique keys', () => {
    expect(new Set(SOURCE_TOPICS.map((t) => t.key)).size).toBe(SOURCE_TOPICS.length);
  });

  it('references only sources that exist', () => {
    for (const topic of SOURCE_TOPICS) {
      for (const id of topic.sourceIds) {
        expect(sourceById(id), `${topic.key} references missing source "${id}"`).toBeDefined();
      }
    }
  });

  it('leaves no source orphaned', () => {
    const referenced = new Set(SOURCE_TOPICS.flatMap((t) => t.sourceIds));
    const orphans = SOURCES.filter((s) => !referenced.has(s.id)).map((s) => s.id);
    expect(orphans, 'sources not shown under any topic').toEqual([]);
  });

  it('says which part of the app each topic feeds', () => {
    for (const t of SOURCE_TOPICS) {
      expect(t.usedBy.length, t.key).toBeGreaterThan(20);
      expect(t.description.length, t.key).toBeGreaterThan(30);
    }
  });

  it('resolves a topic to its sources', () => {
    expect(sourcesFor('tax').length).toBeGreaterThan(2);
    expect(sourcesFor('nonsense')).toEqual([]);
  });
});

describe('the four things asked for are all covered', () => {
  it('cites the tax rates', () => {
    const ids = sourcesFor('tax').map((s) => s.id);
    expect(ids).toContain('delco-millage');
    expect(ids).toContain('montco-millage');
    // Without the common level ratio the millage is not comparable at all.
    expect(ids).toContain('pa-clr');
  });

  it('cites the median home values', () => {
    expect(sourcesFor('prices').length).toBeGreaterThan(0);
    const priced = ALL_MUNICIPALITIES.filter((m) => m.medianPrice);
    // Every price in the data also carries its own inline provenance.
    for (const m of priced) {
      expect(m.priceSource, m.name).toBeDefined();
    }
  });

  it('cites the school ratings', () => {
    const ids = sourcesFor('schools').map((s) => s.id);
    expect(ids).toContain('psr-penn-delco');
    expect(ids).toContain('psr-ridley');
    // The two districts actually under consideration are both sourced.
    expect(SCHOOL_DISTRICTS['Penn Delco']?.mathProficiency).toBeDefined();
    expect(SCHOOL_DISTRICTS.Ridley?.mathProficiency).toBeDefined();
  });

  it('cites the first-time buyer programmes', () => {
    const ids = sourcesFor('programs').map((s) => s.id);
    expect(ids).toContain('phfa-assistance');
    expect(ids).toContain('phfa-limits');
    expect(ids).toContain('delco-hcd');
    // And every programme in the data links to its own page.
    for (const p of ASSISTANCE_PROGRAMS) {
      expect(p.url.startsWith('https://'), p.key).toBe(true);
    }
  });

  it('cites the Fannie Mae DTI limits', () => {
    const ids = sourcesFor('mortgage').map((s) => s.id);
    expect(ids).toContain('fannie-dti-2026');
  });

  it('leans on official sources for anything load-bearing', () => {
    // Tax and programme eligibility decide real money, so both must have an
    // official source behind them rather than only secondary reporting.
    for (const key of ['tax', 'programs']) {
      const official = sourcesFor(key).filter((s) => s.reliability === 'official');
      expect(official.length, key).toBeGreaterThan(0);
    }
  });
});

describe('staleness — docs/adr/0001-stale-data-threshold.md', () => {
  it('has no stale source as of today', () => {
    // This is the whole point of the ADR: a dataset that ages past its own
    // threshold should fail the build, not sit there quietly.
    const stale = staleSources();
    expect(
      stale.map((s) => `${s.source.id} (fetched ${s.source.fetchedAt}, threshold ${s.thresholdLabel})`),
      'stale sources found',
    ).toEqual([]);
  });

  it('assigns a threshold to every source that actually needs a staleness check', () => {
    const schoolSource = sourceById('frpi-performance');
    const climateSource = sourceById('fema-nri');
    const salesSource = sourceById('montco-parcels');
    expect(schoolSource?.staleAfterDays).toBe(365 * 3);
    expect(climateSource?.staleAfterDays).toBe(365 * 10);
    expect(salesSource?.staleAfterDays).toBe(365);
  });

  it('never flags a source with no staleAfterDays as stale, however old', () => {
    // psr-penn-delco is a deliberately-frozen cross-check, superseded by
    // frpi-performance -- it has no staleAfterDays on purpose.
    const ancient = { ...sourceById('psr-penn-delco')!, fetchedAt: '1990-01-01' };
    expect(ancient.staleAfterDays).toBeUndefined();
    expect(isSourceStale(ancient)).toBe(false);
  });

  it('flags a source once it passes its own threshold', () => {
    const overdue = { ...sourceById('fema-nri')!, fetchedAt: '2000-01-01' };
    const asOf = new Date('2026-08-10');
    expect(isSourceStale(overdue, asOf)).toBe(true);
  });
});
