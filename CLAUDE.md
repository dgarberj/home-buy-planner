# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repo.

## What this is

A client-side React/TypeScript app for modelling household finances: a
budget, savings/retirement balances, a home-buying projection engine, and
county tax/school reference data (Delaware & Montgomery County, PA) used to
compare towns. No backend — everything runs in the browser, state is held in
Zustand and persisted to localStorage.

- `pnpm dev` — start the Vite dev server
- `pnpm test` — run the Vitest suite
- `pnpm typecheck` — `tsc -b --noEmit`
- `pnpm lint` — ESLint

## Personal reports

**Never write personal financial data — real income, balances, family
details, specific dollar figures about this household — into any file
tracked by git.**

- Ad-hoc analysis, strategy write-ups, or reports containing real numbers
  belong in `/reports/`. That directory is gitignored; do not remove it from
  `.gitignore` and do not commit files out of it individually.
- `src/data/seed.ts` is the app's default data and **must stay generic** —
  round, invented placeholder figures only. It ships in git and is what a
  fresh clone opens with. Real household numbers, if needed locally, go
  through the app's own forms (saved to localStorage) or a gitignored file
  (`/data/household.json`, see `/data/README.md`), never into `seed.ts`
  itself.
- `/data/` is also gitignored (exported real balance snapshots), except
  `/data/README.md`.
- Reference data that is generic/public — county tax tables, school stats,
  contribution limits, mortgage-insurance tables (`src/data/*.ts` besides
  `seed.ts`) — is fine to commit; it's app functionality, not personal data.

When adding a new file that will contain this household's real numbers,
default to putting it under `/reports/` (or extending the `/data/` or
`*.household.json` gitignore patterns) rather than the repo root.
