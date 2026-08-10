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

/**
Which cluster to open on initial load, given `location.hash` (leading "#"
included, may be empty). A `#share=...` hash is never a section id -- it's
handled entirely by `ShareImportHandler` -- so it always falls back to
"setup" rather than being misread as an unknown section.
*/
export function clusterForHash(hash: string): ClusterId {
  if (!hash || isShareHash(hash)) return "setup";
  return clusterOfSection(hash.slice(1));
}
