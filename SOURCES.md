# Where the numbers came from

Every external figure in this app, with a link, what it covers, when it was
retrieved and how often it goes stale.

**This file is generated from `src/data/sources.ts`** — edit that, not this. A test
checks the registry has no dead references and no orphans.

25 sources, 10 of them official.

| Grade                   | Means                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Official**            | Published by the body that sets or administers the figure. Authoritative.            |
| **Commercial estimate** | A private estimate. Methodology unpublished; providers disagree, sometimes by a lot. |
| **Secondary reporting** | Reported second-hand. Fine for ranking, verify before acting.                        |

---

## Property and school tax

Millage for every municipality, and the assessment factors that make rates comparable between counties.

_Used by: The county map, the Where to buy table, and every housing cost in the projection._

### [2026 Tax Rates, as of 26 February 2026](https://delcopa.gov/sites/default/files/2026-02/TaxRate_0.pdf)

**Delaware County, PA** · Official · retrieved 2026-08-08

County, municipal and school millage for all 49 Delaware County municipalities, plus local wage tax rates. Transcribed line by line; a test checks the three components still sum to the published total for every row.

_Goes stale: Annually — the county publishes a new table each February._

### [County & Municipality Millage Rates](https://www.montgomerycountypa.gov/622/County-Municipality-Millage-Rates)

**Montgomery County, PA** · Official · retrieved 2026-08-08

County, community college, municipal and school millage for 62 Montgomery County municipalities. The county figure here combines the 5.462 county rate with the 0.49 community college levy.

> School district names are inferred from shared millage rates, not published in this table. Confident for the districts named; verify before relying on one.

_Goes stale: Annually._

### [2025 Common Level Ratio Real Estate Valuation Factors, effective 1 July 2026](https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/realty-transfer-tax/common-level-ratios)

**Pennsylvania Department of Revenue** · Official · retrieved 2026-08-08

The factor converting assessed value to market value, per county: Delaware 1.83, Montgomery 3.36, Chester 3.27, Philadelphia 1.06. Without these, millage is not comparable across county lines at all.

> A county-wide average. Any individual property can sit well off it in either direction.

_Goes stale: Annually, effective each 1 July._

### [Chester County Tax Rates](https://www.chesco.org/1585/Tax-Rates)

**Chester County, PA** · Official · retrieved 2026-08-08

Chester County rate of 5.164 mills for 2026.

> Municipality-level detail sits in a linked PDF I have not transcribed, so Chester townships are absent from the map.

_Goes stale: Annually._

## Median home values

Typical home value per town. Only 18 of 112 municipalities have a sourced price; the rest show no figure rather than a guess.

_Used by: Affordability ranking, the reach classification, and the waiting analysis._

### [Home Values by town](https://www.zillow.com/home-values/2251/delaware-county-pa/)

**Zillow** · Commercial estimate · retrieved 2026-08-08

Typical home value for Brookhaven, Ridley Park, Prospect Park, Norwood, Glenolden, Collingdale, Aston, Media, Havertown, Springfield, Drexel Hill, Norristown and Conshohocken.

> Zillow, Redfin and RealtyTrac disagree materially on the same market — for Delaware County overall they spanned $297k to $367k. Use for ranking towns, not for valuing a house.

_Goes stale: Monthly. Prices move; re-check before making an offer._

### [Housing market data by county](https://www.redfin.com/county/2383/PA/Delaware-County/housing-market)

**Redfin** · Commercial estimate · retrieved 2026-08-08

Median sale price for Delaware County ($349k, three months to April 2026), Montgomery County ($430k, Feb 2026) and Philadelphia County ($275k, March 2026).

_Goes stale: Monthly._

### [Median sold prices, Main Line towns](https://www.redfin.com/city/25420/PA/Radnor-Township/land)

**Redfin / Movoto / local listings** · Secondary reporting · retrieved 2026-08-08

Radnor $1,206,000; Marple/Newtown Square $651,500 (June 2026); Newtown Square ~$579k; Swarthmore $365k.

> Mixed listing and sold prices from several aggregators. Directionally right; the exact figures are softer than the county medians.

_Goes stale: Monthly._

## School district performance

Proficiency rates and rankings. Districts I could not source are marked "not sourced" rather than left to look poor by omission.

_Used by: The map tooltip and modal, and the Where to buy table._

