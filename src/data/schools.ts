/**
 * School district performance for Delaware and Montgomery County, PA (plus
 * the two Chester County districts that Delco municipalities feed into).
 *
 * Source: Pennsylvania's own Future Ready PA Index (SY2024-25), downloaded
 * directly from futurereadypa.org/Home/DataFiles — see DISTRICT_AUN below
 * and `sources.ts` for the file IDs and dates. The workbook publishes
 * figures per SCHOOL BUILDING, keyed by AUN, not per district — there is no
 * PDE-published district aggregate. The numbers below are this district's
 * schools averaged unweighted (no enrollment figures are in the workbook to
 * weight by), which is an honest approximation, not an official statistic.
 * `sourceSchoolCount` on each entry records how many buildings went into
 * that average, so a 1-school average (most graduation rates) can be told
 * apart from a 17-school one (North Penn, West Chester).
 *
 * Only districts I could actually match to an AUN are filled in. The rest
 * are deliberately left null rather than guessed, because inventing a
 * school rating is the kind of made-up number that gets acted on. Bryn
 * Athyn SD does not appear in the workbook at all — it has no schools of
 * its own to report on.
 *
 * Proficiency is the share of students at or above proficient on the PSSA
 * (grades 3-8) and Keystone Algebra I / Literature exams (state-average
 * blended across grades, SY2024-25): 41.7% math, 49.9% ELA. Graduation is
 * the 4-year cohort rate (statewide 88.0%). Persistent attendance is the
 * share of students attending 90%+ of school days (statewide 79.6%) — the
 * workbook's chronic-absenteeism column was blank for SY2024-25, so this is
 * the closest populated attendance measure.
 */

export interface SchoolDistrict {
  name: string;
  /**
  Share proficient in maths (PSSA/Keystone Algebra I), as a percentage, averaged
  across the district's schools. Null when not sourced.
  */
  mathProficiency: number | null;
  /**
  Share proficient in ELA/reading (PSSA/Keystone Literature), as a percentage,
  averaged across the district's schools. Null when not sourced.
  */
  readingProficiency: number | null;
  /**
  4-year cohort graduation rate, as a percentage. High-school buildings only,
  so most districts average over just one or two schools. Null when not sourced.
  */
  graduationRate: number | null;
  /**
  Share of students attending 90%+ of school days, as a percentage, averaged
  across the district's schools. Null when not sourced.
  */
  persistentAttendance: number | null;
  /**
  How many school buildings the proficiency/attendance averages are drawn from.
  */
  sourceSchoolCount: number | null;
  note: string | null;
}

export const PA_STATE_AVERAGE = {
  math: 41.7,
  reading: 49.9,
  graduation: 88,
  persistentAttendance: 79.6,
};

/**
 * Repo key -> official PDE district name and AUN, so the source is
 * re-fetchable and auditable rather than just baked-in numbers. AUN is the
 * real join key in the Future Ready PA Index files; district names there
 * (e.g. "Penn-Delco SD") never match the repo's shorter map-label keys.
 */
