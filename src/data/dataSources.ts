import { z } from "zod";

/**
 * ============================================================================
 *  The registry of every external number in the app.
 * ============================================================================
 *
 * What it is, who publishes it, how stale it's allowed to get before the app
 * should stop presenting it as trustworthy (`staleAfterDays`, optional --
 * see the field's doc comment), and, where one exists, a machine-fetchable
 * `fetchUrl` for a future build-time fetch-if-stale step (not built yet;
 * tracked as a follow-up in the repo's task list). This is NOT the place for
 * the reference numbers themselves -- IRS contribution limits
 * (contributionLimits.ts), Fannie Mae DTI limits (engine/lending.ts), county
 * millage (localMarket.ts) and the like stay in their own files, each with
 * the provenance comment that belongs next to it. What lives here is the
 * registry ENTRY describing that data: where it came from and how stale it's
 * allowed to get, not the dollar figures/rates/brackets themselves.
 *
 * This is reference data, not application configuration -- nothing here is a
 * knob anyone turns. See `sources.ts` for the domain layer built on top
 * (topic grouping, staleness checks) that the UI and tests actually use.
 *
 * Cost-estimate defaults (a flat insurance guess, a default savings reserve,
 * the "typical" tax rate used before a specific town is known) live in
 * costDefaults.ts -- plain, unvalidated constants, not locked behind Zod the
 * way this registry is, because they are exactly the kind of number a user
 * might reasonably want to override. See that file's header for the
 * distinction.
 *
 * Validated with Zod so a nonsensical edit (a negative staleness threshold,
 * a malformed date, a bad URL) fails immediately and loudly at import time,
 * in every environment (dev, test, build), rather than surfacing later as a
 * silently wrong number on screen.
 */

const positiveInt = z.number().int().positive();

export const ReliabilitySchema = z.enum(["official", "commercial", "secondary"]);
export type Reliability = z.infer<typeof ReliabilitySchema>;

export const DataSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  /**
   * The human citation page -- what a reader clicks to verify the number.
   * Not necessarily fetchable by a script; see `fetchUrl` for that.
   */
  url: z.string().url(),
  /**
   * A machine-fetchable endpoint for this same data, when one exists (e.g.
   * an ArcGIS feature service). Left undefined for the majority of sources
   * -- PDFs, Redfin/Zillow pages, Salary.com -- which have no API to hit.
   * This is scaffolding for an eventual build-time fetch-if-stale step, not
   * wired up to anything yet.
   */
  fetchUrl: z.string().url().optional(),
  /**
   * What this source actually provides.
   */
  covers: z.string(),
  reliability: ReliabilitySchema,
  /**
   * Free-text cadence description, for human reading in the Sources panel
   * -- "Annually", "Monthly", "Confirm before committing", etc. Independent
   * of `staleAfterDays`: some sources (a superseded cross-check, "check
   * before applying") have a real cadence in prose but shouldn't be
   * mechanically staleness-checked -- see `staleAfterDays`.
   */
  refresh: z.string(),
  /**
   * Caveats worth knowing before relying on it.
   */
  note: z.string().optional(),
  /**
   * How many days old `fetchedAt` is allowed to be before this source counts
   * as stale. Optional and deliberately NOT set on every source: a
   * deliberately-frozen secondary cross-check (data kept for corroboration,
   * already known to be a couple of years old) or a source whose refresh
   * cadence is "confirm before relying on it" rather than a fixed period
   * has nothing meaningful to check on a clock. Only set this where the
   * source has a real, currently-active refresh cadence.
   */
  staleAfterDays: positiveInt.optional(),
  /**
   * When this snapshot was last pulled, ISO YYYY-MM-DD. Hand-updated
   * whenever someone re-sources the data behind this entry -- there is no
   * backend to write this automatically yet.
   */
  fetchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DataSource = z.infer<typeof DataSourceSchema>;

export const DataSourcesSchema = z.array(DataSourceSchema);

