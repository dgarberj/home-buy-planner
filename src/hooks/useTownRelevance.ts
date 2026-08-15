import { useMemo } from "react";
import { compareNullableDesc } from "../data/localMarket";
import type { RankedTown } from "./useRankedTowns";

/**
 * How many towns are auto-expanded on load, before the user pins or browses
 * anything. Kept as an explicit constant rather than a magic number so it's
 * easy to find and tune.
 */
export const RELEVANT_TOWN_COUNT = 3;

export interface RelevantTown {
  row: RankedTown;
  /**
   * True when this town cleared the reach screen (comfortable/stretch).
   * False means it was backfilled purely on value score because too few
   * towns cleared that screen -- usually because most of the 112 have no
   * sourced price to classify reach against at all.
   */
  affordabilityScreened: boolean;
}

/**
 * The top N towns worth showing without a click: in-reach towns first,
 * ranked by value score, backfilled by value score alone (ignoring reach)
 * if fewer than N towns are classified comfortable/stretch -- which is the
 * common case, since only ~18/112 towns have a sourced price to screen with.
 */
export function useTownRelevance(
  rows: RankedTown[],
  n: number = RELEVANT_TOWN_COUNT,
): RelevantTown[] {
  return useMemo(() => {
    const inReach = rows
      .filter((r) => r.reach === "comfortable" || r.reach === "stretch")
      .toSorted((a, b) => compareNullableDesc(a.valueScore, b.valueScore));

    const screened: RelevantTown[] = inReach
      .slice(0, n)
      .map((row) => ({ row, affordabilityScreened: true }));

    if (screened.length >= n) return screened;

    const used = new Set(screened.map((r) => r.row.m.name));
    // Prefer unsourced-price towns (reach "unknown", genuinely unscreened)
    // over priced-but-out-of-reach ones as filler, so the "not screened"
    // caveat below stays true of whichever gets backfilled.
    const backfill = rows
      .filter((r) => !used.has(r.m.name))
      .toSorted((a, b) => {
        if (a.reach === "unknown" && b.reach !== "unknown") return -1;
        if (b.reach === "unknown" && a.reach !== "unknown") return 1;
        return compareNullableDesc(a.valueScore, b.valueScore);
      })
      .slice(0, n - screened.length)
      .map((row) => ({ row, affordabilityScreened: false }) as RelevantTown);

    return [...screened, ...backfill];
  }, [rows, n]);
}
