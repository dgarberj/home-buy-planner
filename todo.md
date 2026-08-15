# Todo

## Fetch and parse all data sources on every build, so we always see latest

Right now every sourced dataset (`localMarket.ts`, `schools.ts`, `recentSales.ts`, ...)
is a static file: fetched once by hand or by a script under `scripts/`, reviewed, and
committed. Nothing fetches at runtime, on purpose — the app is client-side only, no
backend (see `CLAUDE.md`), and a live external call from the browser on every page
load would mean either a public API key sitting in the shipped bundle or a CORS wall,
neither of which works for a static GitHub Pages site.

The buildable version of this is a **build-time** fetch, not a runtime one: a step in
`.github/workflows/deploy.yml` that runs the existing `scripts/fetch-*.mjs` pipeline
before `pnpm build`, so each deploy bakes in whatever the sources say _that day_
instead of whatever was last hand-copied into `src/data/`. Open questions before
building this:

- What happens when a source is down or rate-limits the build? Silently falling back
  to the last committed data seems safer than failing the deploy — needs a decision.
- Every `fetch-*.mjs` script currently prints TypeScript to stdout for a human to
  review before it's pasted in (deliberately, per the comments in
  `fetch-montco-sales.mjs` — real transaction data shouldn't ship unreviewed). Full
  automation means removing that human-in-the-loop step, which is a real trade-off,
  not just an engineering detail.
- Delaware County has no scriptable source yet at all (see the spike below) — "every
  data source" isn't uniformly fetchable today.

## Rework the "what can I buy" view

Make it more comprehensive, and surface insights with fewer clicks.

Today the closest thing to a single view is `MarketPanel` — `CountyOverviewCard`,
`HeadToHeadCard`, `LowDepositCard`, `AffordabilityTable`, `RecentSalesCard`,
`NeighbouringCountiesCard` stacked as separate cards, each scoped to its own slice
(tax, PMI, comps, neighbours). `RecentSalesCard` specifically requires a click per
town before any individual sale is visible — aggregate-first is right, but the
drill-down could probably be smarter than one-town-at-a-time (e.g. surface the
town(s) most relevant to the current budget open by default).

Needs a real design pass, not just a refactor — what "comprehensive" means here
(more towns? more data types layered per town — tax + comps + schools + whatever
crime/flood/commute lands as?) and what the actual click-reduction targets are
should get scoped before touching code.

## Spike: scraping Delco recent home purchases

Delaware County's property search
(`http://delcorealestate.co.delaware.pa.us/pt/search/advancedsearch.aspx?mode=advanced`)
is a Tyler Technologies iasWorld Public Access portal — session-based ASP.NET
WebForms (disclaimer click-through, `__VIEWSTATE` postbacks), not a REST/JSON API
like Montgomery's ArcGIS feature service. Unknowns to resolve as part of the spike,
before writing a real scraper:

- Whether it has CAPTCHA/bot-detection in front of search (couldn't confirm — site
  was in maintenance as of 2026-08-10).
- What its actual Terms of Use say about automated/bulk access (the liability
  disclaimer I read doesn't cover this; there's a separate "Search Disclaimer" page
  that returned "page not registered" when fetched).
- Whether it's even worth it per-property-lookup vs. Montgomery's bulk query model —
  no bulk export exists here, so this would be address-by-address at best.
- Fallback if scraping is off the table: emailing the county's GIS Manager (Anita
  Bostwick, Board of Assessments) for a manual bulk data pull, same as noted in
  `recentSales.ts`'s Montgomery-only caveat.

## Also worth doing

- **Expand Montgomery sales coverage for real.** `recentSales.ts` is still a
  hand-pulled sample — 15 records across 5 of ~60 municipalities. Running
  `fetch-montco-sales.mjs` properly (all towns, reviewed, pasted in) is the obvious
  next step now that the freshness filtering exists to keep it honest.
- **Apply the new staleness pattern to `localMarket.ts` too.** `docs/adr/0001-stale-data-threshold.md`
  and `freshness.ts` only gate `recentSales.ts` right now. `medianPrice`'s staleness
  lives as a free-text date inside `priceSource` (e.g. `"Zillow 2026"`), not a field
  `isStale()` can actually check — same underlying problem, different data file.
- **Document `docs/adr/` and `freshness.ts` in the README.** The "Where things live"
  table lists every other sourced file; these two aren't in it yet, so they're easy
  to miss on a fresh clone.
- **Close more of the municipality price gap.** Only 18 of 112 towns have a sourced
  `medianPrice` (`localMarket.test.ts` pins this). Worth prioritizing the towns that
  already have `recentSales.ts` comps, so the two datasets reinforce each other
  instead of covering different towns.
- **Delaware County: send the manual data request now, don't wait on the scrape spike.**
  Emailing the county GIS Manager (Anita Bostwick, Board of Assessments) can happen in
  parallel with the scraping spike above and is the more reliable path if that spike
  hits a ToS or bot-detection wall.
- **Accessibility pass.** Range sliders (`Slider` in `src/components/ui/inputs.tsx`)
  aren't associated with their visible label for screen readers; computed verdicts
  that update as you type could use `aria-live`; worth a spot-check of keyboard
  navigation on the `CountyMap` tiles too.
- **Add the missing README screenshot.** Flagged during the resume-polish pass and
  never closed out — needs a browser session to actually capture the live app.
- **`runProjection()` refactor.** Still the single largest function in the engine
  (~260 lines, `src/engine/projection.ts`). Worth extracting the per-month step into
  a named function before more data types (crime/flood/commute, expanded sales) add
  more branching around it.