const rawDataSources: DataSource[] = [
    // ---- Property tax ----------------------------------------------------
    {
      id: "delco-millage",
      title: "2026 Tax Rates, as of 26 February 2026",
      publisher: "Delaware County, PA",
      url: "https://delcopa.gov/sites/default/files/2026-02/TaxRate_0.pdf",
      covers:
        "County, municipal and school millage for all 49 Delaware County municipalities, plus local wage tax rates. Transcribed line by line; a test checks the three components still sum to the published total for every row.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually — the county publishes a new table each February.",
      staleAfterDays: 365,
    },
    {
      id: "montco-millage",
      title: "County & Municipality Millage Rates",
      publisher: "Montgomery County, PA",
      url: "https://www.montgomerycountypa.gov/622/County-Municipality-Millage-Rates",
      covers:
        "County, community college, municipal and school millage for 62 Montgomery County municipalities. The county figure here combines the 5.462 county rate with the 0.49 community college levy.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually.",
      note: "School district names are inferred from shared millage rates, not published in this table. Confident for the districts named; verify before relying on one.",
      staleAfterDays: 365,
    },
    {
      id: "pa-clr",
      title: "2025 Common Level Ratio Real Estate Valuation Factors, effective 1 July 2026",
      publisher: "Pennsylvania Department of Revenue",
      url: "https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/realty-transfer-tax/common-level-ratios",
      covers:
        "The factor converting assessed value to market value, per county: Delaware 1.83, Montgomery 3.36, Chester 3.27, Philadelphia 1.06. Without these, millage is not comparable across county lines at all.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually, effective each 1 July.",
      note: "A county-wide average. Any individual property can sit well off it in either direction.",
      staleAfterDays: 365,
    },
    {
      id: "chesco-rates",
      title: "Chester County Tax Rates",
      publisher: "Chester County, PA",
      url: "https://www.chesco.org/1585/Tax-Rates",
      covers: "Chester County rate of 5.164 mills for 2026.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually.",
      note: "Municipality-level detail sits in a linked PDF I have not transcribed, so Chester townships are absent from the map.",
      staleAfterDays: 365,
    },
    {
      id: "pa-transfer-tax",
      title: "Transfer Taxes",
      publisher: "Delaware County Recorder of Deeds",
      url: "https://delcopa.gov/recorder-deeds/transfer-taxes",
      covers:
        "PA state realty transfer tax (1%, statewide) and the local rate most municipalities add on top (usually 1%, exceptions transcribed in closingCosts.ts). Title insurance's ~$3.50-per-$1,000 estimate is NOT sourced from this page -- it's a rough state-regulated-rate estimate with no single citable authority.",
      fetchedAt: "2026-08-15",
      reliability: "official",
      refresh: "Rarely changes -- statute-driven, not a periodic republish.",
      note: "Everything except the transfer tax rate itself is an estimate. Get a Loan Estimate from a lender before treating any of it as the number.",
      staleAfterDays: 1095,
    },

    // ---- House prices ----------------------------------------------------
    {
      id: "zillow-values",
      title: "Home Values by town",
      publisher: "Zillow",
      url: "https://www.zillow.com/home-values/2251/delaware-county-pa/",
      covers:
        "Typical home value for Brookhaven, Ridley Park, Prospect Park, Norwood, Glenolden, Collingdale, Aston, Media, Havertown, Springfield, Drexel Hill, Norristown and Conshohocken.",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Monthly. Prices move; re-check before making an offer.",
      note: "Zillow, Redfin and RealtyTrac disagree materially on the same market — for Delaware County overall they spanned $297k to $367k. Use for ranking towns, not for valuing a house.",
      staleAfterDays: 30,
    },
    {
      id: "redfin-counties",
      title: "Housing market data by county",
      publisher: "Redfin",
      url: "https://www.redfin.com/county/2383/PA/Delaware-County/housing-market",
      covers:
        "Median sale price for Delaware County ($349k, three months to April 2026), Montgomery County ($430k, Feb 2026) and Philadelphia County ($275k, March 2026).",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Monthly.",
      staleAfterDays: 30,
    },
    {
      id: "radnor-marple-prices",
      title: "Median sold prices, Main Line towns",
      publisher: "Redfin / Movoto / local listings",
      url: "https://www.redfin.com/city/25420/PA/Radnor-Township/land",
      covers:
        "Radnor $1,206,000; Marple/Newtown Square $651,500 (June 2026); Newtown Square ~$579k; Swarthmore $365k.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Monthly.",
      note: "Mixed listing and sold prices from several aggregators. Directionally right; the exact figures are softer than the county medians.",
      staleAfterDays: 30,
    },
    {
      id: "montco-parcels",
      title: "Montgomery County Parcels (assessment database)",
      publisher: "Montgomery County, PA (GIS)",
      url: "https://www.montgomerycountypa.gov/departments/board-assessment-appeals/property-data-data-requests",
      fetchUrl:
        "https://services1.arcgis.com/kOChldNuKsox8qZD/arcgis/rest/services/Montgomery_County_Parcels/FeatureServer/6/query",
      covers:
        "Individual sale records behind recentSales.ts: address, sale price (deed consideration), sale date, year built, beds, baths and square footage, straight from the county assessment database via its public ArcGIS feature service. Unlike the Zillow/Redfin figures above, these are actual transactions, not a computed town-wide median.",
      fetchedAt: "2026-08-15",
      reliability: "official",
      refresh: "Monthly (the county republishes the underlying feature service on its own schedule).",
      note: "recentSales.ts is a curated sample (5 most-recent complete records per municipality, reviewed by hand), not a systematic recent-sales sweep -- see the caveat at the top of recentSales.ts. Also includes whatever non-arm's-length transfers survive the price/class filter; treat any single record as a data point, not a comp you can rely on unverified. Individual sale RECORDS are further filtered by date at read time (see freshness.ts) -- this `fetchedAt` date is about the fetch, not any one sale's age.",
      staleAfterDays: 365,
    },

    // ---- Schools ---------------------------------------------------------
    {
      id: "frpi-performance",
      title: "Future Ready Performance Data, SY2024-25",
      publisher: "Pennsylvania Department of Education",
      url: "https://www.futurereadypa.org/home/getdatafile?id=60",
      covers:
        "Per-school PSSA/Keystone maths and ELA proficiency, PVAAS growth, graduation rate (4- and 5-year cohort) and persistent attendance, for every public school building in the state, keyed by AUN. Aggregated to district level in schools.ts by unweighted average across each district's buildings — see DISTRICT_AUN and sourceSchoolCount on each entry.",
      fetchedAt: "2026-08-10",
      reliability: "official",
      refresh: "Annually, as new PSSA/Keystone results publish (a new SY file each year).",
      note: "District-level figures here are our own aggregation, not a PDE-published statistic — the workbook has no district rollup row. Chronic absenteeism was blank for SY2024-25; persistent attendance is used instead.",
      staleAfterDays: 1095,
    },
    {
      id: "frpi-fastfacts",
      title: "District Fast Facts, SY2024-25",
      publisher: "Pennsylvania Department of Education",
      url: "https://www.futurereadypa.org/home/getdatafile?id=59",
      covers:
        "Official district name and AUN for every Pennsylvania LEA — the join key used to build DISTRICT_AUN in schools.ts and to map municipalities to districts.",
      fetchedAt: "2026-08-10",
      reliability: "official",
      refresh: "Annually.",
      staleAfterDays: 1095,
    },
    {
      id: "psr-penn-delco",
      title: "Penn-Delco School District profile",
      publisher: "PublicSchoolReview",
      url: "https://www.publicschoolreview.com/pennsylvania/penn-delco-school-district/4218580-school-district",
      covers:
        "42% maths and 61% reading proficiency against state averages of 38% and 56%. Ranked #231 of 677 PA districts on 2022-23 results.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Annually, as new PSSA results publish.",
      note: "Superseded by frpi-performance as the primary source; kept as a cross-check. Underlying data here is 2022-23.",
    },
    {
      id: "psr-ridley",
      title: "Ridley School District profile",
      publisher: "PublicSchoolReview",
      url: "https://www.publicschoolreview.com/pennsylvania/ridley-school-district/4220370-school-district",
      covers: "36% maths and 54% reading proficiency, both below the state average. Average testing rank 5/10.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Annually.",
      note: "Superseded by frpi-performance as the primary source; kept as a cross-check.",
    },
    {
      id: "delco-today-rankings",
      title: "Delaware County districts in the 2025 Pennsylvania rankings",
      publisher: "delco.today / montco.today",
      url: "https://delco.today/2026/05/delaware-county-school-districts-pennsylvania-rankings/",
      covers:
        "PA ranks on 2025 PSSA and Keystone results: Springfield #14, Rose Tree Media #24, Garnet Valley #29, Marple Newtown #74. Rose Tree Media 71% maths / 81% reading.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Annually.",
      note: "Superseded by frpi-performance as the primary source; kept as a cross-check.",
    },
    {
      id: "niche-districts",
      title: "Best school districts, Delaware County",
      publisher: "Niche",
      url: "https://www.niche.com/k12/search/best-school-districts/c/delaware-county-pa/",
      covers:
        "National district rankings (2024): Garnet Valley #263, Springfield #311, Marple Newtown #360, Rose Tree Media #518.",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Annually.",
      note: "Niche blends test scores with survey data and self-reported reviews, and requires a paid Enterprise Data License for its full 1-10 ratings, so it is not usable as a primary source here. Kept as a cross-check.",
    },

    // ---- First-time buyer programmes -------------------------------------
    {
      id: "phfa-assistance",
      title: "Assistance Loans available with Home Purchase Loans",
      publisher: "Pennsylvania Housing Finance Agency",
      url: "https://www.phfa.org/programs/assistance.aspx",
      covers:
        "K-FIT (5% of price, no cap, forgiven over ten years), K-DATE (5% deferred), Keystone Advantage (lesser of 4% or $6,000), the $500 PHFA Grant, and the Employer Assisted Housing uplift to $8,000. Credit and asset requirements for each.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Check before applying — terms change.",
    },
    {
      id: "phfa-limits",
      title: "Appendix A — Maximum Purchase Price and Income Limits, effective 1 July 2026",
      publisher: "Pennsylvania Housing Finance Agency",
      url: "https://www.phfa.org/forms/sellersguide/appendices/a.pdf",
      covers:
        "Delaware County: purchase price ceiling $588,800; income limit $122,700 for 1-2 person households, $141,100 for 3 or more. Philadelphia is a target area with higher ceilings.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually, effective each 1 July.",
      note: "The $141,100 three-person limit is what makes this household eligible. Confirm household size counts as PHFA expects.",
      staleAfterDays: 365,
    },
    {
      id: "delco-hcd",
      title: "Housing Initiatives — Homeownership First",
      publisher: "Delaware County Housing & Community Development",
      url: "https://delcopa.gov/hcd/housinginitiatives",
      covers:
        "Up to $10,000 towards deposit and closing costs at 0% interest, repayable on sale and forgiven after five years in a designated Revitalization Area. Counselling required.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Funding is limited and reopens periodically — check availability.",
      note: "Aimed at low-to-moderate incomes; published limits are not the PHFA ones. Whether this household qualifies is unconfirmed.",
    },

    // ---- Mortgage and insurance ------------------------------------------
    {
      id: "conventional-97",
      title: "Conventional 97 Loan: 3% Down Payment Program",
      publisher: "The Lenders Network",
      url: "https://thelendersnetwork.com/conventional-97-ltv-program/",
      covers:
        "3% minimum deposit, 620 minimum score, no upfront premium, and mortgage insurance that cancels at 80% loan-to-value.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Confirm current terms with a lender.",
    },
    {
      id: "pmi-by-score",
      title: "How Much Is PMI? Costs by Credit Score and Down Payment",
      publisher: "Altgage",
      url: "https://www.altgage.com/blog/how-much-is-pmi",
      covers:
        "Indicative annual PMI rates by credit band and deposit size. At 780+ with 3% down the rate used here is 0.55% of the original loan.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Get a real quote before committing.",
      note: "Insurers price individually on credit, debt-to-income and property type. These are planning ranges, not quotes.",
    },
    {
      id: "fannie-dti-2026",
      title: "B3-6-02, Debt-to-Income Ratios",
      publisher: "Fannie Mae",
      url: "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios",
      covers:
        "The DTI_LIMITS in engine/lending.ts: 36% the classic manual-underwriting benchmark, 45% manual underwriting with a strong credit score and reserves (per the Eligibility Matrix), 50% the ceiling through Desktop Underwriter.",
      fetchedAt: "2026-08-15",
      reliability: "official",
      refresh: "Reviewed whenever Fannie Mae updates its Selling Guide -- no fixed schedule.",
      staleAfterDays: 365,
    },

    // ---- Tax-advantaged accounts -----------------------------------------
    {
      id: "irs-hsa-2026",
      title: "Notice 2026-05 — 2026 HSA and HDHP limits",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/pub/irs-drop/n-26-05.pdf",
      covers:
        "Family HSA limit $8,750; self-only $4,400; catch-up $1,000 from 55. HDHP minimum family deductible $3,400, out-of-pocket maximum $17,000.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Every January.",
      staleAfterDays: 365,
    },
    {
      id: "irs-401k-ira-2026",
      title: "401(k) limit increases to $24,500 for 2026, IRA limit increases to $7,500",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
      covers:
        "K401_LIMITS and IRA_LIMITS in contributionLimits.ts: 401(k) employee deferral $24,500 (catch-up $8,000 from 50); IRA contribution $7,500 (catch-up $1,100 from 50). Also the basis for ROTH_PHASEOUT_2026's underlying contribution room.",
      fetchedAt: "2026-08-15",
      reliability: "official",
      refresh: "Every January.",
      staleAfterDays: 365,
    },
    {
      id: "dcfsa-2026",
      title: "Dependent Care FSA limit increased to $7,500 for 2026",
      publisher: "HWH Law (on the One Big Beautiful Bill Act)",
      url: "https://www.hwhlaw.com/advisory-dependent-care-fsa-limit-increased-to-7-500-for-2026",
      covers:
        "The annual Dependent Care FSA limit rises from $5,000 to $7,500 from 1 January 2026 — the first increase since 1986. Not indexed for inflation.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Confirm your employer adopted the higher limit; they are not obliged to.",
    },
    {
      id: "hsa-reimbursement",
      title: "HSA reimbursement guide and rules",
      publisher: "Fidelity",
      url: "https://www.fidelity.com/learning-center/smart-money/hsa-reimbursement",
      covers:
        "No deadline for reimbursing yourself, provided the expense was incurred after the account was opened and you keep records.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Stable rule, but confirm with a tax professional before a large withdrawal.",
    },
    {
      id: "irs-8889",
      title: "About Form 8889, Health Savings Accounts",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/forms-pubs/about-form-8889",
      covers: "How HSA distributions are self-reported, and what the 1099-SA feeds into.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Annually.",
      staleAfterDays: 365,
    },

    // ---- Federal income tax ------------------------------------------------
    {
      id: "irs-2026-brackets",
      title: "IRS releases tax inflation adjustments for tax year 2026",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
      covers:
        "2026 federal income tax brackets (all seven rates) and standard deduction, single and married filing jointly, cross-checked against the Tax Foundation's published table.",
      fetchedAt: "2026-08-09",
      reliability: "official",
      refresh: "Every January.",
      note: "Federal income tax only — excludes FICA and state tax, neither of which this app models.",
      staleAfterDays: 365,
    },

    // ---- Social Security and wages ---------------------------------------
    {
      id: "ssa-noncitizens",
      title: "Can noncitizens receive Social Security benefits?",
      publisher: "Social Security Administration",
      url: "https://www.ssa.gov/faqs/en/questions/KA-02447.html",
      covers:
        "Lawfully present noncitizens meeting the eligibility requirements can receive benefits. Citizenship is not the test; lawful presence and work credits are.",
      fetchedAt: "2026-08-08",
      reliability: "official",
      refresh: "Stable, but immigration rules change.",
      note: "Everything here depends on her specific status. Confirm with SSA or an immigration attorney rather than relying on this.",
    },
    {
      id: "ss-credits-2026",
      title: "Social Security work credits and green card holders",
      publisher: "LegalClarity",
      url: "https://legalclarity.org/can-green-card-holders-get-social-security/",
      covers:
        "40 credits (about ten years) for a retirement benefit. In 2026 one credit per $1,890 earned, four maximum per year — so $7,560 of earnings buys a full year.",
      fetchedAt: "2026-08-08",
      reliability: "secondary",
      refresh: "Credit thresholds change annually.",
      staleAfterDays: 365,
    },
    {
      id: "salary-bba-pa",
      title: "Entry Level Business Administration salary, Pennsylvania",
      publisher: "Salary.com",
      url: "https://www.salary.com/research/salary/position/entry-level-business-administration-salary/pa",
      covers: "Entry-level average $43,916, range $37,194 to $53,677.",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Annually.",
      staleAfterDays: 365,
    },
    {
      id: "zip-bba-philly",
      title: "Bachelors Business Administration salary, Philadelphia",
      publisher: "ZipRecruiter",
      url: "https://www.ziprecruiter.com/Salaries/Bachelors-Business-Administration-Salary-in-Philadelphia,PA",
      covers: "Average $69,745 across all experience levels; 25th percentile $47,900, 75th $84,300.",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Annually.",
      staleAfterDays: 365,
    },
    {
      id: "zip-parttime-philly",
      title: "Part-time evening and weekend pay, Philadelphia",
      publisher: "ZipRecruiter",
      url: "https://www.ziprecruiter.com/Jobs/Part-Time-Evening/-in-Philadelphia,PA",
      covers: "Part-time evening average $16.49/hr; weekend average $17.01/hr.",
      fetchedAt: "2026-08-08",
      reliability: "commercial",
      refresh: "Annually.",
      staleAfterDays: 365,
    },

    // ---- Natural hazard risk -----------------------------------------------
    {
      id: "fema-nri",
      title: "National Risk Index for Natural Hazards, county-level",
      publisher: "Federal Emergency Management Agency",
      url: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer",
      fetchUrl: "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer",
      covers:
        "Composite risk score, expected annual loss, and per-hazard national-percentile scores (inland flooding, wildfire, heat wave, hurricane, strong wind, earthquake) plus social vulnerability and community resilience, for Delaware, Montgomery, Chester and Philadelphia counties.",
      fetchedAt: "2026-08-10",
      reliability: "official",
      refresh: "Roughly annually, whenever FEMA republishes a new NRI version.",
      note: "County level only -- the NRI does not publish at municipality/township granularity, so every town in a county shares the same figures. Scores are NATIONAL PERCENTILES, not probabilities: a dense, built-up county scores high partly because more people and property are exposed, not necessarily because a disaster is more likely per acre.",
      staleAfterDays: 3650,
    },
];

/**
 * Parsed and validated at import time -- if this throws, the app should not
 * start. `parse` (not `safeParse`) is intentional: an invalid registry entry
 * is a programming error to fix, not a runtime condition to handle
 * gracefully.
 */
export const DATA_SOURCES: DataSource[] = DataSourcesSchema.parse(rawDataSources);
