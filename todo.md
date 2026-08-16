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
- Delaware County has no scriptable source at all, and the spike below concluded it
  isn't worth building one — "every data source" isn't uniformly fetchable today,
  and won't be until the manual county data request comes through.

## Spike: scraping Delco recent home purchases — CLOSED, no-go (2026-08-15)

Delaware County's property search
(`http://delcorealestate.co.delaware.pa.us/pt/search/advancedsearch.aspx?mode=advanced`)
is a Tyler Technologies iasWorld Public Access portal — session-based ASP.NET
WebForms (disclaimer click-through, `__VIEWSTATE` postbacks), not a REST/JSON API
like Montgomery's ArcGIS feature service. Revisited the open unknowns on 2026-08-15:

- **Site reliability:** worse than "in maintenance" — the host's HTTPS certificate
  has expired, so any TLS-validating client (including a real scraper library, not
  just this fetch) fails the handshake outright before a disclaimer page ever loads.
  Legacy WebForms portal + expired cert is not something to build automation against.
- **CAPTCHA/bot-detection:** still unconfirmed either way — couldn't get past the
  cert failure to find out. Moot given the point above.
- **Terms of Use:** still nothing found that explicitly addresses automated/bulk
  access — only a generic liability disclaimer (no warranty of accuracy, no
  liability for misuse). The separate "Search Disclaimer" page is still unreachable.
  Not a blocker on its own, but doesn't help the case for scraping either.
- **No bulk alternative exists.** Checked Delaware County's own open-data catalog
  (`delaware-county-pennsylvania-dcpd.hub.arcgis.com`, DCAT feed, 63 datasets) —
  nothing is a per-parcel assessment/sales layer with price data. The closest hits
  are "Property Maps" (a static page, not a service), a "Housing Dashboard"
  (pre-aggregated, no individual transactions), and subdivision/land-development
  layers (not sales). Unlike Montgomery, there's no ArcGIS feature service to query
  in bulk — the WebForms portal really is the only public search, address-by-address,
  no export.

**Decision: don't build a Delco scraper.** No bulk source, unclear ToS, and the one
public search UI is presently unreachable over HTTPS — too fragile and too
address-by-address to be worth automating even if the cert gets fixed. The manual
data request is the only real path forward:

- **Anita Bostwick, GIS Manager, Board of Assessments** — (610) 891-4793,
  BostwickA@co.delaware.pa.us. Confirmed current as of 2026-08-15
  (`delcopa.gov/odmi/data-requests` lists the same contact for parcel/real-estate
  data). Send the request per the "Also worth doing" item below — same
  Montgomery-caveat pattern already documented in `recentSales.ts`.

## Also worth doing

- **Apply the new staleness pattern to `localMarket.ts` too.** `docs/adr/0001-stale-data-threshold.md`
  and `freshness.ts` only gate `recentSales.ts` right now. `medianPrice`'s staleness
  lives as a free-text date inside `priceSource` (e.g. `"Zillow 2026"`), not a field
  `isStale()` can actually check — same underlying problem, different data file.
- **Close more of the municipality price gap.** Now 28 of 112 towns have a sourced
  `medianPrice` (`localMarket.test.ts` pins this), up from 18 — 10 more Montgomery
  towns added 2026-08-15 (Ambler, Collegeville, Hatboro, Jenkintown, Lansdale, North
  Wales, Pottstown, Royersford, Souderton, West Conshohocken), prioritizing towns that
  already have `recentSales.ts` comps. Skipped that pass: Plymouth (Zillow only has
  reliable data for the "Plymouth Meeting" sub-area, not the township `localMarket.ts`
  actually covers), Horsham (search kept surfacing a metro-area figure mislabeled as
  town-specific), Trappe (Zillow only has a combined "Trappe Collegeville" page), and
  Upper Dublin (no clean ZHVI figure available, only inconsistent sold-price
  snippets) — still gaps, need a more targeted source than web search snippets.
- **Delaware County: send the manual data request.** The scrape spike above is
  closed (no-go) — emailing the county GIS Manager, Anita Bostwick
  (BostwickA@co.delaware.pa.us, Board of Assessments), is now the only path to
  Delco recent-sales data.
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
