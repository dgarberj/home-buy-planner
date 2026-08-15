import type {
  Assumptions,
  BalanceSnapshot,
  BudgetItem,
  ScenarioConfig,
} from "../model/types";
import type { FilingStatus } from "../data/taxBrackets";
import {
  DEFAULT_HORIZON_MONTHS,
  DEFAULT_MILESTONE_AGES,
  SEED_ASSUMPTIONS,
  SEED_BALANCES,
  SEED_BUDGET,
  SEED_SCENARIOS,
  SEED_SETTINGS,
  SEED_VERSION,
} from "../data/seed";
import { LOCAL_HOUSEHOLD_DATA } from "../data/localOverride";

/**
 * Saved-state handling, kept apart from the store so it can be tested as a
 * plain function.
 *
 * This module exists because of a real bug: the app persists to localStorage,
 * and when the shape of that data changed, Zustand's shallow merge let an old
 * saved `assumptions` object replace the whole tree. Every
 * `assumptions.household.primaryAge` in the UI then threw, and the app rendered
 * a blank white page with no explanation. Anything that migrates saved data
 * deserves tests, so it lives here.
 */

/**
How the model is framed on screen, not what it computes.
*/
export interface Settings {
  horizonMonths: number;
  /**
  ISO year-month the projection starts from, e.g. "2026-08". Month 1 = this.
  */
  startDate: string;
  /**
  Ages the dashboard reports net worth at.
  */
  milestoneAges: number[];
  /**
  Base salary before bonus. The 401(k) contribution target is a share of this.
  */
  grossAnnualSalary: number;
  /**
   * Single or married filing jointly. Paired with `grossAnnualSalary` to
   * look up a federal marginal tax rate -- display only, does not change
   * `income.monthlyTakeHome` or any projection maths.
   */
  filingStatus: FilingStatus;
  /**
  Credit score, which sets the mortgage-insurance rate on a low deposit.
  */
  creditScore: number;
  /**
  Municipalities under active consideration; ringed on the map.
  */
  shortlist: string[];
  /**
   * Paychecks per year. 26 (biweekly) means two months a year carry three
   * paychecks -- the model spreads income evenly, so those months look flatter
   * than they really are.
   */
  paychecksPerYear: number;
  /**
   * Whether the welcome splash (`components/Splash`) has been clicked
   * through once already. Gates first paint on a deliberate "Open the
   * planner" click instead of the full Setup wall of inputs; flips to true
   * permanently once the user enters, but `App.tsx` can still reopen the
   * splash on demand without touching this flag.
   */
  hasSeenSplash: boolean;
}

export interface HouseholdData {
  /**
  Which build of seed.ts this state came from. See SEED_VERSION.
  */
  seedVersion: string;
  assumptions: Assumptions;
  budget: BudgetItem[];
  balances: BalanceSnapshot[];
  scenarios: ScenarioConfig[];
  settings: Settings;
}

export const PALETTE = [
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#db2777",
];

export const uid = () => crypto.randomUUID();

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function seedData(): HouseholdData {
  return {
    seedVersion: SEED_VERSION,
    assumptions: structuredClone(SEED_ASSUMPTIONS),
    budget: structuredClone(SEED_BUDGET),
    balances: structuredClone(SEED_BALANCES),
    scenarios: structuredClone(SEED_SCENARIOS),
    settings: {
      horizonMonths: DEFAULT_HORIZON_MONTHS,
      startDate: thisMonth(),
      milestoneAges: [...DEFAULT_MILESTONE_AGES],
      hasSeenSplash: false,
      ...structuredClone(SEED_SETTINGS),
    },
  };
}

type Plain = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Plain =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Deep-merge saved data over the current defaults.
 *
 * This is what stops an old localStorage payload from blanking the app. Zustand's
 * default merge is shallow, so a saved `assumptions` object written before, say,
 * `household` or `obligations` existed would replace the whole tree and every
 * `assumptions.household.primaryAge` in the UI would throw. Merging key by key
 * means old saves keep their values and simply inherit anything new.
 *
 * Arrays are replaced wholesale on purpose -- merging budget lines index by
 * index would produce nonsense.
 */
