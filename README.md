# Home Buy Planner

[![Deploy](https://github.com/dgarberj/home-buy-planner/actions/workflows/deploy.yml/badge.svg)](https://github.com/dgarberj/home-buy-planner/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Live demo →](https://dgarberj.github.io/home-buy-planner/)**

A private, local-only planning tool for one question: **when and how should we buy a
house, and would we still be okay if one of us lost a job along the way?**

No backend, no accounts, no telemetry. Everything runs in the browser on this machine.
The live demo opens with generic, invented placeholder numbers (see
[Where the real numbers live](#where-the-real-numbers-live)) -- nothing entered there
ever leaves your browser.

## Getting started

```bash
pnpm install
pnpm test        # 375 tests across the engine, drawdown, rollups and saved-state migration
pnpm dev         # http://localhost:5173
```

## Where things live

```
src/model/types.ts        Assumptions, BudgetItem, BalanceSnapshot, ScenarioConfig, MonthlyResult
src/engine/finance.ts     PMT, amortisation, rate conversions -- pure primitives
src/engine/projection.ts  runProjection() + summarizeScenario() -- the model itself
src/lib/derive.ts         Budget/Balances -> Assumptions rollup (the input seam)
src/lib/format.ts         Money, percent and month-label formatting
src/lib/csv.ts            CSV export of a projection
src/store/useStore.ts     Zustand state, persisted to localStorage
src/store/useProjections.ts  The single place the UI meets the engine
src/components/           UI panels -- one file per section of the page
src/store/migrate.ts      Saved-state migration -- stops old localStorage blanking the app
src/data/seed.ts          Generic placeholder starting state (committed, no real numbers)
src/data/sources.ts       Every external source, what it covers, how far to trust it
src/data/localMarket.ts   Millage for 112 municipalities across three counties (real, sourced)
src/data/schools.ts       District performance, only where sourced
src/data/mortgageInsurance.ts  PMI rates by credit score and deposit
data/                     Your real numbers, gitignored
```

## How the page is laid out

One continuous scroll, inputs first, in the order you'd actually work through them:

1. **Budget** — every recurring dollar in and out, editable in place. Seeded with ~25
   placeholder line items to overwrite.
2. **Assumptions** — raises, inflation, returns, house terms, job-loss settings.
3. **Balances** — the real numbers, logged periodically. The newest row is where the
   projection starts.
4. **Scenarios** — sliders for buy month and job-loss timing.
5. **Dashboard** — plain-English verdicts, the chart, readiness and cash-buffer callouts,
   side-by-side comparison.
6. **Impact at retirement** — where each scenario lands at ages 55/60/65/67/70, and an
   explicit note on where buy timing does and does not make a difference.
7. **Will it last?** — the drawdown: what the pot supports, and when it runs out.
8. **Month by month** — the raw engine output, one row per month, downloadable as CSV.

Sections 1–2 and 4–5 are open by default; Balances and Month-by-month start folded.

The Budget and Balances panels feed the Assumptions totals automatically. Two toggles at
the top of Assumptions turn that off if you'd rather type totals directly.

## Where the real numbers live

This repo is public, so no real household data is committed — see `CLAUDE.md` for the
full rule.

- **`src/data/seed.ts`** holds only generic, round, invented placeholder figures. It ships
  in git and is what a fresh clone opens with.
- Real numbers, if needed locally, go through the app's own forms (saved to
  `localStorage`) or a gitignored `data/household.json` snapshot (see `data/README.md`),
  which the app deep-merges over the seed on load — never into `seed.ts` itself.
- **`data/`** is gitignored (except its `README.md`), and is where the app's **Export**
  writes/reads that JSON snapshot.

## Where the numbers came from

[`SOURCES.md`](SOURCES.md) lists every external figure with a link, what it covers, when it
was retrieved and how often it goes stale — generated from `src/data/sources.ts`, which is
also rendered in the app under **Sources**. Each is graded:

- **Official** — published by the body that sets the figure. Tax millage, IRS limits, PHFA
  programme terms.
- **Commercial estimate** — Zillow, Redfin, salary aggregators. Providers disagree, sometimes
  by a lot.
- **Secondary reporting** — school rankings, loan-programme summaries. Fine for ranking,
  verify before acting.

Anything I could not source is shown as a blank rather than filled in with a plausible
number: house prices exist for 18 of 112 municipalities, school performance for about half
the districts.

## How the model works

`runProjection(assumptions, scenario, months)` is a pure function that walks forward one
month at a time and returns a row per month. Same inputs always give the same outputs;
it knows nothing about React, so it can be tested hard and reused elsewhere.

Conventions the tests pin down:

| Thing                      | Rule                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Month numbering            | Month 1 is _this_ month, with no growth applied yet. Month 13 has had one full year of raises, inflation and returns.                                                                                                                                                                                      |
| Growth rates               | Converted geometrically: `(1 + annual)^(1/12) - 1`, so "7% a year" really is 7% a year.                                                                                                                                                                                                                    |
| Mortgage rate              | The one exception — US lending convention of `annual / 12`, so the payment matches a real quote.                                                                                                                                                                                                           |
| Target house               | Appreciates _while you save for it_. Waiting means a bigger down payment — that's the core buy-early vs buy-later trade-off.                                                                                                                                                                               |
| Rent                       | Inflates at the general expense inflation rate, then disappears at the buy month.                                                                                                                                                                                                                          |
| Escrow (tax/insurance/HOA) | Held flat in nominal terms. It's an estimate anyway, and flat is easier to explain.                                                                                                                                                                                                                        |
| Job loss                   | Income drops to the replacement %, expenses drop by the cut %, and retirement contributions (employee _and_ employer match) optionally pause. Housing is never cut.                                                                                                                                        |
| Negative cash              | **Not clamped.** If savings go below zero the model is telling you the plan doesn't fund itself. The UI flags it in red rather than hiding it.                                                                                                                                                             |
| Two savings pools          | Cash is held to a buffer of N months of total outgoings; surplus above that is swept into investments at the higher return, and shortfalls sell investments before cash is allowed to go negative. Over five years this barely moves the answer; over thirty it dominates it.                              |
| Retirement contributions   | Grow with income by default. A flat contribution across thirty years of raises is a materially wrong model.                                                                                                                                                                                                |
| Mortgage payoff            | Once the last scheduled payment is made, the housing payment drops to escrow only. Only visible on horizons long enough to outlive the loan.                                                                                                                                                               |
| Upkeep                     | Accrues monthly as a share of the home's current value (1%/yr by default) and comes straight out of cash flow. You never get a bill for it, which is why omitting it flatters buying. Tracked separately from the housing payment.                                                                         |
| Mortgage insurance         | Charged as a share of the _original_ loan while loan-to-value sits above the threshold (80% by default), so a 20% down payment never pays any. Falls away through paydown, appreciation, or both. Included inside the housing payment. An optional upfront premium is added to the cash needed at closing. |
| Commitments                | A fixed obligation with an end date is modelled apart from ordinary expenses: it **never inflates** (a court order or contract is a fixed amount) and it is **never cut during a job loss** (you cannot unilaterally stop paying). The month it ends, cash flow steps up for good.                         |

## Drawdown — will the money last?

`runDrawdown()` (in `src/engine/drawdown.ts`, also pure and separately tested) answers the
question the accumulation model can't, from two directions:

- **The withdrawal-rate view** — what annual income the pot supports at your chosen rate
  (4% by default), reported both in retirement-year dollars and translated back into
  today's money, which is far easier to judge.
- **The simulation view** — run the balance forward month by month at the retirement
  return while inflating spending comes out of it, and report the age it hits zero.

They disagree often, and the gap is the interesting part.

### What the model does _not_ do

No taxes on withdrawal (which differ by account type), no Social Security or pension
income, no required minimum distributions, no healthcare shocks — and a single smooth
return every year. Real markets deliver bad years in clumps, and a crash early in
retirement does far more damage than the same crash later. **Treat the age the money runs
out as a rough marker, not a date.**

`summarizeScenario` adds the two headline answers:

- **Readiness month** — the first month savings would cover the down payment plus
  closing costs on the (appreciating) target house. Measured against a shadow run where
  you never buy, so the answer to "when could we afford it?" isn't distorted by the
  purchase being tested. `null` means not on track inside the horizon.
- **Minimum cash buffer** — the lowest liquid balance hit across the horizon, and the
  month it happens. This is the resilience number.
- **Milestones by age** — net worth, retirement balance, home equity and investments at
  each retirement age you care about, plus mortgage payoff month and lifetime interest.

## Status

- [x] Scaffold, types, projection engine, test suite (81 tests)
- [x] Assumptions / Budget / Balances forms with localStorage persistence
- [x] Scenario builder with sliders
- [x] Dashboard: net-worth chart, readiness callouts, comparison table
- [x] Raw month-by-month table with CSV export
- [x] Cash/investment split, retirement-age milestones, full mortgage life
- [x] Home upkeep and mortgage insurance
- [x] Time-limited commitments, upfront mortgage insurance
- [x] Retirement drawdown engine and panel
- [ ] Set the real ages via `data/household.json`
- [ ] Refine the placeholder budget into the real numbers, locally