export const DISTRICT_AUN: Record<string, { officialName: string; aun: string }> = {
  Springfield: { officialName: 'Springfield SD', aun: '125238502' },
  'Rose Tree Media': { officialName: 'Rose Tree Media SD', aun: '125237903' },
  'Garnet Valley': { officialName: 'Garnet Valley SD', aun: '125234103' },
  'Marple Newtown': { officialName: 'Marple Newtown SD', aun: '125235502' },
  'Penn Delco': { officialName: 'Penn-Delco SD', aun: '125236903' },
  Ridley: { officialName: 'Ridley SD', aun: '125237702' },
  Radnor: { officialName: 'Radnor Township SD', aun: '125237603' },
  Haverford: { officialName: 'Haverford Township SD', aun: '125234502' },
  'Wallingford/Swarthmore': { officialName: 'Wallingford-Swarthmore SD', aun: '125239603' },
  'Unionville/Chadds Ford': { officialName: 'Unionville-Chadds Ford SD', aun: '124158503' },
  'West Chester': { officialName: 'West Chester Area SD', aun: '124159002' },
  Interboro: { officialName: 'Interboro SD', aun: '125235103' },
  Chichester: { officialName: 'Chichester SD', aun: '125231303' },
  'Upper Darby': { officialName: 'Upper Darby SD', aun: '125239452' },
  'William Penn': { officialName: 'William Penn SD', aun: '125239652' },
  'Southeast Delco': { officialName: 'Southeast Delco SD', aun: '125238402' },
  'Chester/Upland': { officialName: 'Chester-Upland SD', aun: '125231232' },
  Wissahickon: { officialName: 'Wissahickon SD', aun: '123469303' },
  'Upper Merion Area': { officialName: 'Upper Merion Area SD', aun: '123468402' },
  'Perkiomen Valley': { officialName: 'Perkiomen Valley SD', aun: '123466103' },
  Colonial: { officialName: 'Colonial SD', aun: '123461602' },
  'Upper Perkiomen': { officialName: 'Upper Perkiomen SD', aun: '123468603' },
  'Hatboro-Horsham': { officialName: 'Hatboro-Horsham SD', aun: '123463603' },
  'North Penn': { officialName: 'North Penn SD', aun: '123465702' },
  Jenkintown: { officialName: 'Jenkintown SD', aun: '123463803' },
  'Lower Merion': { officialName: 'Lower Merion SD', aun: '123464502' },
  'Norristown Area': { officialName: 'Norristown Area SD', aun: '123465602' },
  Pottstown: { officialName: 'Pottstown SD', aun: '123466403' },
  Abington: { officialName: 'Abington SD', aun: '123460302' },
  'Spring-Ford Area': { officialName: 'Spring-Ford Area SD', aun: '123467303' },
  'Souderton Area': { officialName: 'Souderton Area SD', aun: '123467103' },
  Cheltenham: { officialName: 'Cheltenham SD', aun: '123461302' },
  'Boyertown Area': { officialName: 'Boyertown Area SD', aun: '114060753' },
  'Lower Moreland': { officialName: 'Lower Moreland Township SD', aun: '123464603' },
  Methacton: { officialName: 'Methacton SD', aun: '123465303' },
  Pottsgrove: { officialName: 'Pottsgrove SD', aun: '123466303' },
  'Springfield Twp (Montco)': { officialName: 'Springfield Township SD', aun: '123467203' },
  'Upper Dublin': { officialName: 'Upper Dublin SD', aun: '123468303' },
  'Upper Moreland': { officialName: 'Upper Moreland Township SD', aun: '123468503' },
  'School District of Philadelphia': { officialName: 'Philadelphia City SD', aun: '126515001' },
};