export function deepMerge<T>(defaults: T, saved: unknown): T {
  // Anything that is not an object -- null, a string, a number, an array where
  // an object was expected -- cannot be merged, so the defaults stand.
  if (!isPlainObject(saved) || !isPlainObject(defaults)) return defaults;

  const out: Plain = { ...defaults };
  for (const [key, savedValue] of Object.entries(saved)) {
    if (savedValue === undefined) continue;
    const defaultValue = (defaults as Plain)[key];

    if (isPlainObject(defaultValue)) {
      // Only an object may replace an object. A null or a primitive here means
      // the save is corrupt, and taking it would hand the UI something it
      // dereferences straight into a crash.
      out[key] = isPlainObject(savedValue)
        ? deepMerge(defaultValue, savedValue)
        : defaultValue;
    } else if (Array.isArray(defaultValue) && !Array.isArray(savedValue)) {
      // Likewise: a list has to stay a list.
      out[key] = defaultValue;
    } else {
      out[key] = savedValue;
    }
  }
  return out as T;
}

/**
 * The generic seed, deep-merged with the local `/data/household.json`
 * override when one is present. This -- not the bare seed -- is the
 * foundation the app starts from and the thing saved overrides are measured
 * against, so real numbers on disk take priority over the placeholder
 * figures without needing to touch seed.ts.
 */
export function baseData(): HouseholdData {
  const seed = seedData();
  return LOCAL_HOUSEHOLD_DATA === undefined
    ? seed
    : deepMerge(seed, LOCAL_HOUSEHOLD_DATA);
}

/**
 * Diff `state` against `defaults`, keeping only the leaves that differ.
 *
 * This is what lets localStorage hold *overrides* instead of a full
 * snapshot: as long as a value matches the current base data (seed +
 * local override file), it is left out, so editing `/data/household.json`
 * keeps flowing into the app for every field the user never touched by hand.
 * Arrays are compared and kept whole, mirroring how deepMerge replaces them
 * wholesale rather than merging index by index.
 */
export function diffFromBase<T>(defaults: T, state: T): Partial<T> {
  if (Array.isArray(defaults) || Array.isArray(state)) {
    return (
      JSON.stringify(defaults) === JSON.stringify(state) ? undefined : state
    ) as Partial<T>;
  }
  if (!isPlainObject(defaults) || !isPlainObject(state)) {
    return (Object.is(defaults, state) ? undefined : state) as Partial<T>;
  }
  const out: Plain = {};
  const keys = new Set([...Object.keys(defaults), ...Object.keys(state)]);
  for (const key of keys) {
    const sub = diffFromBase((defaults as Plain)[key], (state as Plain)[key]);
    if (sub !== undefined) out[key] = sub;
  }
  // An object every one of whose keys matched the base is itself "no diff" --
  // without this, every unchanged nested object would bubble up as `{}` and
  // the override would never shrink back down to nothing.
  return (Object.keys(out).length > 0 ? out : undefined) as Partial<T>;
}

/**
 * Bring a saved payload up to the current shape.
 *
 * Version 1 held a single `savings.currentBalance` with one blended return.
 * Version 2 splits that into a cash buffer and an invested pot, so the old
 * balance is carried into cash and the old return into both pools.
 */
export function migrateSaved(saved: unknown): HouseholdData {
  const base = baseData();

  // The seed file has changed since this state was saved, so the file wins.
  // Without this, editing seed.ts would silently do nothing on any machine
  // that had already used the app -- which is exactly the bug this fixes.
  const savedVersion = isPlainObject(saved) ? saved.seedVersion : undefined;
  if (savedVersion !== SEED_VERSION) return base;

  const merged = deepMerge(base, saved);

  const legacy =
    isPlainObject(saved) && isPlainObject(saved.assumptions)
      ? (saved.assumptions.savings as Plain | undefined)
      : undefined;

  if (legacy && typeof legacy.currentBalance === "number") {
    merged.assumptions.savings.cashBalance = legacy.currentBalance;
    merged.assumptions.savings.investmentBalance = 0;
    if (typeof legacy.returnAnnual === "number") {
      merged.assumptions.savings.cashReturnAnnual = legacy.returnAnnual;
      merged.assumptions.savings.investmentReturnAnnual = legacy.returnAnnual;
    }
  }

  // Anything that must be an array, whatever the save said.
  if (!Array.isArray(merged.assumptions.obligations))
    merged.assumptions.obligations = [];
  if (!Array.isArray(merged.budget)) merged.budget = [];
  if (!Array.isArray(merged.balances)) merged.balances = [];
  if (!Array.isArray(merged.scenarios)) merged.scenarios = [];
  if (!Array.isArray(merged.settings.milestoneAges)) {
    merged.settings.milestoneAges = [...DEFAULT_MILESTONE_AGES];
  }
  if (!Array.isArray(merged.settings.shortlist)) merged.settings.shortlist = [];

  return merged;
}