### [Penn-Delco School District profile](https://www.publicschoolreview.com/pennsylvania/penn-delco-school-district/4218580-school-district)

**PublicSchoolReview** · Secondary reporting · retrieved 2026-08-08

42% maths and 61% reading proficiency against state averages of 38% and 56%. Ranked #231 of 677 PA districts on 2022-23 results.

> Underlying data is 2022-23. Middle-school maths is notably weaker at 29% proficient — the district average hides it.

_Goes stale: Annually, as new PSSA results publish._

### [Ridley School District profile](https://www.publicschoolreview.com/pennsylvania/ridley-school-district/4220370-school-district)

**PublicSchoolReview** · Secondary reporting · retrieved 2026-08-08

36% maths and 54% reading proficiency, both below the state average. Average testing rank 5/10.

_Goes stale: Annually._

### [Delaware County districts in the 2025 Pennsylvania rankings](https://delco.today/2026/05/delaware-county-school-districts-pennsylvania-rankings/)

**delco.today / montco.today** · Secondary reporting · retrieved 2026-08-08

PA ranks on 2025 PSSA and Keystone results: Springfield #14, Rose Tree Media #24, Garnet Valley #29, Marple Newtown #74. Rose Tree Media 71% maths / 81% reading.

_Goes stale: Annually._

### [Best school districts, Delaware County](https://www.niche.com/k12/search/best-school-districts/c/delaware-county-pa/)

**Niche** · Commercial estimate · retrieved 2026-08-08

National district rankings (2024): Garnet Valley #263, Springfield #311, Marple Newtown #360, Rose Tree Media #518.

> Niche blends test scores with survey data and self-reported reviews. Useful as a cross-check, not as evidence on its own.

_Goes stale: Annually._

## First-time buyer assistance

State and county programmes, their limits and their eligibility rules.

_Used by: The eligibility check, which tests your figures against each programme._

### [Assistance Loans available with Home Purchase Loans](https://www.phfa.org/programs/assistance.aspx)

**Pennsylvania Housing Finance Agency** · Official · retrieved 2026-08-08

K-FIT (5% of price, no cap, forgiven over ten years), K-DATE (5% deferred), Keystone Advantage (lesser of 4% or $6,000), the $500 PHFA Grant, and the Employer Assisted Housing uplift to $8,000. Credit and asset requirements for each.

_Goes stale: Check before applying — terms change._

### [Appendix A — Maximum Purchase Price and Income Limits, effective 1 July 2026](https://www.phfa.org/forms/sellersguide/appendices/a.pdf)

**Pennsylvania Housing Finance Agency** · Official · retrieved 2026-08-08

Delaware County: purchase price ceiling $588,800; income limit $122,700 for 1-2 person households, $141,100 for 3 or more. Philadelphia is a target area with higher ceilings.

> The $141,100 three-person limit is what makes this household eligible. Confirm household size counts as PHFA expects.

_Goes stale: Annually, effective each 1 July._

### [Housing Initiatives — Homeownership First](https://delcopa.gov/hcd/housinginitiatives)

**Delaware County Housing & Community Development** · Official · retrieved 2026-08-08

Up to $10,000 towards deposit and closing costs at 0% interest, repayable on sale and forgiven after five years in a designated Revitalization Area. Counselling required.

> Aimed at low-to-moderate incomes; published limits are not the PHFA ones. Whether this household qualifies is unconfirmed.

_Goes stale: Funding is limited and reopens periodically — check availability._

## Mortgage and insurance

Low-deposit loan terms and mortgage insurance pricing by credit score.

_Used by: The PMI calculation and the cash needed at closing._

### [Conventional 97 Loan: 3% Down Payment Program](https://thelendersnetwork.com/conventional-97-ltv-program/)

**The Lenders Network** · Secondary reporting · retrieved 2026-08-08

3% minimum deposit, 620 minimum score, no upfront premium, and mortgage insurance that cancels at 80% loan-to-value.

_Goes stale: Confirm current terms with a lender._

### [How Much Is PMI? Costs by Credit Score and Down Payment](https://www.altgage.com/blog/how-much-is-pmi)

**Altgage** · Secondary reporting · retrieved 2026-08-08

Indicative annual PMI rates by credit band and deposit size. At 780+ with 3% down the rate used here is 0.55% of the original loan.