export const SCHOOL_DISTRICTS: Record<string, SchoolDistrict> = {
  Springfield: {
    name: 'Springfield',
    mathProficiency: 76.7,
    readingProficiency: 82.8,
    graduationRate: 98.2,
    persistentAttendance: 89.8,
    sourceSchoolCount: 4,
    note: 'One of the strongest results in the county on every measure.',
  },
  'Rose Tree Media': {
    name: 'Rose Tree Media',
    mathProficiency: 73.8,
    readingProficiency: 79.3,
    graduationRate: 97.5,
    persistentAttendance: 92.4,
    sourceSchoolCount: 6,
    note: 'Strong results and low millage — the best combination in the county.',
  },
  'Garnet Valley': {
    name: 'Garnet Valley',
    mathProficiency: 70.5,
    readingProficiency: 75,
    graduationRate: 96.8,
    persistentAttendance: 94.9,
    sourceSchoolCount: 4,
    note: 'Well above the state average across the board, and low millage too.',
  },
  'Marple Newtown': {
    name: 'Marple Newtown',
    mathProficiency: 59.9,
    readingProficiency: 62,
    graduationRate: 93.4,
    persistentAttendance: 98.5,
    sourceSchoolCount: 6,
    note: 'The lowest school millage in the county at 12.47, and still comfortably above state average.',
  },
  'Penn Delco': {
    name: 'Penn Delco',
    mathProficiency: 44.1,
    readingProficiency: 54.8,
    graduationRate: 95.5,
    persistentAttendance: 91.3,
    sourceSchoolCount: 6,
    note: 'Above the state average in both subjects.',
  },
  Ridley: {
    name: 'Ridley',
    mathProficiency: 46.9,
    readingProficiency: 47.9,
    graduationRate: 92.6,
    persistentAttendance: 87.6,
    sourceSchoolCount: 9,
    note: 'Roughly at the state average — middle of the pack countywide.',
  },
  Radnor: {
    name: 'Radnor',
    mathProficiency: 82.3,
    readingProficiency: 84,
    graduationRate: 97.2,
    persistentAttendance: 93,
    sourceSchoolCount: 5,
    note: 'Among the strongest districts in the county, but house prices reflect it.',
  },
  Haverford: {
    name: 'Haverford',
    mathProficiency: 77.2,
    readingProficiency: 78.9,
    graduationRate: 96,
    persistentAttendance: 95.7,
    sourceSchoolCount: 7,
    note: null,
  },
  'Wallingford/Swarthmore': {
    name: 'Wallingford/Swarthmore',
    mathProficiency: 76.8,
    readingProficiency: 80.3,
    graduationRate: 97,
    persistentAttendance: 94.1,
    sourceSchoolCount: 5,
    note: 'Well regarded, and the results back it up — but among the highest school millage in the county at 30.9-31.2.',
  },
  'Unionville/Chadds Ford': {
    name: 'Unionville/Chadds Ford',
    mathProficiency: 75.9,
    readingProficiency: 80.9,
    graduationRate: 98.1,
    persistentAttendance: 96.5,
    sourceSchoolCount: 6,
    note: 'Top-tier district, mostly in Chester County.',
  },
  'West Chester': {
    name: 'West Chester',
    mathProficiency: 61.1,
    readingProficiency: 66.7,
    graduationRate: 97.2,
    persistentAttendance: 91.9,
    sourceSchoolCount: 17,
    note: 'Serves Thornbury, which has the lowest total millage in Delaware County. Large district — 17 buildings behind this average.',
  },
  Interboro: {
    name: 'Interboro',
    mathProficiency: 32,
    readingProficiency: 46.3,
    graduationRate: 96.1,
    persistentAttendance: 82.7,
    sourceSchoolCount: 5,
    note: 'Below the state average on proficiency, but graduation rate is strong.',
  },
  Chichester: {
    name: 'Chichester',
    mathProficiency: 43.8,
    readingProficiency: 46.8,
    graduationRate: 89.3,
    persistentAttendance: 77.2,
    sourceSchoolCount: 6,
    note: 'Roughly at the state average on proficiency; attendance is a weaker spot.',
  },
  'Upper Darby': {
    name: 'Upper Darby',
    mathProficiency: 23.6,
    readingProficiency: 26.1,
    graduationRate: 85.9,
    persistentAttendance: 76.5,
    sourceSchoolCount: 12,
    note: 'Very large and diverse district; high millage and below-average results.',
  },
  'William Penn': {
    name: 'William Penn',
    mathProficiency: 19.1,
    readingProficiency: 28.6,
    graduationRate: 84.1,
    persistentAttendance: 69,
    sourceSchoolCount: 10,
    note: 'Highest school millage in the county at 32.86, and among the lowest-performing.',
  },
  'Southeast Delco': {
    name: 'Southeast Delco',
    mathProficiency: 19.2,
    readingProficiency: 34.6,
    graduationRate: 82,
    persistentAttendance: 64.4,
    sourceSchoolCount: 5,
    note: 'School millage 32.53 — the highest tax burden in the county for weak results.',
  },
  'Chester/Upland': {
    name: 'Chester/Upland',
    mathProficiency: 7.4,
    readingProficiency: 13.2,
    graduationRate: 75.8,
    persistentAttendance: 42.7,
    sourceSchoolCount: 7,
    note: 'Financially distressed district under state oversight. The weakest results and attendance of any district here by a wide margin.',
  },
  Wissahickon: {
    name: 'Wissahickon',
    mathProficiency: 72.9,
    readingProficiency: 75.7,
    graduationRate: 97.2,
    persistentAttendance: 91.8,
    sourceSchoolCount: 6,
    note: null,
  },
  'Upper Merion Area': {
    name: 'Upper Merion Area',
    mathProficiency: 53.6,
    readingProficiency: 56.1,
    graduationRate: 91.1,
    persistentAttendance: 88.2,
    sourceSchoolCount: 7,
    note: null,
  },
  'Perkiomen Valley': {
    name: 'Perkiomen Valley',
    mathProficiency: 64,
    readingProficiency: 72.3,
    graduationRate: 95.4,
    persistentAttendance: 94.8,
    sourceSchoolCount: 7,
    note: null,
  },
  Colonial: {
    name: 'Colonial',
    mathProficiency: 78.1,
    readingProficiency: 71.4,
    graduationRate: 96.5,
    persistentAttendance: 95.4,
    sourceSchoolCount: 7,
    note: 'Among the strongest results in Montgomery County.',
  },
  'Upper Perkiomen': {
    name: 'Upper Perkiomen',
    mathProficiency: 63.3,
    readingProficiency: 60.6,
    graduationRate: 91.9,
    persistentAttendance: 87.8,
    sourceSchoolCount: 5,
    note: null,
  },
  'Hatboro-Horsham': {
    name: 'Hatboro-Horsham',
    mathProficiency: 55.6,
    readingProficiency: 57.2,
    graduationRate: 96.3,
    persistentAttendance: 89.8,
    sourceSchoolCount: 6,
    note: null,
  },
  'North Penn': {
    name: 'North Penn',
    mathProficiency: 60.6,
    readingProficiency: 61.8,
    graduationRate: 94.3,
    persistentAttendance: 92.3,
    sourceSchoolCount: 17,
    note: 'Large district — 17 buildings behind this average.',
  },
  Jenkintown: {
    name: 'Jenkintown',
    mathProficiency: 49.4,
    readingProficiency: 65.9,
    graduationRate: 97.9,
    persistentAttendance: 91.9,
    sourceSchoolCount: 2,
    note: 'Very high school millage (54.44) — one of the highest in either county.',
  },
  'Lower Merion': {
    name: 'Lower Merion',
    mathProficiency: 82.3,
    readingProficiency: 83.1,
    graduationRate: 96.6,
    persistentAttendance: 93.8,
    sourceSchoolCount: 11,
    note: 'Among the strongest results of any district here, matching its reputation and prices.',
  },
  'Norristown Area': {
    name: 'Norristown Area',
    mathProficiency: 28.8,
    readingProficiency: 26.4,
    graduationRate: 59.6,
    persistentAttendance: 71.9,
    sourceSchoolCount: 11,
    note: 'Graduation rate (59.6%, 2 high schools) is a real outlier — well below every other district here.',
  },
  Pottstown: {
    name: 'Pottstown',
    mathProficiency: 32.2,
    readingProficiency: 37.5,
    graduationRate: 82.9,
    persistentAttendance: 69.9,
    sourceSchoolCount: 6,
    note: 'Highest total millage in Montgomery County alongside below-average results.',
  },
  Abington: {
    name: 'Abington',
    mathProficiency: 60.2,
    readingProficiency: 66,
    graduationRate: 93.9,
    persistentAttendance: 88,
    sourceSchoolCount: 9,
    note: null,
  },
  'Spring-Ford Area': {
    name: 'Spring-Ford Area',
    mathProficiency: 69.4,
    readingProficiency: 66.8,
    graduationRate: 96.5,
    persistentAttendance: 92.7,
    sourceSchoolCount: 11,
    note: null,
  },
  'Souderton Area': {
    name: 'Souderton Area',
    mathProficiency: 61.3,
    readingProficiency: 60.5,
    graduationRate: 93.7,
    persistentAttendance: 87.8,
    sourceSchoolCount: 9,
    note: null,
  },
  Cheltenham: {
    name: 'Cheltenham',
    mathProficiency: 49.2,
    readingProficiency: 52.1,
    graduationRate: 94.1,
    persistentAttendance: 85.4,
    sourceSchoolCount: 7,
    note: 'Highest total millage in this data set (73.48).',
  },
  'Boyertown Area': {
    name: 'Boyertown Area',
    mathProficiency: 54.6,
    readingProficiency: 53.7,
    graduationRate: 90.6,
    persistentAttendance: 90.8,
    sourceSchoolCount: 9,
    note: null,
  },
  'Lower Moreland': {
    name: 'Lower Moreland',
    mathProficiency: 68.8,
    readingProficiency: 68.8,
    graduationRate: 97.1,
    persistentAttendance: 93.5,
    sourceSchoolCount: 4,
    note: null,
  },
  Methacton: {
    name: 'Methacton',
    mathProficiency: 67.9,
    readingProficiency: 65.2,
    graduationRate: 94.5,
    persistentAttendance: 92.5,
    sourceSchoolCount: 7,
    note: null,
  },
  Pottsgrove: {
    name: 'Pottsgrove',
    mathProficiency: 39.2,
    readingProficiency: 51.9,
    graduationRate: 92.2,
    persistentAttendance: 84.2,
    sourceSchoolCount: 3,
    note: null,
  },
  'Springfield Twp (Montco)': {
    name: 'Springfield Twp (Montco)',
    mathProficiency: 59.1,
    readingProficiency: 71.1,
    graduationRate: 96.2,
    persistentAttendance: 92.6,
    sourceSchoolCount: 3,
    note: null,
  },
  'Upper Dublin': {
    name: 'Upper Dublin',
    mathProficiency: 73.3,
    readingProficiency: 77.9,
    graduationRate: 96.9,
    persistentAttendance: 93.7,
    sourceSchoolCount: 6,
    note: null,
  },
  'Upper Moreland': {
    name: 'Upper Moreland',
    mathProficiency: 48.6,
    readingProficiency: 55.5,
    graduationRate: 94.4,
    persistentAttendance: 90,
    sourceSchoolCount: 3,
    note: null,
  },
  'School District of Philadelphia': {
    name: 'School District of Philadelphia',
    mathProficiency: 20.8,
    readingProficiency: 31.9,
    graduationRate: 81.1,
    persistentAttendance: 61.1,
    sourceSchoolCount: 217,
    note: 'Citywide average across 217 buildings — a huge district with enormous school-to-school variation this figure hides.',
  },
  'Bryn Athyn': {
    name: 'Bryn Athyn',
    mathProficiency: null,
    readingProficiency: null,
    graduationRate: null,
    persistentAttendance: null,
    sourceSchoolCount: null,
    note: 'Does not appear in the Future Ready PA Index — the district operates no schools of its own (0 school-district millage; students are tuitioned elsewhere).',
  },
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
  if (d.mathProficiency !== null && d.readingProficiency !== null) {
    parts.push(`${d.mathProficiency}% maths / ${d.readingProficiency}% reading`);
  }
  if (d.graduationRate !== null) parts.push(`${d.graduationRate}% graduate`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * A coarse band for colour-coding, derived only from sourced figures.
 * "unknown" is a first-class answer here on purpose. "strong" means
 * comfortably above the state average (15+ points), not just above it.
 */
export function ratingBand(name: string): 'strong' | 'above' | 'below' | 'unknown' {
  const d = districtFor(name);
  if (!d) return 'unknown';
  if (d.mathProficiency !== null) {
    if (d.mathProficiency >= PA_STATE_AVERAGE.math + 15) return 'strong';
    return d.mathProficiency >= PA_STATE_AVERAGE.math ? 'above' : 'below';
  }
  return 'unknown';
}
