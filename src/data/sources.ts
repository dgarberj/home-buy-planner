/**
 * Where every external number in this app came from.
 *
 * The model makes real decisions, so anything not derived from your own figures
 * should be traceable to a document you can open and check. Official sources
 * are preferred; where only a commercial estimate exists, that is said plainly
 * rather than dressed up.
 *
 * The registry entries themselves (id, title, publisher, url, staleAfterDays,
 * fetchedAt, ...) live in dataSources.ts's `DATA_SOURCES`, Zod-validated
 * there. This file is the domain layer on top: grouping sources into topics
 * for the UI, and the staleness check -- every source that declares a
 * `staleAfterDays` gets checked, per docs/adr/0001-stale-data-threshold.md.
 */

import { DATA_SOURCES, type DataSource, type Reliability } from './dataSources';
import { daysSince, formatMaxAge } from './freshness';

export type { DataSource, Reliability } from './dataSources';
export type Source = DataSource;

export const SOURCES: DataSource[] = DATA_SOURCES;

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  official: 'Official',
  commercial: 'Commercial estimate',
  secondary: 'Secondary reporting',
};

export const RELIABILITY_NOTE: Record<Reliability, string> = {
  official: 'Published by the body that sets or administers the figure. Treat as authoritative.',
  commercial:
    'A private estimate. Methodology is not fully published and different providers disagree, sometimes by a lot.',
  secondary: 'Reported second-hand. Fine for ranking, worth verifying before acting on.',
};

export interface SourceTopic {
  key: string;
  label: string;
  description: string;
  /**
  Which parts of the app rely on these.
  */
  usedBy: string;
  sourceIds: string[];
}

