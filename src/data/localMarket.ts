/**
 * ============================================================================
 *  Delaware County, PA -- real market and tax data.
 * ============================================================================
 *
 * Unlike everything in seed.ts, these are NOT placeholders. Millage figures are
 * transcribed from the county's own published 2026 rate table.
 *
 * Sources (fetched August 2026):
 *  - Millage: Delaware County 2026 Tax Rates, as of 26 Feb 2026
 *    https://delcopa.gov/sites/default/files/2026-02/TaxRate_0.pdf
 *  - Common level ratio factor: PA Dept of Revenue CLR factors, eff. 1 Jul 2026
 *    https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/realty-transfer-tax/common-level-ratios
 *  - County medians: Redfin housing-market pages, 2026
 *
 * ---------------------------------------------------------------------------
 *  HOW PENNSYLVANIA PROPERTY TAX ACTUALLY WORKS -- read this before trusting
 *  any number this file produces.
 * ---------------------------------------------------------------------------
 *
 *  1. Tax is charged on the ASSESSED value, not on what you pay for the house.
 *     Delaware County last reassessed for the 2021 tax year using 2020 market
 *     values, and prices have run well ahead of assessments since.
 *
 *  2. Pennsylvania does NOT reassess on sale. Buying does not reset your
 *     assessment to the purchase price, so two identical neighbouring houses
 *     can carry very different tax bills. This is a real and legal quirk, and
 *     it means the only reliable number is the actual assessment on the actual
 *     property -- look it up before making an offer.
 *
 *  3. To turn a sale price into an estimated bill, this file divides by the
 *     common level ratio factor, which is the state's published estimate of how
 *     far assessments have drifted from market value. That is a county-wide
 *     average. Any individual house can be well off it in either direction.
 *
 *  Treat every figure here as a way to RANK places, not to budget a specific
 *  house.
 */

/**
 * PA Dept of Revenue common level ratio FACTORS, effective 1 July 2026.
 *
 * Each county assesses on its own schedule and its own base year, so raw
 * millage is NOT comparable across county lines -- 40 mills in Delaware County
 * and 40 mills in Montgomery County are wildly different bills. Dividing by the
 * factor converts each to a share of market value, which is comparable.
 *
 * Delaware last reassessed for 2021; Montgomery and Chester are on much older
 * bases, hence their much larger factors.
 */
export const CLR_FACTORS: Record<string, number> = {
  delaware: 1.83,
  montgomery: 3.36,
  chester: 3.27,
  philadelphia: 1.06,
};

/** Kept for callers that only ever look at Delaware County. */
export const DELCO_CLR_FACTOR = CLR_FACTORS.delaware!;

/** Assessed values run at roughly this share of today's market value. */
export const DELCO_ASSESSMENT_RATIO = 1 / DELCO_CLR_FACTOR;

export interface CountyInfo {
  key: string;
  name: string;
  state: string;
  clrFactor: number;
  /** Are the tiles laid out geographically, or just sorted by tax? */
  geographicLayout: boolean;
  note: string;
}

export const COUNTY_INFO: CountyInfo[] = [
  {
    key: 'delaware',
    name: 'Delaware County',
    state: 'PA',
    clrFactor: 1.83,
    geographicLayout: true,
    note: 'Reassessed for 2021, so assessments are closer to market than its neighbours. Enormous spread by township.',
  },
  {
    key: 'montgomery',
    name: 'Montgomery County',
    state: 'PA',
    clrFactor: 3.36,
    geographicLayout: false,
    note: 'Assessments sit on a much older base, so the millage numbers look far larger for a similar bill. County millage below is the 5.462 county rate plus the 0.49 community college levy.',
  },
  {
    key: 'philadelphia',
    name: 'Philadelphia',
    state: 'PA',
    clrFactor: 1.06,
    geographicLayout: false,
    note: 'One citywide rate of 1.3998% on assessed value, close to market. Cheap to buy, but a 3.75% resident wage tax that costs a $115k earner about $4,300 a year — enough to cancel most of the housing saving.',
  },
];

