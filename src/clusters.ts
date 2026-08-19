import { isShareHash } from "./lib/share";

/**
Groups the 13 `NAV`/`Section` ids (see `src/nav.ts`) into three tabs so the
content pane can mount one group at a time instead of one continuous scroll.
Kept separate from `nav.ts` so `NAV` itself stays exactly the flat list
Phase 1 left it.
*/
export type ClusterId = "setup" | "where" | "results";

const CLUSTER_LABELS: Record<ClusterId, string> = {
  setup: "Setup",
  where: "Where & how",
  results: "Results",
};

/**
Everything a `Section` needs to render its header. Order within a cluster is
display order -- kept as data rather than hand-inlined JSX in App.tsx so a
new section is one array entry, not a five-prop block to copy. `CLUSTERS`
below groups these by `cluster` rather than duplicating the membership list,
so the two can never drift apart.
*/
export interface SectionMeta {
  id: string;
  cluster: ClusterId;
  eyebrowKey: string;
  eyebrowDefault: string;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  defaultOpen?: boolean;
}

export const SECTIONS: SectionMeta[] = [
  {
    id: "balances",
    cluster: "setup",
    eyebrowKey: "app.sections.balances.eyebrow",
    eyebrowDefault: "Step 1",
    titleKey: "app.sections.balances.title",
    titleDefault: "What we actually have",
    descriptionKey: "app.sections.balances.description",
    descriptionDefault:
      "A snapshot of real balances, logged every month or quarter. The newest one is where the projection starts.",
  },
  {
    id: "budget",
    cluster: "setup",
    eyebrowKey: "app.sections.budget.eyebrow",
    eyebrowDefault: "Step 2",
    titleKey: "app.sections.budget.title",
    titleDefault: "What comes in and what goes out",
    descriptionKey: "app.sections.budget.description",
    descriptionDefault:
      "Your actual budget. Anything marked ESTIMATE is still a guess — fixing those, starting with take-home, makes everything downstream more honest.",
    defaultOpen: false,
  },
  {
    id: "contributions",
    cluster: "setup",
    eyebrowKey: "app.sections.contributions.eyebrow",
    eyebrowDefault: "Step 3",
    titleKey: "app.sections.contributions.title",
    titleDefault: "Retirement contributions",
    descriptionKey: "app.sections.contributions.description",
    descriptionDefault:
      "What you are putting away each year, against the targets — and what that leaves for a deposit.",
    defaultOpen: false,
  },
  {
    id: "assumptions",
    cluster: "setup",
    eyebrowKey: "app.sections.assumptions.eyebrow",
    eyebrowDefault: "Step 4",
    titleKey: "app.sections.assumptions.title",
    titleDefault: "Assumptions",
    descriptionKey: "app.sections.assumptions.description",
    descriptionDefault:
      "The rates and terms behind the projection: raises, inflation, investment returns, and the house we're aiming at. Hover any ? for what it means.",
    defaultOpen: false,
  },
  {
    id: "market",
    cluster: "where",
    eyebrowKey: "app.sections.market.eyebrow",
    eyebrowDefault: "Step 5",
    titleKey: "app.sections.market.title",
    titleDefault: "Where to buy",
    descriptionKey: "app.sections.market.description",
    descriptionDefault:
      "Real 2026 Delaware County tax rates. The same house can cost several hundred a month more depending only on which township line it sits behind.",
  },
  {
    id: "lender",
    cluster: "where",
    eyebrowKey: "app.sections.lender.eyebrow",
    eyebrowDefault: "The hard gate",
    titleKey: "app.sections.lender.title",
    titleDefault: "What a lender will allow",
    descriptionKey: "app.sections.lender.description",
    descriptionDefault:
      "A different calculation from yours — gross income, fixed obligations counted as debt, upkeep ignored. The smaller of the two ceilings is the one that governs.",
  },
  {
    id: "waiting",
    cluster: "where",
    eyebrowKey: "app.sections.waiting.eyebrow",
    eyebrowDefault: "The trade-off",
    titleKey: "app.sections.waiting.title",
    titleDefault: "Is it worth waiting?",
    descriptionKey: "app.sections.waiting.description",
    descriptionDefault:
      "Whether saving longer actually puts a better house in reach — and which of the two constraints is really holding you back.",
  },
  {
    id: "scenarios",
    cluster: "results",
    eyebrowKey: "app.sections.scenarios.eyebrow",
    eyebrowDefault: "Step 6",
    titleKey: "app.sections.scenarios.title",
    titleDefault: "Scenarios to compare",
    descriptionKey: "app.sections.scenarios.description",
    descriptionDefault:
      "Buy early or buy later, with or without a job loss. Add as many as you like.",
  },
  {
    id: "dashboard",
    cluster: "results",
    eyebrowKey: "app.sections.dashboard.eyebrow",
    eyebrowDefault: "The answer",
    titleKey: "app.sections.dashboard.title",
    titleDefault: "Dashboard",
    descriptionKey: "app.sections.dashboard.description",
    descriptionDefault:
      "How the scenarios diverge over the next few years, and whether each one holds up.",
  },
  {
    id: "retirement",
    cluster: "results",
    eyebrowKey: "app.sections.retirement.eyebrow",
    eyebrowDefault: "The long view",
    titleKey: "app.sections.retirement.title",
    titleDefault: "Impact at retirement",
    descriptionKey: "app.sections.retirement.description",
    descriptionDefault:
      "How the buy-early decision compounds by the time you stop working — and, just as importantly, where it doesn't.",
  },
  {
    id: "drawdown",
    cluster: "results",
    eyebrowKey: "app.sections.drawdown.eyebrow",
    eyebrowDefault: "The real question",
    titleKey: "app.sections.drawdown.title",
    titleDefault: "Will the money last?",
    descriptionKey: "app.sections.drawdown.description",
    descriptionDefault:
      "A pot of money at 65 means nothing on its own. This is what it actually supports, and when it runs out.",
  },
  {
    id: "detail",
    cluster: "results",
    eyebrowKey: "app.sections.detail.eyebrow",
    eyebrowDefault: "The receipts",
    titleKey: "app.sections.detail.title",
    titleDefault: "Month by month",
    descriptionKey: "app.sections.detail.description",
    descriptionDefault:
      "The raw output of the projection, one row per month, for checking the model's working.",
    defaultOpen: false,
  },
  {
    id: "sources",
    cluster: "results",
    eyebrowKey: "app.sections.sources.eyebrow",
    eyebrowDefault: "The receipts",
    titleKey: "app.sections.sources.title",
    titleDefault: "Where the numbers came from",
    descriptionKey: "app.sections.sources.description",
    descriptionDefault:
      "Every external figure in this app, with a link, what it covers, and how far to trust it.",
    defaultOpen: false,
  },
];