export const SOURCE_TOPICS: SourceTopic[] = [
  {
    key: 'tax',
    label: 'Property and school tax',
    description:
      'Millage for every municipality, and the assessment factors that make rates comparable between counties. Chester County has no single official township millage table like Delco/Montco — the county rate is sourced, but individual Chester townships are out of scope, so only the two Chester school districts that Delco municipalities feed into (Unionville-Chadds Ford, West Chester Area) appear in the school data.',
    usedBy: 'The county map, the Where to buy table, and every housing cost in the projection.',
    sourceIds: ['delco-millage', 'montco-millage', 'pa-clr', 'chesco-rates'],
  },
  {
    key: 'prices',
    label: 'Median home values',
    description:
      'Typical home value per town. Only a minority of municipalities have a sourced price; the rest show no figure rather than a guess.',
    usedBy: 'Affordability ranking, the reach classification, and the waiting analysis.',
    sourceIds: ['zillow-values', 'redfin-counties', 'radnor-marple-prices'],
  },
  {
    key: 'recentSales',
    label: 'Recent individual sales',
    description:
      'Actual Montgomery County property transactions -- address, price, date -- rather than a computed town-wide median. Sales older than the staleness threshold (docs/adr/0001-stale-data-threshold.md) are excluded from what the app shows.',
    usedBy: 'TownExplorer/TownDetail, the per-town recent-sales section.',
    sourceIds: ['montco-parcels'],
  },
  {
    key: 'schools',
    label: 'School district performance',
    description:
      'Proficiency, graduation and attendance from Pennsylvania\'s own Future Ready PA Index, aggregated from per-school data since the state does not publish a district rollup. Districts I could not match to an AUN are marked "not sourced" rather than left to look poor by omission.',
    usedBy: 'The map tooltip and modal, the Where to buy table, and the value-score ranking.',
    sourceIds: [
      'frpi-performance',
      'frpi-fastfacts',
      'psr-penn-delco',
      'psr-ridley',
      'delco-today-rankings',
      'niche-districts',
    ],
  },
  {
    key: 'programs',
    label: 'First-time buyer assistance',
    description:
      'State and county programmes, their limits and their eligibility rules.',
    usedBy: 'The eligibility check, which tests your figures against each programme.',
    sourceIds: ['phfa-assistance', 'phfa-limits', 'delco-hcd'],
  },
  {
    key: 'mortgage',
    label: 'Mortgage and insurance',
    description: 'Low-deposit loan terms, mortgage insurance pricing by credit score, and Fannie Mae debt-to-income ceilings.',
    usedBy: 'The PMI calculation, the cash needed at closing, and the DTI-based affordability ceiling.',
    sourceIds: ['conventional-97', 'pmi-by-score', 'fannie-dti-2026'],
  },
  {
    key: 'accounts',
    label: 'Tax-advantaged accounts',
    description: 'Contribution limits and withdrawal rules for HSAs, 401(k)s, IRAs and dependent care accounts.',
    usedBy: 'Contribution targets, the childcare cost of a second income, and the HSA drawdown options.',
    sourceIds: ['irs-hsa-2026', 'irs-401k-ira-2026', 'dcfsa-2026', 'hsa-reimbursement', 'irs-8889'],
  },
  {
    key: 'federal-tax',
    label: 'Federal income tax',
    description:
      'Federal income tax brackets and standard deduction, single and married filing jointly. Excludes FICA and state tax.',
    usedBy: 'The marginal-rate lookup for pre-tax retirement contributions.',
    sourceIds: ['irs-2026-brackets'],
  },
  {
    key: 'income',
    label: 'Social Security and wages',
    description: 'Benefit eligibility, work credits, and local pay for a second earner.',
    usedBy: 'The second income presets and the retirement discussion.',
    sourceIds: ['ssa-noncitizens', 'ss-credits-2026', 'salary-bba-pa', 'zip-bba-philly', 'zip-parttime-philly'],
  },
  {
    key: 'risk',
    label: 'Natural hazard risk',
    description:
      'County-level flood, wildfire, heat, hurricane, wind and earthquake risk from FEMA. Two other factors were researched and deliberately left out: commute time (Census ACS) needs a free API key this household hasn\'t registered for, and PA crime data (ucr.pa.gov) has no bulk export -- only a one-municipality-at-a-time dashboard, impractical to source reliably for 100+ towns. Both are documented here as known gaps, not silently dropped.',
    usedBy: 'The county map and the county detail modal.',
    sourceIds: ['fema-nri'],
  },
  {
    key: 'closing-costs',
    label: 'Closing costs',
    description: 'PA/local realty transfer tax and standard closing-cost line items.',
    usedBy: 'The cash-to-close estimate.',
    sourceIds: ['pa-transfer-tax'],
  },
];

export function sourceById(id: string): DataSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function sourcesFor(topicKey: string): DataSource[] {
  const topic = SOURCE_TOPICS.find((t) => t.key === topicKey);
  if (!topic) return [];
  return topic.sourceIds.map((id) => sourceById(id)).filter((s): s is DataSource => s !== undefined);
}

/**
 * Whether a source's `fetchedAt` date has passed its own `staleAfterDays`
 * threshold (docs/adr/0001-stale-data-threshold.md). Sources with no
 * `staleAfterDays` are never stale by this check -- that policy doesn't
 * apply to them (see the field's doc comment on `DataSource` in dataSources.ts).
 */
export function isSourceStale(source: DataSource, asOf: Date = new Date()): boolean {
  if (source.staleAfterDays === undefined) return false;
  return daysSince(source.fetchedAt, asOf) > source.staleAfterDays;
}

/**
Every source past its own staleness threshold, with the label for how old
it's allowed to be -- what SourcesPanel and the test suite use to flag a
dataset that needs re-fetching rather than let it age silently.
*/
export function staleSources(
  asOf: Date = new Date(),
): { source: DataSource; thresholdLabel: string }[] {
  return SOURCES.filter((s) => isSourceStale(s, asOf)).map((source) => ({
    source,
    thresholdLabel: formatMaxAge(source.staleAfterDays!),
  }));
}
