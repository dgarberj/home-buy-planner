/**
 * School district performance for Delaware County, PA.
 *
 * IMPORTANT: only districts I could actually source are filled in. The rest are
 * deliberately left null rather than guessed, because inventing a school rating
 * is the kind of made-up number that gets acted on. If a district shows
 * "not sourced", go and look it up before it influences a decision.
 *
 * Sources (August 2026):
 *  - PublicSchoolReview district profiles (proficiency %, PA rank)
 *  - delco.today / montco.today coverage of the 2025 PSSA + Keystone rankings
 *  - Niche 2024 national district rankings
 *
 * Proficiency is the share of students at or above proficient on the PSSA.
 * Pennsylvania averages for comparison: 38% math, 56% reading.
 */

export interface SchoolDistrict {
  name: string;
  /** Share proficient in maths, as a percentage. Null when not sourced. */
  mathProficiency: number | null;
  /** Share proficient in reading, as a percentage. Null when not sourced. */
  readingProficiency: number | null;
  /** Rank among Pennsylvania districts on 2025 PSSA/Keystone results. */
  paRank2025: number | null;
  /** Niche's 2024 national district ranking. */
  nationalRank: number | null;
  note: string | null;
}

export const PA_AVERAGE = { math: 38, reading: 56 };

export const SCHOOL_DISTRICTS: Record<string, SchoolDistrict> = {
  Springfield: {
    name: 'Springfield',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: 14,
    nationalRank: 311,
    note: 'Highest-ranked district in the county on 2025 state test results.',
  },
  'Rose Tree Media': {
    name: 'Rose Tree Media',
    mathProficiency: 71,
    readingProficiency: 81,
    paRank2025: 24,
    nationalRank: 518,
    note: 'Strong results and low millage — the best combination in the county.',
  },
  'Garnet Valley': {
    name: 'Garnet Valley',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: 29,
    nationalRank: 263,
    note: 'Highest national ranking in the county. Low millage too.',
  },
  'Marple Newtown': {
    name: 'Marple Newtown',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: 74,
    nationalRank: 360,
    note: 'The lowest school millage in the county at 12.47, and still well ranked.',
  },
  'Penn Delco': {
    name: 'Penn Delco',
    mathProficiency: 42,
    readingProficiency: 61,
    paRank2025: null,
    nationalRank: null,
    note: 'Ranked #231 of 677 PA districts on 2022-23 results. Above the state average in both subjects. Middle-school maths is the weak spot at 29% proficient.',
  },
  Ridley: {
    name: 'Ridley',
    mathProficiency: 36,
    readingProficiency: 54,
    paRank2025: null,
    nationalRank: null,
    note: 'Average testing rank 5/10 — bottom half of PA districts. Below the state average in both subjects.',
  },
  Radnor: {
    name: 'Radnor',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: null,
    nationalRank: null,
    note: 'Consistently among the strongest districts in the state, but house prices reflect it.',
  },
  Haverford: {
    name: 'Haverford',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: null,
    nationalRank: null,
    note: null,
  },
  'Wallingford/Swarthmore': {
    name: 'Wallingford/Swarthmore',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: null,
    nationalRank: null,
    note: 'Well regarded, but among the highest school millage in the county at 30.9-31.2.',
  },
  'Unionville/Chadds Ford': {
    name: 'Unionville/Chadds Ford',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: null,
    nationalRank: null,
    note: 'Top-tier district, mostly in Chester County.',
  },
  'West Chester': {
    name: 'West Chester',
    mathProficiency: null,
    readingProficiency: null,
    paRank2025: null,
    nationalRank: null,
    note: 'Serves Thornbury, which has the lowest total millage in Delaware County.',
  },
  Interboro: { name: 'Interboro', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: null },
  Chichester: { name: 'Chichester', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: null },
  'Upper Darby': { name: 'Upper Darby', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: 'Very large and diverse district; high millage.' },
  'William Penn': { name: 'William Penn', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: 'Highest school millage in the county at 32.86, and among the lowest-performing.' },
  'Southeast Delco': { name: 'Southeast Delco', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: 'School millage 32.53 — the highest tax burden in the county for weak results.' },
  'Chester/Upland': { name: 'Chester/Upland', mathProficiency: null, readingProficiency: null, paRank2025: null, nationalRank: null, note: 'Financially distressed district under state oversight.' },
};

export function districtFor(name: string): SchoolDistrict | null {
  return SCHOOL_DISTRICTS[name] ?? null;
}

/**
 * A compact rating for the map tooltip, where there is only room for one line.
 * Returns null when nothing is sourced, so the caller can say so honestly
 * rather than implying an absence of data is a bad score.
 */
export function ratingSummary(name: string): string | null {
  const d = districtFor(name);
  if (!d) return null;
  const parts: string[] = [];
  if (d.paRank2025 !== null) parts.push(`PA #${d.paRank2025}`);
  if (d.mathProficiency !== null && d.readingProficiency !== null) {
    parts.push(`${d.mathProficiency}% maths / ${d.readingProficiency}% reading`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * A coarse band for colour-coding, derived only from sourced figures.
 * "unknown" is a first-class answer here on purpose.
 */
export function ratingBand(name: string): 'strong' | 'above' | 'below' | 'unknown' {
  const d = districtFor(name);
  if (!d) return 'unknown';
  if (d.paRank2025 !== null && d.paRank2025 <= 100) return 'strong';
  if (d.mathProficiency !== null) {
    return d.mathProficiency >= PA_AVERAGE.math ? 'above' : 'below';
  }
  return 'unknown';
}