> Insurers price individually on credit, debt-to-income and property type. These are planning ranges, not quotes.

_Goes stale: Get a real quote before committing._

## Tax-advantaged accounts

Contribution limits and withdrawal rules for HSAs and dependent care accounts.

_Used by: Contribution targets, the childcare cost of a second income, and the HSA drawdown options._

### [Notice 2026-05 — 2026 HSA and HDHP limits](https://www.irs.gov/pub/irs-drop/n-26-05.pdf)

**Internal Revenue Service** · Official · retrieved 2026-08-08

Family HSA limit $8,750; self-only $4,400; catch-up $1,000 from 55. HDHP minimum family deductible $3,400, out-of-pocket maximum $17,000.

_Goes stale: Every January._

### [Dependent Care FSA limit increased to $7,500 for 2026](https://www.hwhlaw.com/advisory-dependent-care-fsa-limit-increased-to-7-500-for-2026)

**HWH Law (on the One Big Beautiful Bill Act)** · Secondary reporting · retrieved 2026-08-08

The annual Dependent Care FSA limit rises from $5,000 to $7,500 from 1 January 2026 — the first increase since 1986. Not indexed for inflation.

_Goes stale: Confirm your employer adopted the higher limit; they are not obliged to._

### [HSA reimbursement guide and rules](https://www.fidelity.com/learning-center/smart-money/hsa-reimbursement)

**Fidelity** · Secondary reporting · retrieved 2026-08-08

No deadline for reimbursing yourself, provided the expense was incurred after the account was opened and you keep records.

_Goes stale: Stable rule, but confirm with a tax professional before a large withdrawal._

### [About Form 8889, Health Savings Accounts](https://www.irs.gov/forms-pubs/about-form-8889)

**Internal Revenue Service** · Official · retrieved 2026-08-08

How HSA distributions are self-reported, and what the 1099-SA feeds into.

_Goes stale: Annually._

## Social Security and wages

Benefit eligibility, work credits, and local pay for a second earner.

_Used by: The second income presets and the retirement discussion._

### [Can noncitizens receive Social Security benefits?](https://www.ssa.gov/faqs/en/questions/KA-02447.html)

**Social Security Administration** · Official · retrieved 2026-08-08

Lawfully present noncitizens meeting the eligibility requirements can receive benefits. Citizenship is not the test; lawful presence and work credits are.

> Everything here depends on her specific status. Confirm with SSA or an immigration attorney rather than relying on this.

_Goes stale: Stable, but immigration rules change._

### [Social Security work credits and green card holders](https://legalclarity.org/can-green-card-holders-get-social-security/)

**LegalClarity** · Secondary reporting · retrieved 2026-08-08

40 credits (about ten years) for a retirement benefit. In 2026 one credit per $1,890 earned, four maximum per year — so $7,560 of earnings buys a full year.

_Goes stale: Credit thresholds change annually._

### [Entry Level Business Administration salary, Pennsylvania](https://www.salary.com/research/salary/position/entry-level-business-administration-salary/pa)

**Salary.com** · Commercial estimate · retrieved 2026-08-08

Entry-level average $43,916, range $37,194 to $53,677.

_Goes stale: Annually._

### [Bachelors Business Administration salary, Philadelphia](https://www.ziprecruiter.com/Salaries/Bachelors-Business-Administration-Salary-in-Philadelphia,PA)

**ZipRecruiter** · Commercial estimate · retrieved 2026-08-08

Average $69,745 across all experience levels; 25th percentile $47,900, 75th $84,300.

_Goes stale: Annually._

### [Part-time evening and weekend pay, Philadelphia](https://www.ziprecruiter.com/Jobs/Part-Time-Evening/-in-Philadelphia,PA)

**ZipRecruiter** · Commercial estimate · retrieved 2026-08-08

Part-time evening average $16.49/hr; weekend average $17.01/hr.

_Goes stale: Annually._

---

## What is NOT sourced

- **Your own figures** — pay, spending, balances, fixed obligations — come from you.
- Anything marked `ESTIMATE` in `src/data/seed.ts` is a guess, including take-home
  pay, childcare, groceries and utilities.
- **House prices exist for only 18 of 112 municipalities.** The rest show a blank.
- **School performance is sourced for roughly half the districts.** The rest say
  "not sourced" rather than being left to look poor by omission.
