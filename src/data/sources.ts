/**
 * Where every external number in this app came from.
 *
 * The model makes real decisions, so anything not derived from your own figures
 * should be traceable to a document you can open and check. Official sources
 * are preferred; where only a commercial estimate exists, that is said plainly
 * rather than dressed up.
 *
 * Each entry records how often it goes stale. Millage changes yearly, house
 * prices monthly, IRS limits every January.
 */

export type Reliability = 'official' | 'commercial' | 'secondary';

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /**
  What this source actually provides.
  */
  covers: string;
  /**
  When I retrieved it.
  */
  retrieved: string;
  reliability: Reliability;
  /**
  How often it needs re-checking.
  */
  refresh: string;
  /**
  Caveats worth knowing before relying on it.
  */
  note?: string;
}

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

export const SOURCES: Source[] = [
  // ---- Property tax ----------------------------------------------------
  {
    id: 'delco-millage',
    title: '2026 Tax Rates, as of 26 February 2026',
    publisher: 'Delaware County, PA',
    url: 'https://delcopa.gov/sites/default/files/2026-02/TaxRate_0.pdf',
    covers:
      'County, municipal and school millage for all 49 Delaware County municipalities, plus local wage tax rates. Transcribed line by line; a test checks the three components still sum to the published total for every row.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually — the county publishes a new table each February.',
  },
  {
    id: 'montco-millage',
    title: 'County & Municipality Millage Rates',
    publisher: 'Montgomery County, PA',
    url: 'https://www.montgomerycountypa.gov/622/County-Municipality-Millage-Rates',
    covers:
      'County, community college, municipal and school millage for 62 Montgomery County municipalities. The county figure here combines the 5.462 county rate with the 0.49 community college levy.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually.',
    note: 'School district names are inferred from shared millage rates, not published in this table. Confident for the districts named; verify before relying on one.',
  },
  {
    id: 'pa-clr',
    title: '2025 Common Level Ratio Real Estate Valuation Factors, effective 1 July 2026',
    publisher: 'Pennsylvania Department of Revenue',
    url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/realty-transfer-tax/common-level-ratios',
    covers:
      'The factor converting assessed value to market value, per county: Delaware 1.83, Montgomery 3.36, Chester 3.27, Philadelphia 1.06. Without these, millage is not comparable across county lines at all.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually, effective each 1 July.',
    note: 'A county-wide average. Any individual property can sit well off it in either direction.',
  },
  {
    id: 'chesco-rates',
    title: 'Chester County Tax Rates',
    publisher: 'Chester County, PA',
    url: 'https://www.chesco.org/1585/Tax-Rates',
    covers: 'Chester County rate of 5.164 mills for 2026.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually.',
    note: 'Municipality-level detail sits in a linked PDF I have not transcribed, so Chester townships are absent from the map.',
  },

  // ---- House prices ----------------------------------------------------
  {
    id: 'zillow-values',
    title: 'Home Values by town',
    publisher: 'Zillow',
    url: 'https://www.zillow.com/home-values/2251/delaware-county-pa/',
    covers:
      'Typical home value for Brookhaven, Ridley Park, Prospect Park, Norwood, Glenolden, Collingdale, Aston, Media, Havertown, Springfield, Drexel Hill, Norristown and Conshohocken.',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Monthly. Prices move; re-check before making an offer.',
    note: 'Zillow, Redfin and RealtyTrac disagree materially on the same market — for Delaware County overall they spanned $297k to $367k. Use for ranking towns, not for valuing a house.',
  },
  {
    id: 'redfin-counties',
    title: 'Housing market data by county',
    publisher: 'Redfin',
    url: 'https://www.redfin.com/county/2383/PA/Delaware-County/housing-market',
    covers:
      'Median sale price for Delaware County ($349k, three months to April 2026), Montgomery County ($430k, Feb 2026) and Philadelphia County ($275k, March 2026).',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Monthly.',
  },
  {
    id: 'radnor-marple-prices',
    title: 'Median sold prices, Main Line towns',
    publisher: 'Redfin / Movoto / local listings',
    url: 'https://www.redfin.com/city/25420/PA/Radnor-Township/land',
    covers:
      'Radnor $1,206,000; Marple/Newtown Square $651,500 (June 2026); Newtown Square ~$579k; Swarthmore $365k.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Monthly.',
    note: 'Mixed listing and sold prices from several aggregators. Directionally right; the exact figures are softer than the county medians.',
  },

  // ---- Schools ---------------------------------------------------------
  {
    id: 'psr-penn-delco',
    title: 'Penn-Delco School District profile',
    publisher: 'PublicSchoolReview',
    url: 'https://www.publicschoolreview.com/pennsylvania/penn-delco-school-district/4218580-school-district',
    covers:
      '42% maths and 61% reading proficiency against state averages of 38% and 56%. Ranked #231 of 677 PA districts on 2022-23 results.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Annually, as new PSSA results publish.',
    note: 'Underlying data is 2022-23. Middle-school maths is notably weaker at 29% proficient — the district average hides it.',
  },
  {
    id: 'psr-ridley',
    title: 'Ridley School District profile',
    publisher: 'PublicSchoolReview',
    url: 'https://www.publicschoolreview.com/pennsylvania/ridley-school-district/4220370-school-district',
    covers:
      '36% maths and 54% reading proficiency, both below the state average. Average testing rank 5/10.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Annually.',
  },
  {
    id: 'delco-today-rankings',
    title: 'Delaware County districts in the 2025 Pennsylvania rankings',
    publisher: 'delco.today / montco.today',
    url: 'https://delco.today/2026/05/delaware-county-school-districts-pennsylvania-rankings/',
    covers:
      'PA ranks on 2025 PSSA and Keystone results: Springfield #14, Rose Tree Media #24, Garnet Valley #29, Marple Newtown #74. Rose Tree Media 71% maths / 81% reading.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Annually.',
  },
  {
    id: 'niche-districts',
    title: 'Best school districts, Delaware County',
    publisher: 'Niche',
    url: 'https://www.niche.com/k12/search/best-school-districts/c/delaware-county-pa/',
    covers:
      'National district rankings (2024): Garnet Valley #263, Springfield #311, Marple Newtown #360, Rose Tree Media #518.',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Annually.',
    note: 'Niche blends test scores with survey data and self-reported reviews. Useful as a cross-check, not as evidence on its own.',
  },

  // ---- First-time buyer programmes -------------------------------------
  {
    id: 'phfa-assistance',
    title: 'Assistance Loans available with Home Purchase Loans',
    publisher: 'Pennsylvania Housing Finance Agency',
    url: 'https://www.phfa.org/programs/assistance.aspx',
    covers:
      'K-FIT (5% of price, no cap, forgiven over ten years), K-DATE (5% deferred), Keystone Advantage (lesser of 4% or $6,000), the $500 PHFA Grant, and the Employer Assisted Housing uplift to $8,000. Credit and asset requirements for each.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Check before applying — terms change.',
  },
  {
    id: 'phfa-limits',
    title: 'Appendix A — Maximum Purchase Price and Income Limits, effective 1 July 2026',
    publisher: 'Pennsylvania Housing Finance Agency',
    url: 'https://www.phfa.org/forms/sellersguide/appendices/a.pdf',
    covers:
      'Delaware County: purchase price ceiling $588,800; income limit $122,700 for 1-2 person households, $141,100 for 3 or more. Philadelphia is a target area with higher ceilings.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually, effective each 1 July.',
    note: 'The $141,100 three-person limit is what makes this household eligible. Confirm household size counts as PHFA expects.',
  },
  {
    id: 'delco-hcd',
    title: 'Housing Initiatives — Homeownership First',
    publisher: 'Delaware County Housing & Community Development',
    url: 'https://delcopa.gov/hcd/housinginitiatives',
    covers:
      'Up to $10,000 towards deposit and closing costs at 0% interest, repayable on sale and forgiven after five years in a designated Revitalization Area. Counselling required.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Funding is limited and reopens periodically — check availability.',
    note: 'Aimed at low-to-moderate incomes; published limits are not the PHFA ones. Whether this household qualifies is unconfirmed.',
  },

  // ---- Mortgage and insurance ------------------------------------------
  {
    id: 'conventional-97',
    title: 'Conventional 97 Loan: 3% Down Payment Program',
    publisher: "The Lenders Network",
    url: 'https://thelendersnetwork.com/conventional-97-ltv-program/',
    covers:
      '3% minimum deposit, 620 minimum score, no upfront premium, and mortgage insurance that cancels at 80% loan-to-value.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Confirm current terms with a lender.',
  },
  {
    id: 'pmi-by-score',
    title: 'How Much Is PMI? Costs by Credit Score and Down Payment',
    publisher: 'Altgage',
    url: 'https://www.altgage.com/blog/how-much-is-pmi',
    covers:
      'Indicative annual PMI rates by credit band and deposit size. At 780+ with 3% down the rate used here is 0.55% of the original loan.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Get a real quote before committing.',
    note: 'Insurers price individually on credit, debt-to-income and property type. These are planning ranges, not quotes.',
  },

  // ---- Tax-advantaged accounts -----------------------------------------
  {
    id: 'irs-hsa-2026',
    title: 'Notice 2026-05 — 2026 HSA and HDHP limits',
    publisher: 'Internal Revenue Service',
    url: 'https://www.irs.gov/pub/irs-drop/n-26-05.pdf',
    covers:
      'Family HSA limit $8,750; self-only $4,400; catch-up $1,000 from 55. HDHP minimum family deductible $3,400, out-of-pocket maximum $17,000.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Every January.',
  },
  {
    id: 'dcfsa-2026',
    title: 'Dependent Care FSA limit increased to $7,500 for 2026',
    publisher: 'HWH Law (on the One Big Beautiful Bill Act)',
    url: 'https://www.hwhlaw.com/advisory-dependent-care-fsa-limit-increased-to-7-500-for-2026',
    covers:
      'The annual Dependent Care FSA limit rises from $5,000 to $7,500 from 1 January 2026 — the first increase since 1986. Not indexed for inflation.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Confirm your employer adopted the higher limit; they are not obliged to.',
  },
  {
    id: 'hsa-reimbursement',
    title: 'HSA reimbursement guide and rules',
    publisher: 'Fidelity',
    url: 'https://www.fidelity.com/learning-center/smart-money/hsa-reimbursement',
    covers:
      'No deadline for reimbursing yourself, provided the expense was incurred after the account was opened and you keep records.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Stable rule, but confirm with a tax professional before a large withdrawal.',
  },
  {
    id: 'irs-8889',
    title: 'About Form 8889, Health Savings Accounts',
    publisher: 'Internal Revenue Service',
    url: 'https://www.irs.gov/forms-pubs/about-form-8889',
    covers: 'How HSA distributions are self-reported, and what the 1099-SA feeds into.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Annually.',
  },

  // ---- Social Security and wages ---------------------------------------
  {
    id: 'ssa-noncitizens',
    title: 'Can noncitizens receive Social Security benefits?',
    publisher: 'Social Security Administration',
    url: 'https://www.ssa.gov/faqs/en/questions/KA-02447.html',
    covers:
      'Lawfully present noncitizens meeting the eligibility requirements can receive benefits. Citizenship is not the test; lawful presence and work credits are.',
    retrieved: '2026-08-08',
    reliability: 'official',
    refresh: 'Stable, but immigration rules change.',
    note: 'Everything here depends on her specific status. Confirm with SSA or an immigration attorney rather than relying on this.',
  },
  {
    id: 'ss-credits-2026',
    title: 'Social Security work credits and green card holders',
    publisher: 'LegalClarity',
    url: 'https://legalclarity.org/can-green-card-holders-get-social-security/',
    covers:
      '40 credits (about ten years) for a retirement benefit. In 2026 one credit per $1,890 earned, four maximum per year — so $7,560 of earnings buys a full year.',
    retrieved: '2026-08-08',
    reliability: 'secondary',
    refresh: 'Credit thresholds change annually.',
  },
  {
    id: 'salary-bba-pa',
    title: 'Entry Level Business Administration salary, Pennsylvania',
    publisher: 'Salary.com',
    url: 'https://www.salary.com/research/salary/position/entry-level-business-administration-salary/pa',
    covers: 'Entry-level average $43,916, range $37,194 to $53,677.',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Annually.',
  },
  {
    id: 'zip-bba-philly',
    title: 'Bachelors Business Administration salary, Philadelphia',
    publisher: 'ZipRecruiter',
    url: 'https://www.ziprecruiter.com/Salaries/Bachelors-Business-Administration-Salary-in-Philadelphia,PA',
    covers:
      'Average $69,745 across all experience levels; 25th percentile $47,900, 75th $84,300.',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Annually.',
  },
  {
    id: 'zip-parttime-philly',
    title: 'Part-time evening and weekend pay, Philadelphia',
    publisher: 'ZipRecruiter',
    url: 'https://www.ziprecruiter.com/Jobs/Part-Time-Evening/-in-Philadelphia,PA',
    covers: 'Part-time evening average $16.49/hr; weekend average $17.01/hr.',
    retrieved: '2026-08-08',
    reliability: 'commercial',
    refresh: 'Annually.',
  },
];

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
      'Millage for every municipality, and the assessment factors that make rates comparable between counties.',
    usedBy: 'The county map, the Where to buy table, and every housing cost in the projection.',
    sourceIds: ['delco-millage', 'montco-millage', 'pa-clr', 'chesco-rates'],
  },
  {
    key: 'prices',
    label: 'Median home values',
    description:
      'Typical home value per town. Only 18 of 112 municipalities have a sourced price; the rest show no figure rather than a guess.',
    usedBy: 'Affordability ranking, the reach classification, and the waiting analysis.',
    sourceIds: ['zillow-values', 'redfin-counties', 'radnor-marple-prices'],
  },
  {
    key: 'schools',
    label: 'School district performance',
    description:
      'Proficiency rates and rankings. Districts I could not source are marked "not sourced" rather than left to look poor by omission.',
    usedBy: 'The map tooltip and modal, and the Where to buy table.',
    sourceIds: ['psr-penn-delco', 'psr-ridley', 'delco-today-rankings', 'niche-districts'],
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
    description: 'Low-deposit loan terms and mortgage insurance pricing by credit score.',
    usedBy: 'The PMI calculation and the cash needed at closing.',
    sourceIds: ['conventional-97', 'pmi-by-score'],
  },
  {
    key: 'accounts',
    label: 'Tax-advantaged accounts',
    description: 'Contribution limits and withdrawal rules for HSAs and dependent care accounts.',
    usedBy: 'Contribution targets, the childcare cost of a second income, and the HSA drawdown options.',
    sourceIds: ['irs-hsa-2026', 'dcfsa-2026', 'hsa-reimbursement', 'irs-8889'],
  },
  {
    key: 'income',
    label: 'Social Security and wages',
    description: 'Benefit eligibility, work credits, and local pay for a second earner.',
    usedBy: 'The second income presets and the retirement discussion.',
    sourceIds: ['ssa-noncitizens', 'ss-credits-2026', 'salary-bba-pa', 'zip-bba-philly', 'zip-parttime-philly'],
  },
];

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function sourcesFor(topicKey: string): Source[] {
  const topic = SOURCE_TOPICS.find((t) => t.key === topicKey);
  if (!topic) return [];
  return topic.sourceIds.map((id) => sourceById(id)).filter((s): s is Source => s !== undefined);
}
