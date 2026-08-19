# 1. Stale data threshold

## Status

Accepted — 2026-08-10

## Context

This app has no backend: every external number is fetched once (by hand or
by a one-off script under `scripts/`), reviewed, and committed as a static
file in `src/data/`, in the pattern documented in `sources.ts` (retrieval
date, refresh cadence, reliability). That pattern records _when_ something
was fetched, but nothing in the codebase stopped a value from quietly aging
past the point of being useful.

The gap surfaced concretely in `src/data/recentSales.ts`: individual
Montgomery County property sale records committed there range from 1989 to 2026. The file's own header already flagged this ("some records here are
recent; others are a decade or more old") but nothing enforced it — a stale
1989 sale and a fresh 2026 sale were treated identically by `medianOf()` and
displayed side by side in `RecentSalesCard`. The same risk exists, less
visibly, everywhere else a `retrieved` date sits in `sources.ts`: a school
proficiency figure or a flood-risk score from years ago is not automatically
flagged as too old to act on.

Different kinds of data go stale at different rates. A home sale six months
ago is still informative about the current market; a home sale ten years
ago is not. A school's test scores don't meaningfully shift year to year, so
a few years' lag is tolerable. Climate/hazard risk scores are built from
long-run historical hazard data and change slowly, so a decade-old figure is
still usable context.

## Decision

Every fetched data source is assigned a **category**, and every category has
a **staleness threshold**. Data older than its threshold is stale and must
not be presented as trustworthy — excluded from aggregates and flagged or
hidden in the UI, not silently averaged in alongside fresh data.

| Category           | Threshold | Applies to                                                   |
| ------------------ | --------- | ------------------------------------------------------------ |
| Home sales         | 1 year    | Individual sale records (`recentSales.ts`)                   |
| Crime statistics   | 3 years   | Not yet implemented — reserved for when PA UCR data is added |
| School statistics  | 3 years   | District performance (`schools.ts`, Future Ready PA Index)   |
| Climate statistics | 10 years  | County hazard risk (`climateRisk.ts`, FEMA NRI)              |

Thresholds are centralized in `src/data/freshness.ts` as the single source
of truth (`STALE_THRESHOLD_DAYS`), rather than duplicated as magic numbers
wherever a date comparison happens. `isStale(dateISO, category)` is the one
function every data module calls to answer "is this too old to trust".

Two enforcement points, depending on whether a source has one date for the
whole dataset or a date per record:

1. **Per-record data** (home sales — every row has its own `saleDate`):
   filter stale rows out of anything derived or displayed. `recentSales.ts`
   exposes `freshSalesIn()` alongside the raw `salesIn()`, and
   `RecentSalesCard` uses the fresh variant for both the summary and the
   expanded table, disclosing how many records were excluded as stale
   rather than just shrinking the list silently.
2. **Dataset-level data** (school and climate figures — one `retrieved`
   date per source in `sources.ts`, no per-row date): each `Source` gets an
   optional `category`, and `isSourceStale()` checks its `retrieved` date
   against that category's threshold. `sources.test.ts` fails the build if
   any categorized source has gone stale, and `SourcesPanel` shows a STALE
   badge so it's visible without reading test output.

Fetch scripts (`scripts/fetch-montco-sales.mjs` and any future equivalent)
default their query window to match the relevant threshold, so a fresh
pull doesn't reintroduce a wall of old records that then get filtered out
downstream anyway.

## Consequences

- Some currently-committed data (most of `recentSales.ts`) is stale under
  this policy the moment it lands, since it predates the policy. It stays
  in the file for provenance/audit but is filtered out of anything the app
  presents as current. Re-running the fetch script with the new default
  window is the way to replace it with fresh records.
- School and climate data were fetched 2026-08-10 and are fresh against
  their 3-year and 10-year thresholds respectively; this is not expected to
  bite until a future annual data refresh is skipped.
- A category with no implemented data source yet (crime) still gets a
  threshold now, so whoever builds it later has policy to build against
  instead of picking a number ad hoc.
- "Stale" is a hardcoded, non-configurable constant per category. If a
  future need arises for per-source overrides (e.g. one house's sale being
  usable as a comp for longer because nothing else changed on the block),
  that would need a follow-up ADR rather than a quiet exception.

## Update — 2026-08-15

The per-source override anticipated above turned out to be the better
default, not just a future exception. The four shared categories
(`homeSales`/`crime`/`schools`/`climate`) are gone; every source in
`src/data/dataSources.ts`'s `DATA_SOURCES` now carries its own optional
`staleAfterDays` instead of borrowing one of four buckets. This grew
coverage well beyond the original three enforced sources (home sales,
schools, climate) to roughly a dozen — millage, PMI tables, IRS
contribution limits, Fannie Mae DTI limits, and more, wherever a genuine
active refresh cadence exists. Sources with no real cadence (a deliberately
frozen secondary cross-check, "confirm before relying on it") simply omit
`staleAfterDays` and are never flagged — same opt-in shape as the old
`category` field, just per-source. The _principle_ from the Decision above
is unchanged: `isStale()` is still the one function every module calls,
`sources.test.ts` still fails the build on any stale source, and
`SourcesPanel` still shows a STALE badge. Home sales' per-record enforcement
(`recentSales.ts`'s `freshSalesIn`) now reads its threshold directly off the
`montco-parcels` source entry rather than a separate category constant, so
there is exactly one number instead of two that had to be kept in sync.

Each source's registry entry also gained an optional `fetchUrl` (a
machine-fetchable endpoint, distinct from the human citation `url`) and a
`fetchedAt` date, laying the groundwork for an eventual build-time
fetch-if-stale step. That step is not built yet — most sources (PDFs,
Redfin/Zillow pages, Salary.com) have no API to hit, and building it raises
its own open questions (what happens when a source is down mid-build,
whether to keep a human-review gate). It's tracked separately, not part of
this change.
