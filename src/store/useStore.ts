import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Assumptions,
  BalanceSnapshot,
  BudgetItem,
  ScenarioConfig,
} from '../model/types';
import {
  PALETTE,
  migrateSaved,
  seedData,
  uid,
  type HouseholdData,
  type Settings,
} from './migrate';

export type { HouseholdData, Settings };

interface Actions {
  setAssumptions: (patch: DeepPartial<Assumptions>) => void;
  setSettings: (patch: Partial<Settings>) => void;

  addBudgetItem: (item?: Partial<BudgetItem>) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  removeBudgetItem: (id: string) => void;

  addBalance: (snapshot?: Partial<BalanceSnapshot>) => void;
  updateBalance: (id: string, patch: Partial<BalanceSnapshot>) => void;
  removeBalance: (id: string) => void;

  addScenario: () => void;
  updateScenario: (id: string, patch: Partial<ScenarioConfig>) => void;
  removeScenario: (id: string) => void;

  /** Replace everything (used by Import). Returns an error message on failure. */
  importData: (json: string) => string | null;
  exportData: () => string;
  resetToSeed: () => void;
}

export type Store = HouseholdData & Actions;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Shallow-merge a nested patch into the assumptions tree, one level deep. */
function mergeAssumptions(base: Assumptions, patch: DeepPartial<Assumptions>): Assumptions {
  const next = { ...base } as Assumptions;
  for (const key of Object.keys(patch) as (keyof Assumptions)[]) {
    const group = patch[key];
    if (group && typeof group === 'object') {
      next[key] = { ...base[key], ...group } as never;
    }
  }
  return next;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedData(),

      setAssumptions: (patch) =>
        set((s) => ({ assumptions: mergeAssumptions(s.assumptions, patch) })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addBudgetItem: (item) =>
        set((s) => ({
          budget: [
            ...s.budget,
            {
              id: uid(),
              label: 'New item',
              category: 'Other',
              type: 'variable',
              amount: 0,
              ...item,
            },
          ],
        })),

      updateBudgetItem: (id, patch) =>
        set((s) => ({
          budget: s.budget.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBudgetItem: (id) => set((s) => ({ budget: s.budget.filter((b) => b.id !== id) })),

      addBalance: (snapshot) =>
        set((s) => ({
          balances: [
            ...s.balances,
            {
              id: uid(),
              date: new Date().toISOString().slice(0, 10),
              checking: 0,
              savings: 0,
              investments: 0,
              retirement: 0,
              debt: 0,
              ...snapshot,
            },
          ],
        })),

      updateBalance: (id, patch) =>
        set((s) => ({
          balances: s.balances.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBalance: (id) => set((s) => ({ balances: s.balances.filter((b) => b.id !== id) })),

      addScenario: () =>
        set((s) => ({
          scenarios: [
            ...s.scenarios,
            {
              id: uid(),
              name: `Scenario ${s.scenarios.length + 1}`,
              buyMonth: 24,
              hasJobLoss: false,
              enabled: true,
              color: PALETTE[s.scenarios.length % PALETTE.length]!,
            },
          ],
        })),

      updateScenario: (id, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
        })),

      removeScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((s2) => s2.id !== id) })),

      exportData: () => {
        const { assumptions, budget, balances, scenarios, settings } = get();
        return JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), assumptions, budget, balances, scenarios, settings },
          null,
          2,
        );
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as Partial<HouseholdData>;
          if (!parsed.assumptions || !parsed.scenarios) {
            return 'That file is missing an "assumptions" or "scenarios" section.';
          }
          // Same migration path as a saved session, so an older exported file
          // still loads instead of blanking the app.
          set(migrateSaved(parsed));
          return null;
        } catch {
          return 'That file is not valid JSON.';
        }
      },

      resetToSeed: () => set(seedData()),
    }),
    {
      name: 'household-financial-health',
      // Bumped when the saved shape changes. See migrateSaved.
      version: 2,
      migrate: (saved) => migrateSaved(saved),
      // Belt and braces: even at the current version, fill in anything missing.
      merge: (saved, current) => ({ ...current, ...migrateSaved(saved) }),
      // Only the data is persisted; the action functions are not.
      partialize: (s) => ({
        seedVersion: s.seedVersion,
        assumptions: s.assumptions,
        budget: s.budget,
        balances: s.balances,
        scenarios: s.scenarios,
        settings: s.settings,
      }),
    },
  ),
);
