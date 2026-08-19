import { describe, expect, it } from "vitest";
import {
  baseData,
  deepMerge,
  diffFromBase,
  migrateSaved,
  type HouseholdData,
} from "./migrate";
import { SEED_VERSION } from "../data/seed";

/**
 * ============================================================================
 *  diffFromBase -- the other half of the persistence contract.
 * ============================================================================
 *
 * `deepMerge` (see migrate.test.ts) is what turns a shrunk localStorage
 * payload back into a full HouseholdData. `diffFromBase` is what shrinks it
 * in the first place (see `overrideStorage.setItem` in useStore.ts) -- every
 * write to localStorage goes through it. It had no direct tests before this:
 * a bug here either bloats every save back out to a full snapshot (defeating
 * the point) or, worse, drops an edit on the way to disk. The round-trip
 * tests below are the ones that would actually catch the second kind.
 */
describe("diffFromBase", () => {
  it("drops a leaf that matches the default", () => {
    expect(diffFromBase({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeUndefined();
  });

  it("keeps a leaf that differs from the default", () => {
    expect(diffFromBase({ a: 1, b: 2 }, { a: 1, b: 9 })).toEqual({ b: 9 });
  });

  it("keeps only the nested keys that actually changed", () => {
    expect(diffFromBase({ a: { x: 1, y: 2 } }, { a: { x: 1, y: 9 } })).toEqual({
      a: { y: 9 },
    });
  });

  it("collapses an object back to nothing once every key matches again", () => {
    expect(diffFromBase({ a: { x: 1 } }, { a: { x: 1 } })).toBeUndefined();
    expect(
      diffFromBase({ a: { x: 1 }, b: 2 }, { a: { x: 1 }, b: 2 }),
    ).toBeUndefined();
  });

  it("keeps an array whole when it differs, drops it when identical", () => {
    expect(diffFromBase({ xs: [1, 2] }, { xs: [1, 3] })).toEqual({
      xs: [1, 3],
    });
    expect(diffFromBase({ xs: [1, 2] }, { xs: [1, 2] })).toBeUndefined();
  });

  it("round-trips a handful of edits across sections through deepMerge", () => {
    const base = baseData();
    const state = structuredClone(base);
    state.assumptions.income.monthlyTakeHome = 12_345;
    state.settings.horizonMonths = 42;
    state.budget = [
      ...state.budget,
      {
        id: "extra",
        label: "Extra",
        category: "Other",
        type: "variable",
        amount: 50,
      },
    ];
    const diff = diffFromBase(base, state);
    expect(deepMerge(base, diff)).toEqual(state);
  });

  it("produces no diff at all, and reproduces base exactly, when nothing changed", () => {
    const base = baseData();
    const diff = diffFromBase(base, structuredClone(base));
    expect(diff).toBeUndefined();
    expect(deepMerge(base, diff)).toEqual(base);
  });

  it("survives clearing a nullable field back to null, even when the base default for it is a real value", () => {
    // A nullable field (e.g. `endMonth: number | null`) does not always have
    // a null *base* -- a local override file, or an earlier edit, can leave
    // a concrete number sitting in `baseData()`. Clearing it back to null in
    // the UI has to survive the diff/merge round trip like any other edit;
    // it must not be mistaken for the corrupted-scalar case (a stray null on
    // a field that is never null in the schema, e.g. `household.primaryAge`).
    const base: HouseholdData = {
      ...baseData(),
      assumptions: {
        ...baseData().assumptions,
        home: {
          ...baseData().assumptions.home,
          assistanceMaxAmount: 5_000 as number | null,
        },
      },
    };
    const state = structuredClone(base);
    state.assumptions.home.assistanceMaxAmount = null;

    const diff = diffFromBase(base, state);
    const restored = deepMerge(base, diff);
    expect(restored.assumptions.home.assistanceMaxAmount).toBeNull();
  });
});

/**
Every leaf field in `base`, as the property-path that reaches it (arrays
count as leaves -- both diffFromBase and deepMerge replace them wholesale,
never recurse into them).
*/
function leafPaths(value: unknown, prefix: string[] = []): string[][] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix.length > 0 ? [prefix] : [];
  }
  const paths: string[][] = [];
  for (const [key, child] of Object.entries(value)) {
    paths.push(...leafPaths(child, [...prefix, key]));
  }
  return paths;
}

function getAt(root: unknown, path: string[]): unknown {
  let node = root;
  for (const key of path) {
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function setAt(root: unknown, path: string[], value: unknown): void {
  let node = root as Record<string, unknown>;
  const parents = path.slice(0, -1);
  for (const key of parents) {
    node = node[key] as Record<string, unknown>;
  }
  node[path.at(-1)!] = value;
}

/**
A value that is guaranteed to differ from whatever was there, of a shape
diffFromBase/deepMerge can round-trip.
*/
function perturb(value: unknown): unknown {
  if (typeof value === "number") return value + 1;
  if (typeof value === "string") return `${value}__changed`;
  if (typeof value === "boolean") return !value;
  if (value === null) return "was-null";
  if (Array.isArray(value)) return [...value, value[0]];
  throw new Error(`don't know how to perturb ${typeof value}`);
}

describe("diffFromBase + deepMerge round-trip the whole schema", () => {
  it("preserves every leaf field, changed one at a time, across every section", () => {
    const base = baseData();
    const paths = leafPaths(base);
    // A sanity floor, not a magic number -- if this drops a lot, something
    // upstream (e.g. baseData() itself) broke in a way that silently makes
    // this test vacuous instead of failing it.
    expect(paths.length).toBeGreaterThan(50);

    for (const path of paths) {
      // A stray `undefined` leaf isn't part of the schema -- it can only
      // come from an unknown key in a local, gitignored data override that
      // deepMerge intentionally drops rather than passes through (see
      // `deepMerge`'s scalar-type-mismatch branch). Nothing in the shipped
      // app reads it either way, so it has no round-trip contract to hold.
      if (getAt(base, path) === undefined) continue;

      const state = structuredClone(base);
      setAt(state, path, perturb(getAt(base, path)));

      const diff = diffFromBase(base, state);
      const restored = deepMerge(base, diff);

      expect(getAt(restored, path), path.join(".")).toEqual(getAt(state, path));
      // Nothing else should have moved as a side effect of one field's diff.
      expect(restored, path.join(".")).toEqual(state);
    }
  });
});

describe("migrateSaved survives arbitrary shape corruption at every path", () => {
  it("never throws and always returns a fully renderable shape", () => {
    const base = baseData();
    const corruptions: unknown[] = [
      "corrupt-string",
      12_345,
      true,
      null,
      [],
      {},
      { nested: { garbage: true } },
    ];

    for (const path of leafPaths(base)) {
      for (const junk of corruptions) {
        const state = structuredClone(base) as unknown as Record<
          string,
          unknown
        >;
        setAt(state, path, junk);
        state.seedVersion = SEED_VERSION;

        const label = `${path.join(".")} = ${JSON.stringify(junk)}`;
        let out: ReturnType<typeof migrateSaved>;
        expect(() => {
          out = migrateSaved(state);
        }, label).not.toThrow();

        // Scalar fields tolerate null (clearing a nullable field is a real
        // edit, not corruption -- see `resolveScalar`), so a numeric field
        // corrupted with null legitimately becomes null itself. Every field
        // *not* on the corrupted path must still be exactly what it was.
        const dottedPath = path.join(".");
        const expectNumberUnlessThisFieldWasClearedToNull = (
          actual: unknown,
          fieldPath: string,
        ) => {
          if (junk === null && dottedPath === fieldPath) {
            expect(actual === null || typeof actual === "number", label).toBe(
              true,
            );
          } else {
            expect(typeof actual, label).toBe("number");
          }
        };

        expectNumberUnlessThisFieldWasClearedToNull(
          out!.assumptions.household.primaryAge,
          "assumptions.household.primaryAge",
        );
        expectNumberUnlessThisFieldWasClearedToNull(
          out!.assumptions.drawdown.retirementAge,
          "assumptions.drawdown.retirementAge",
        );
        expectNumberUnlessThisFieldWasClearedToNull(
          out!.assumptions.savings.cashBalance,
          "assumptions.savings.cashBalance",
        );
        expectNumberUnlessThisFieldWasClearedToNull(
          out!.settings.grossAnnualSalary,
          "settings.grossAnnualSalary",
        );
        // Arrays are never nullable in the schema, so these hold
        // unconditionally -- they're what stops the original blank-page
        // crash (an unguarded `.map()` over something that isn't an array).
        expect(Array.isArray(out!.assumptions.obligations), label).toBe(true);
        expect(Array.isArray(out!.budget), label).toBe(true);
        expect(Array.isArray(out!.balances), label).toBe(true);
        expect(Array.isArray(out!.scenarios), label).toBe(true);
        expect(Array.isArray(out!.settings.milestoneAges), label).toBe(true);
      }
    }
  });
});