/**
Groups `SECTIONS` into three tabs so the content pane can mount one group at
a time instead of one continuous scroll.
*/
export const CLUSTERS: {
  id: ClusterId;
  label: string;
  sectionIds: string[];
}[] = (Object.keys(CLUSTER_LABELS) as ClusterId[]).map((id) => ({
  id,
  label: CLUSTER_LABELS[id],
  sectionIds: SECTIONS.filter((s) => s.cluster === id).map((s) => s.id),
}));

/**
Which cluster a given Section id lives in. Falls back to "setup" for an
unrecognized id rather than throwing, since this is presentation grouping,
not validation.
*/
export function clusterOfSection(id: string): ClusterId {
  const found = CLUSTERS.find((c) => c.sectionIds.includes(id));
  return found ? found.id : "setup";
}

const ALL_SECTION_IDS = new Set(CLUSTERS.flatMap((c) => c.sectionIds));

/**
The Section id a `location.hash` (leading "#" included, may be empty) points
at, or null if it doesn't point at one -- an empty hash, a `#share=...`
payload (handled entirely by `ShareImportHandler`, never a section id), or an
id this app doesn't recognize.
*/
export function sectionIdFromHash(hash: string): string | null {
  if (!hash || isShareHash(hash)) return null;
  const id = hash.slice(1);
  return ALL_SECTION_IDS.has(id) ? id : null;
}

/**
Which cluster to open on initial load, given `location.hash`. Falls back to
"setup" for an empty, share, or unrecognized hash.
*/
export function clusterForHash(hash: string): ClusterId {
  const id = sectionIdFromHash(hash);
  return id ? clusterOfSection(id) : "setup";
}
