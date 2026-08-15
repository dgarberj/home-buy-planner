/**
 * County-level natural-hazard risk from FEMA's National Risk Index (NRI).
 *
 * Every score here is a NATIONAL PERCENTILE (0-100), not an absolute
 * probability -- "94.4" for inland flooding means Delaware County's flood
 * risk is higher than about 94% of US counties, largely because a dense,
 * built-up county has more exposed people and property, not necessarily a
 * worse flood-per-acre. Read these as "how exposed is this county compared
 * to the rest of the country", not "how likely is a flood this year".
 *
 * Only county-level data is available -- the NRI does not publish at
 * municipality/township granularity, so (unlike the tax and school data)
 * every town in a county shares the same figures here. That is a real
 * limit, not a rounding choice: local flood risk in particular varies a lot
 * street to street depending on distance from a creek, which this cannot
 * capture.
 *
 * Source: FEMA National Risk Index, via the public ArcGIS FeatureServer
 * (see sources.ts, id 'fema-nri'). No API key or license required.
 */

export interface CountyClimateRisk {
  countyKey: string;
  /**
  Composite risk score across all 18 hazards, national percentile.
  */
  riskScore: number;
  riskRating: string;
  /**
  Expected annual loss (building + population + agriculture), national percentile.
  */
  expectedAnnualLossScore: number;
  expectedAnnualLossRating: string;
  /**
  Inland flooding -- the hazard PA's rivers and creeks actually pose (FEMA calls this "riverine flooding").
  */
  floodRiskScore: number;
  floodRiskRating: string;
  wildfireRiskScore: number;
  wildfireRiskRating: string;
  heatWaveRiskScore: number;
  heatWaveRiskRating: string;
  hurricaneRiskScore: number;
  strongWindRiskScore: number;
  earthquakeRiskScore: number;
  /**
  How exposed the population is to disaster impact (age, income, language, etc.),
  national percentile. Higher = more vulnerable.
  */
  socialVulnerabilityScore: number;
  /**
  Capacity to recover from a disaster, national percentile. Higher = more resilient.
  */
  communityResilienceScore: number;
  note: string;
}

export const COUNTY_CLIMATE_RISK: Record<string, CountyClimateRisk> = {
  delaware: {
    countyKey: 'delaware',
    riskScore: 92.9,
    riskRating: 'Relatively Moderate',
    expectedAnnualLossScore: 93.4,
    expectedAnnualLossRating: 'Relatively Moderate',
    floodRiskScore: 94.4,
    floodRiskRating: 'Relatively High',
    wildfireRiskScore: 27.7,
    wildfireRiskRating: 'Very Low',
    heatWaveRiskScore: 97.6,
    heatWaveRiskRating: 'Relatively High',
    hurricaneRiskScore: 88.1,
    strongWindRiskScore: 97.7,
    earthquakeRiskScore: 94.5,
    socialVulnerabilityScore: 33,
    communityResilienceScore: 84.3,
    note: 'Flooding and heat are the hazards that actually matter here; wildfire risk is negligible.',
  },
  montgomery: {
    countyKey: 'montgomery',
    riskScore: 96.8,
    riskRating: 'Relatively High',
    expectedAnnualLossScore: 97.6,
    expectedAnnualLossRating: 'Relatively High',
    floodRiskScore: 98.2,
    floodRiskRating: 'Relatively High',
    wildfireRiskScore: 37.3,
    wildfireRiskRating: 'Very Low',
    heatWaveRiskScore: 98.3,
    heatWaveRiskRating: 'Relatively High',
    hurricaneRiskScore: 89.9,
    strongWindRiskScore: 99,
    earthquakeRiskScore: 94.2,
    socialVulnerabilityScore: 19.8,
    communityResilienceScore: 92.7,
    note: 'Highest composite risk of the three counties, but also the highest community-resilience score -- more exposure, more capacity to absorb it.',
  },
  philadelphia: {
    countyKey: 'philadelphia',
    riskScore: 99.6,
    riskRating: 'Very High',
    expectedAnnualLossScore: 99.4,
    expectedAnnualLossRating: 'Relatively High',
    floodRiskScore: 99.6,
    floodRiskRating: 'Very High',
    wildfireRiskScore: 28.7,
    wildfireRiskRating: 'Very Low',
    heatWaveRiskScore: 100,
    heatWaveRiskRating: 'Very High',
    hurricaneRiskScore: 94.3,
    strongWindRiskScore: 97.9,
    earthquakeRiskScore: 98.3,
    socialVulnerabilityScore: 88.1,
    communityResilienceScore: 48.5,
    note: 'Highest risk AND highest social vulnerability AND lowest community resilience of the three counties -- the combination that matters most, not just the raw hazard score.',
  },
  // Not wired into the county switcher (Chester has no municipality table --
  // see sources.ts), but kept here since it costs nothing to source and
  // Unionville/Chadds Ford and West Chester districts already appear in the
  // school data.
  chester: {
    countyKey: 'chester',
    riskScore: 91.9,
    riskRating: 'Relatively Moderate',
    expectedAnnualLossScore: 95,
    expectedAnnualLossRating: 'Relatively Moderate',
    floodRiskScore: 94.3,
    floodRiskRating: 'Relatively High',
    wildfireRiskScore: 30.7,
    wildfireRiskRating: 'Very Low',
    heatWaveRiskScore: 95.6,
    heatWaveRiskRating: 'Relatively Moderate',
    hurricaneRiskScore: 88.7,
    strongWindRiskScore: 94.6,
    earthquakeRiskScore: 90.2,
    socialVulnerabilityScore: 10.6,
    communityResilienceScore: 85.2,
    note: 'Lowest social vulnerability of the four counties here.',
  },
};

export function climateRiskFor(countyKey: string): CountyClimateRisk | null {
  return COUNTY_CLIMATE_RISK[countyKey] ?? null;
}
