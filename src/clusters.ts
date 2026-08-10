import { isShareHash } from "./lib/share";

/**
Groups the 13 `NAV`/`Section` ids (see `src/nav.ts`) into three tabs so the
content pane can mount one group at a time instead of one continuous scroll.
Kept separate from `nav.ts` so `NAV` itself stays exactly the flat list
Phase 1 left it.
*/
export type ClusterId = "setup" | "where" | "results";

export const CLUSTERS: { id: ClusterId; label: string; sectionIds: string[] }[] = [
  {
    id: "setup",
    label: "Setup",
    sectionIds: ["budget", "assumptions", "balances", "contributions"],
  },
  {
    id: "where",
    label: "Where & how",
    sectionIds: ["market", "lender", "waiting"],
  },
  {
    id: "results",
    label: "Results",
    sectionIds: [
      "scenarios",
      "dashboard",
      "retirement",
      "drawdown",
      "detail",
      "sources",
    ],
  },
];

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