export interface Municipality {
  /** Which county's assessment base and CLR factor this sits on. */
  countyKey: string;
  name: string;
  schoolDistrict: string;
  /** County millage. Same across the county. */
  county: number;
  /** Township or borough millage. */
  local: number;
  /** School district millage -- almost always the largest slice. */
  school: number;
  /** Sum of the three. */
  total: number;
  /** Local earned income tax on wages, as a decimal. */
  wageTax: number;
  /**
   * Typical home value, where I could source one. NULL means not sourced --
   * which is not the same as cheap, and such places are excluded from
   * affordability ranking rather than guessed at.
   *
   * Zillow ZHVI / Redfin, 2026. These move; re-check before acting.
   */
  medianPrice?: number | null;
  /** Where the price came from, so it can be re-checked. */
  priceSource?: string;
}

/**
 * Every municipality in Delaware County, from the county's 2026 rate table.
 * `total` is transcribed rather than recomputed so it can be checked against
 * the source document line by line.
 */
export const DELCO_MUNICIPALITIES: Municipality[] = [
  { countyKey: 'delaware', name: 'Aldan', schoolDistrict: 'William Penn', county: 4.609, local: 5.5, school: 32.86, total: 42.969, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Aston', schoolDistrict: 'Penn Delco', county: 4.609, local: 3.9199, school: 20.7365, total: 29.2654, wageTax: 0.01 , medianPrice: 303063, priceSource: 'Aston/Folsom, Zillow 2026'},
  { countyKey: 'delaware', name: 'Bethel', schoolDistrict: 'Garnet Valley', county: 4.609, local: 1.373, school: 20.1235, total: 26.1055, wageTax: 0 },
  { countyKey: 'delaware', name: 'Brookhaven', schoolDistrict: 'Penn Delco', county: 4.609, local: 4.0, school: 20.7365, total: 29.3455, wageTax: 0.01 , medianPrice: 241515, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Chadds Ford', schoolDistrict: 'Unionville/Chadds Ford', county: 4.609, local: 5.577, school: 19.24, total: 29.426, wageTax: 0 },
  { countyKey: 'delaware', name: 'Chester City', schoolDistrict: 'Chester/Upland', county: 4.609, local: 9.8058, school: 14.49, total: 28.9048, wageTax: 0.0375 },
  { countyKey: 'delaware', name: 'Chester Heights', schoolDistrict: 'Garnet Valley', county: 4.609, local: 0.5971, school: 19.908, total: 25.1141, wageTax: 0 },
  { countyKey: 'delaware', name: 'Chester Township', schoolDistrict: 'Chester/Upland', county: 4.609, local: 5.7, school: 13.68, total: 23.989, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Chichester, Lower', schoolDistrict: 'Chichester', county: 4.609, local: 8.114, school: 30.1106, total: 42.8336, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Chichester, Upper', schoolDistrict: 'Chichester', county: 4.609, local: 3.0352, school: 30.1106, total: 37.7548, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Clifton Heights', schoolDistrict: 'Upper Darby', county: 4.609, local: 11.234, school: 26.523, total: 42.366, wageTax: 0 },
  { countyKey: 'delaware', name: 'Collingdale', schoolDistrict: 'Southeast Delco', county: 4.609, local: 9.315, school: 32.5341, total: 46.4581, wageTax: 0 , medianPrice: 190100, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Colwyn', schoolDistrict: 'William Penn', county: 4.609, local: 18.2, school: 32.86, total: 55.669, wageTax: 0 },
  { countyKey: 'delaware', name: 'Concord', schoolDistrict: 'Garnet Valley', county: 4.609, local: 0.9313, school: 19.908, total: 25.4483, wageTax: 0 },
  { countyKey: 'delaware', name: 'Darby Borough', schoolDistrict: 'William Penn', county: 4.609, local: 18.4, school: 32.86, total: 55.869, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Darby Township', schoolDistrict: 'Southeast Delco', county: 4.609, local: 10.3961, school: 32.5341, total: 47.5392, wageTax: 0 },
  { countyKey: 'delaware', name: 'Darby, Upper', schoolDistrict: 'Upper Darby', county: 4.609, local: 14.02, school: 26.523, total: 45.152, wageTax: 0 , medianPrice: 343266, priceSource: 'Drexel Hill, Zillow 2026'},
  { countyKey: 'delaware', name: 'East Lansdowne', schoolDistrict: 'William Penn', county: 4.609, local: 11.36, school: 32.86, total: 48.829, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Eddystone', schoolDistrict: 'Ridley', county: 4.609, local: 9.1, school: 29.472, total: 43.181, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Edgmont', schoolDistrict: 'Rose Tree Media', county: 4.609, local: 0.59, school: 15.9417, total: 21.1407, wageTax: 0 },
  { countyKey: 'delaware', name: 'Folcroft', schoolDistrict: 'Southeast Delco', county: 4.609, local: 8.26, school: 32.5341, total: 45.4031, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Glenolden', schoolDistrict: 'Interboro', county: 4.609, local: 7.73, school: 26.2302, total: 38.5692, wageTax: 0 , medianPrice: 226211, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Haverford', schoolDistrict: 'Haverford', county: 4.609, local: 4.695, school: 19.6509, total: 28.9549, wageTax: 0 , medianPrice: 550893, priceSource: 'Havertown, Zillow 2026'},
  { countyKey: 'delaware', name: 'Lansdowne', schoolDistrict: 'William Penn', county: 4.609, local: 7.3039, school: 32.86, total: 44.7729, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Marcus Hook', schoolDistrict: 'Chichester', county: 4.609, local: 11.71, school: 30.1106, total: 46.4296, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Marple', schoolDistrict: 'Marple Newtown', county: 4.609, local: 2.783, school: 12.4741, total: 19.8661, wageTax: 0 , medianPrice: 651500, priceSource: 'Marple/Newtown Square median sold, Jun 2026'},
  { countyKey: 'delaware', name: 'Media', schoolDistrict: 'Rose Tree Media', county: 4.609, local: 2.0, school: 15.9417, total: 22.5507, wageTax: 0.01 , medianPrice: 634500, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Middletown', schoolDistrict: 'Rose Tree Media', county: 4.609, local: 1.01, school: 15.9417, total: 21.5607, wageTax: 0 },
  { countyKey: 'delaware', name: 'Millbourne', schoolDistrict: 'Upper Darby', county: 4.609, local: 12.0, school: 26.523, total: 43.132, wageTax: 0 },
  { countyKey: 'delaware', name: 'Morton', schoolDistrict: 'Springfield', county: 4.609, local: 7.4, school: 22.1783, total: 34.1873, wageTax: 0 },
  { countyKey: 'delaware', name: 'Newtown', schoolDistrict: 'Marple Newtown', county: 4.609, local: 2.1658, school: 12.4741, total: 19.2489, wageTax: 0 , medianPrice: 579000, priceSource: 'Newtown Square, Zillow 2026'},
  { countyKey: 'delaware', name: 'Norwood', schoolDistrict: 'Interboro', county: 4.609, local: 8.91, school: 26.2302, total: 39.7492, wageTax: 0 , medianPrice: 263861, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Parkside', schoolDistrict: 'Penn Delco', county: 4.609, local: 9.9, school: 20.7365, total: 35.2455, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Prospect Park', schoolDistrict: 'Interboro', county: 4.609, local: 5.59, school: 26.2302, total: 36.4292, wageTax: 0.01 , medianPrice: 269527, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Providence, Nether', schoolDistrict: 'Wallingford/Swarthmore', county: 4.609, local: 3.7206, school: 30.9182, total: 39.2478, wageTax: 0 },
  { countyKey: 'delaware', name: 'Providence, Upper', schoolDistrict: 'Rose Tree Media', county: 4.609, local: 2.1, school: 15.9417, total: 22.6507, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Radnor', schoolDistrict: 'Radnor', county: 4.609, local: 2.7101, school: 15.7965, total: 23.1156, wageTax: 0 , medianPrice: 1206000, priceSource: 'Redfin 2026, +4% y/y'},
  { countyKey: 'delaware', name: 'Ridley Park', schoolDistrict: 'Ridley', county: 4.609, local: 4.8, school: 29.472, total: 38.881, wageTax: 0.01 , medianPrice: 285259, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Ridley Township', schoolDistrict: 'Ridley', county: 4.609, local: 5.978, school: 29.472, total: 40.059, wageTax: 0 },
  { countyKey: 'delaware', name: 'Rose Valley', schoolDistrict: 'Wallingford/Swarthmore', county: 4.609, local: 1.39, school: 30.9182, total: 36.9172, wageTax: 0 },
  { countyKey: 'delaware', name: 'Rutledge', schoolDistrict: 'Wallingford/Swarthmore', county: 4.609, local: 3.99, school: 31.1711, total: 39.7701, wageTax: 0 },
  { countyKey: 'delaware', name: 'Sharon Hill', schoolDistrict: 'Southeast Delco', county: 4.609, local: 9.5, school: 32.5341, total: 46.6431, wageTax: 0 },
  { countyKey: 'delaware', name: 'Springfield', schoolDistrict: 'Springfield', county: 4.609, local: 4.25, school: 22.1783, total: 31.0373, wageTax: 0 , medianPrice: 514489, priceSource: 'Zillow 2026'},
  { countyKey: 'delaware', name: 'Swarthmore', schoolDistrict: 'Wallingford/Swarthmore', county: 4.609, local: 4.446, school: 31.1711, total: 40.2261, wageTax: 0 , medianPrice: 365000, priceSource: 'Median list, Apr 2026'},
  { countyKey: 'delaware', name: 'Thornbury', schoolDistrict: 'West Chester', county: 4.609, local: 0.0, school: 11.3681, total: 15.9771, wageTax: 0 },
  { countyKey: 'delaware', name: 'Tinicum', schoolDistrict: 'Interboro', county: 4.609, local: 3.0, school: 26.2302, total: 33.8392, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Trainer', schoolDistrict: 'Chichester', county: 4.609, local: 10.65, school: 30.1106, total: 45.3696, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Upland', schoolDistrict: 'Chester/Upland', county: 4.609, local: 2.0, school: 13.68, total: 20.289, wageTax: 0.01 },
  { countyKey: 'delaware', name: 'Yeadon', schoolDistrict: 'William Penn', county: 4.609, local: 10.932, school: 32.86, total: 48.401, wageTax: 0.01 },
];

/**
 * Montgomery County, from the county's own published 2026 millage table.
 * `county` combines the 5.462 county rate and the 0.49 community college levy.
 * Wage tax is the usual 1% resident EIT; a few municipalities differ, so check
 * before relying on it.
 *
 * Source: https://www.montgomerycountypa.gov/622/County-Municipality-Millage-Rates
 */
export const MONTCO_MUNICIPALITIES: Municipality[] = [
  { countyKey: 'montgomery', name: 'Ambler', schoolDistrict: 'Wissahickon', county: 5.952, local: 9.815, school: 26.6, total: 42.367, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Bridgeport', schoolDistrict: 'Upper Merion Area', county: 5.952, local: 13.23, school: 25.03, total: 44.212, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Bryn Athyn', schoolDistrict: 'Bryn Athyn', county: 5.952, local: 12.495, school: 0, total: 18.447, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Collegeville', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 8.55, school: 40.05, total: 54.552, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Conshohocken', schoolDistrict: 'Colonial', county: 5.952, local: 4.5, school: 27.422, total: 37.874, wageTax: 0.01 , medianPrice: 406241, priceSource: 'Zillow 2026'},
  { countyKey: 'montgomery', name: 'East Greenville', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 7.4, school: 29.0962, total: 42.4482, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Green Lane', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 3.5, school: 29.0962, total: 38.5482, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Hatboro', schoolDistrict: 'Hatboro-Horsham', county: 5.952, local: 13.125, school: 36.16, total: 55.237, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Hatfield Borough', schoolDistrict: 'North Penn', county: 5.952, local: 4.25, school: 33.328, total: 43.53, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Jenkintown', schoolDistrict: 'Jenkintown', county: 5.952, local: 11.337, school: 54.4368, total: 71.7258, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lansdale', schoolDistrict: 'North Penn', county: 5.952, local: 8.5, school: 33.328, total: 47.78, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Narberth', schoolDistrict: 'Lower Merion', county: 5.952, local: 9.865, school: 36.5017, total: 52.3187, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Norristown', schoolDistrict: 'Norristown Area', county: 5.952, local: 19, school: 40.1899, total: 65.1419, wageTax: 0.01 , medianPrice: 344717, priceSource: 'Zillow 2026, +2.0% y/y'},
  { countyKey: 'montgomery', name: 'North Wales', schoolDistrict: 'North Penn', county: 5.952, local: 8, school: 33.328, total: 47.28, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Pennsburg', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 9.725, school: 29.0962, total: 44.7732, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Pottstown', schoolDistrict: 'Pottstown', county: 5.952, local: 15.601, school: 45.28, total: 66.833, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Red Hill', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 4.2, school: 29.0962, total: 39.2482, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Rockledge', schoolDistrict: 'Abington', county: 5.952, local: 11.6, school: 39.8992, total: 57.4512, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Royersford', schoolDistrict: 'Spring-Ford Area', county: 5.952, local: 9.95, school: 35.382, total: 51.284, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Schwenksville', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 7.79, school: 40.05, total: 53.792, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Souderton', schoolDistrict: 'Souderton Area', county: 5.952, local: 9.75, school: 37.3842, total: 53.0862, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Telford', schoolDistrict: 'Souderton Area', county: 5.952, local: 7.76, school: 37.3842, total: 51.0962, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Trappe', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 1.97, school: 40.05, total: 47.972, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'West Conshohocken', schoolDistrict: 'Upper Merion Area', county: 5.952, local: 1.18, school: 25.03, total: 32.162, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Abington', schoolDistrict: 'Abington', county: 5.952, local: 6.172, school: 39.8992, total: 52.0232, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Cheltenham', schoolDistrict: 'Cheltenham', county: 5.952, local: 10.8512, school: 56.68, total: 73.4832, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Douglass', schoolDistrict: 'Boyertown Area', county: 5.952, local: 3.5, school: 33.31, total: 42.762, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'East Norriton', schoolDistrict: 'Norristown Area', county: 5.952, local: 2.727, school: 40.1899, total: 48.8689, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Franconia', schoolDistrict: 'Souderton Area', county: 5.952, local: 2.48, school: 37.3842, total: 45.8162, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Hatfield Township', schoolDistrict: 'North Penn', county: 5.952, local: 5.221, school: 33.328, total: 44.501, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Horsham', schoolDistrict: 'Hatboro-Horsham', county: 5.952, local: 2.725, school: 36.16, total: 44.837, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Limerick', schoolDistrict: 'Spring-Ford Area', county: 5.952, local: 3.483, school: 35.382, total: 44.817, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Frederick', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 3.9652, school: 40.05, total: 49.9672, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Gwynedd', schoolDistrict: 'Wissahickon', county: 5.952, local: 1.223, school: 26.6, total: 33.775, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Merion', schoolDistrict: 'Lower Merion', county: 5.952, local: 4.819, school: 36.5017, total: 47.2727, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Moreland', schoolDistrict: 'Lower Moreland', county: 5.952, local: 6.918, school: 45.2943, total: 58.1643, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Pottsgrove', schoolDistrict: 'Pottsgrove', county: 5.952, local: 4.868, school: 43.128, total: 53.948, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Providence', schoolDistrict: 'Methacton', county: 5.952, local: 4.2534, school: 37.6116, total: 47.817, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Salford', schoolDistrict: 'Souderton Area', county: 5.952, local: 1.4, school: 37.3842, total: 44.7362, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Marlborough', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 3.37, school: 29.0962, total: 38.4182, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Montgomery Township', schoolDistrict: 'North Penn', county: 5.952, local: 3.94, school: 33.328, total: 43.22, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'New Hanover', schoolDistrict: 'Boyertown Area', county: 5.952, local: 2.152, school: 33.31, total: 41.414, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Perkiomen', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 0.95, school: 40.05, total: 46.952, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Plymouth', schoolDistrict: 'Colonial', county: 5.952, local: 3.8, school: 27.422, total: 37.174, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Lower Salford', schoolDistrict: 'Souderton Area', county: 5.952, local: 3.509, school: 37.3842, total: 46.8452, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Skippack', schoolDistrict: 'Perkiomen Valley', county: 5.952, local: 0.8616, school: 40.05, total: 46.8636, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Springfield Township', schoolDistrict: 'Springfield Twp (Montco)', county: 5.952, local: 5.008, school: 42.0794, total: 53.0394, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Towamencin', schoolDistrict: 'North Penn', county: 5.952, local: 6.089, school: 33.328, total: 45.369, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Dublin', schoolDistrict: 'Upper Dublin', county: 5.952, local: 7.382, school: 41.1418, total: 54.4758, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Frederick', schoolDistrict: 'Boyertown Area', county: 5.952, local: 1.62, school: 33.31, total: 40.882, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Gwynedd', schoolDistrict: 'North Penn', county: 5.952, local: 2.671, school: 33.328, total: 41.951, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Hanover', schoolDistrict: 'Upper Perkiomen', county: 5.952, local: 1.45, school: 29.0962, total: 36.4982, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Merion', schoolDistrict: 'Upper Merion Area', county: 5.952, local: 5.619, school: 25.03, total: 36.601, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Moreland', schoolDistrict: 'Upper Moreland', county: 5.952, local: 7.521, school: 41.2, total: 54.673, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Pottsgrove', schoolDistrict: 'Pottsgrove', county: 5.952, local: 4.75, school: 43.128, total: 53.83, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Providence', schoolDistrict: 'Spring-Ford Area', county: 5.952, local: 2.75, school: 35.382, total: 44.084, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Upper Salford', schoolDistrict: 'Souderton Area', county: 5.952, local: 1.5, school: 37.3842, total: 44.8362, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'West Norriton', schoolDistrict: 'Norristown Area', county: 5.952, local: 4.76, school: 40.1899, total: 50.9019, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'West Pottsgrove', schoolDistrict: 'Pottsgrove', county: 5.952, local: 7.5, school: 43.128, total: 56.58, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Whitemarsh', schoolDistrict: 'Colonial', county: 5.952, local: 2.3633, school: 27.422, total: 35.7373, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Whitpain', schoolDistrict: 'Wissahickon', county: 5.952, local: 3.95, school: 26.6, total: 36.502, wageTax: 0.01 },
  { countyKey: 'montgomery', name: 'Worcester', schoolDistrict: 'Methacton', county: 5.952, local: 0.05, school: 37.6116, total: 43.6136, wageTax: 0.01 },
];

/**
 * Philadelphia is a single taxing district: 1.3998% of assessed value, split
 * between the city and the school district. Expressed here as millage for
 * consistency with the suburbs.
 *
 * Two things this table cannot show. The homestead exclusion knocks a slice off
 * the assessed value of an owner-occupied home, worth several hundred a year.
 * And the 3.75% resident wage tax dwarfs both -- roughly $3,750 a year on a
 * $100,000 salary, which is the real reason the cheap house prices are not the
 * bargain they look.
 */
export const PHILADELPHIA_MUNICIPALITIES: Municipality[] = [
  { countyKey: 'philadelphia', name: 'Philadelphia', schoolDistrict: 'School District of Philadelphia', county: 6.317, local: 0, school: 7.681, total: 13.998, wageTax: 0.0375 , medianPrice: 275000, priceSource: 'Redfin median sale, Mar 2026'},
];

/** Everything, for the map and the comparison table. */
export const ALL_MUNICIPALITIES: Municipality[] = [
  ...DELCO_MUNICIPALITIES,
  ...MONTCO_MUNICIPALITIES,
  ...PHILADELPHIA_MUNICIPALITIES,
];

export function municipalitiesIn(countyKey: string): Municipality[] {
  return ALL_MUNICIPALITIES.filter((m) => m.countyKey === countyKey);
}

export interface CountyMarket {
  name: string;
  state: string;
  /** Median sale price, most recent figure found. */
  medianPrice: number;
  /** What that figure is and when, so it can be re-checked. */
  priceNote: string;
  /** Typical all-in effective property tax rate on MARKET value, as a decimal. */
  effectiveTaxRate: number;
  note: string;
}

/**
 * Delaware County and its neighbours. Effective rates are all-in (county +
 * municipal + school) as a share of market value, so they are comparable to
 * each other even though each state assesses differently.
 */
export const NEIGHBOURING_COUNTIES: CountyMarket[] = [
  {
    name: 'Delaware County',
    state: 'PA',
    medianPrice: 366_900,
    priceNote: 'Redfin median sale price, May 2026 (down 2.2% year on year)',
    effectiveTaxRate: 0.0175,
    note: 'Enormous spread by township: roughly 0.9% in Thornbury and Marple to over 3% in the William Penn and Southeast Delco districts. Which side of that line you land on is worth more than almost any other decision here.',
  },
  {
    name: 'Chester County',
    state: 'PA',
    medianPrice: 538_900,
    priceNote: 'US Census median home value (another source says $485,600)',
    effectiveTaxRate: 0.013,
    note: 'Lower tax rate but much higher prices, so the monthly cost is usually worse. Strong schools.',
  },
  {
    name: 'Montgomery County',
    state: 'PA',
    medianPrice: 430_000,
    priceNote: 'Redfin median sale price, February 2026 (down 3.4% year on year)',
    effectiveTaxRate: 0.014,
    note: 'Middle ground on both price and tax. Wide variation by township, same as Delco.',
  },
  {
    name: 'Philadelphia County',
    state: 'PA',
    medianPrice: 275_000,
    priceNote: 'Redfin median sale price, March 2026 (flat year on year)',
    effectiveTaxRate: 0.0138,
    note: 'Much cheaper to buy and a single citywide rate, but a 3.75% wage tax on residents — for a $125k salary that is roughly $4,700 a year, which cancels most of the housing saving. Schools are the other consideration.',
  },
];

/** The CLR factor for whichever county a municipality sits in. */
export function clrFactorFor(m: Municipality): number {
  return CLR_FACTORS[m.countyKey] ?? DELCO_CLR_FACTOR;
}

/**
 * Estimated assessed value behind a given market price.
 * Uses the county's own factor -- this is what makes cross-county comparison
 * mean anything.
 */
export function estimatedAssessedValue(marketPrice: number, m?: Municipality): number {
  return marketPrice / (m ? clrFactorFor(m) : DELCO_CLR_FACTOR);
}

/**
 * Estimated annual property tax on a Delaware County house.
 *
 * Remember: this converts a SALE PRICE into a bill using a county-wide average
 * drift factor. The real bill depends on that specific property's assessment,
 * which does not change when you buy it.
 */
export function estimatedAnnualTax(marketPrice: number, m: Municipality): number {
  return (estimatedAssessedValue(marketPrice, m) * m.total) / 1000;
}

/** The same figure per month, which is how it actually turns up in escrow. */
export function estimatedMonthlyTax(marketPrice: number, m: Municipality): number {
  return estimatedAnnualTax(marketPrice, m) / 12;
}

/** Effective tax rate on market value for a municipality, as a decimal. */
export function effectiveRate(m: Municipality): number {
  return m.total / 1000 / clrFactorFor(m);
}

/** Cheapest and dearest places to own the same house, by tax alone. */
export function rankedByTax(countyKey?: string): Municipality[] {
  const pool = countyKey ? municipalitiesIn(countyKey) : ALL_MUNICIPALITIES;
  // Sorted by EFFECTIVE rate, not raw millage, so counties can be compared.
  return [...pool].sort((a, b) => effectiveRate(a) - effectiveRate(b));
}
