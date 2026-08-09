import { describe, expect, it } from "vitest";
import type { Assumptions, BalanceSnapshot, BudgetItem } from "../model/types";
import {
  DEFAULT_HORIZON_MONTHS,
  DEFAULT_MILESTONE_AGES,
  SEED_ASSUMPTIONS,
  SEED_BALANCES,
  SEED_BUDGET,
} from "../data/seed";
import {
  budgetSurplus,
  deriveBudgetTotals,
  deriveObligations,
  deriveStartingBalances,
  isObligation,
  monthIndexFor,
  resolveAssumptions,
} from "./derive";

const items: BudgetItem[] = [
  { id: "1", label: "Pay A", category: "Income", type: "income", amount: 5000 },
  { id: "2", label: "Pay B", category: "Income", type: "income", amount: 3000 },
  {
    id: "3",
    label: "Rent",
    category: "Housing",
    type: "fixed",
    amount: 2000,
    isRent: true,
  },
  { id: "4", label: "Car", category: "Transport", type: "fixed", amount: 400 },
  {
    id: "5",
    label: "Insurance",
    category: "Insurance",
    type: "fixed",
    amount: 200,
  },
  {
    id: "6",
    label: "Groceries",
    category: "Food",
    type: "variable",
    amount: 700,
  },
  {
    id: "7",
    label: "Fun",
    category: "Lifestyle",
    type: "variable",
    amount: 300,
  },
];

describe("deriveBudgetTotals", () => {
  it("adds each kind of line item into its own bucket", () => {
    const t = deriveBudgetTotals(items);
    expect(t.income).toBe(8000);
    expect(t.fixed).toBe(600);
    expect(t.variable).toBe(1000);
    expect(t.rent).toBe(2000);
  });

  it("keeps rent out of the fixed total so it can be swapped for a mortgage", () => {
    const t = deriveBudgetTotals(items);
    expect(t.fixed).toBe(600);
    expect(t.fixed + t.rent).toBe(2600);
  });

  it("treats a rent-flagged item as rent whatever its type says", () => {
    const odd: BudgetItem[] = [
      {
        id: "x",
        label: "Rent",
        category: "Housing",
        type: "variable",
        amount: 1500,
        isRent: true,
      },
    ];
    const t = deriveBudgetTotals(odd);
    expect(t.rent).toBe(1500);
    expect(t.variable).toBe(0);
  });

  it("returns zeroes for an empty budget", () => {
    expect(deriveBudgetTotals([])).toEqual({
      income: 0,
      fixed: 0,
      variable: 0,
      rent: 0,
    });
  });

  it("computes what is left over each month", () => {
    // 8000 - 600 - 1000 - 2000
    expect(budgetSurplus(deriveBudgetTotals(items))).toBe(4400);
  });

  it("reports a negative surplus when spending exceeds income", () => {
    const overspent = items.map((index) =>
      index.type === "income" ? { ...index, amount: 1000 } : index,
    );
    expect(budgetSurplus(deriveBudgetTotals(overspent))).toBeLessThan(0);
  });
});

describe("deriveStartingBalances", () => {
  const snaps: BalanceSnapshot[] = [
    {
      id: "a",
      date: "2026-01-01",
      checking: 1000,
      savings: 1000,
      investments: 1000,
      retirement: 1000,
      debt: 100,
    },
    {
      id: "c",
      date: "2026-07-01",
      checking: 5000,
      savings: 30000,
      investments: 9000,
      retirement: 90000,
      debt: 15000,
    },
    {
      id: "b",
      date: "2026-04-01",
      checking: 2000,
      savings: 2000,
      investments: 2000,
      retirement: 2000,
      debt: 200,
    },
  ];

  it("uses the newest snapshot regardless of array order", () => {
    const b = deriveStartingBalances(snaps);
    expect(b.asOf).toBe("2026-07-01");
    expect(b.retirement).toBe(90000);
    expect(b.debt).toBe(15000);
  });

  it("counts checking, savings and investments as available, split by pool", () => {
    const b = deriveStartingBalances(snaps);
    expect(b.cash).toBe(35000);
    expect(b.investments).toBe(9000);
    expect(b.liquid).toBe(44000);
  });

  it("handles having logged nothing yet", () => {
    expect(deriveStartingBalances([])).toEqual({
      cash: 0,
      investments: 0,
      liquid: 0,
      retirement: 0,
      debt: 0,
      asOf: null,
    });
  });

  it("does not reorder the caller’s array", () => {
    const order = snaps.map((s) => s.id);
    deriveStartingBalances(snaps);
    expect(snaps.map((s) => s.id)).toEqual(order);
  });
});

describe("deriveObligations", () => {
  const dated: BudgetItem[] = [
    {
      id: "a",
      label: "Obligation A",
      category: "Family",
      type: "fixed",
      amount: 1000,
      endsOn: "2030-09",
    },
    {
      id: "b",
      label: "Obligation B",
      category: "Family",
      type: "fixed",
      amount: 800,
      startsOn: "2030-10",
      endsOn: "2035-09",
    },
    {
      id: "c",
      label: "Groceries",
      category: "Food",
      type: "variable",
      amount: 700,
    },
  ];

  it("counts months from the projection start, with month 1 as the start itself", () => {
    expect(monthIndexFor("2026-08", "2026-08")).toBe(1);
    expect(monthIndexFor("2026-08", "2026-09")).toBe(2);
    expect(monthIndexFor("2026-08", "2027-08")).toBe(13);
    expect(monthIndexFor("2026-08", "2030-09")).toBe(50);
  });

  it("turns only the dated lines into obligations", () => {
    const out = deriveObligations(dated, "2026-08");
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("reads the start and end months off the dates", () => {
    const [both, one] = deriveObligations(dated, "2026-08");
    expect(both?.startMonth).toBe(1);
    expect(both?.endMonth).toBe(50);
    expect(one?.startMonth).toBe(51);
    expect(one?.endMonth).toBe(110);
  });

  it("runs to the horizon when no end date is given", () => {
    const open: BudgetItem[] = [
      {
        id: "x",
        label: "Obligation C",
        category: "Family",
        type: "fixed",
        amount: 500,
        startsOn: "2027-01",
      },
    ];
    expect(deriveObligations(open, "2026-08")[0]?.endMonth).toBeNull();
  });

  it("clamps a commitment that started before the projection did", () => {
    const past: BudgetItem[] = [
      {
        id: "x",
        label: "Obligation",
        category: "Family",
        type: "fixed",
        amount: 500,
        startsOn: "2020-01",
        endsOn: "2030-01",
      },
    ];
    expect(deriveObligations(past, "2026-08")[0]?.startMonth).toBe(1);
  });

  it("drops a commitment that ended before the projection did", () => {
    const over: BudgetItem[] = [
      {
        id: "x",
        label: "Old loan",
        category: "Debt",
        type: "fixed",
        amount: 500,
        endsOn: "2024-01",
      },
    ];
    expect(deriveObligations(over, "2026-08")).toHaveLength(0);
  });

  it("leaves no gap between one commitment ending and the next starting", () => {
    const [both, one] = deriveObligations(dated, "2026-08");
    expect(one!.startMonth).toBe(both!.endMonth! + 1);
  });
});

describe("resolveAssumptions", () => {
  const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);
  const balances: BalanceSnapshot[] = [
    {
      id: "a",
      date: "2026-07-01",
      checking: 5000,
      savings: 30000,
      investments: 9000,
      retirement: 90000,
      debt: 0,
    },
  ];

  it("leaves the typed-in assumptions alone when both toggles are off", () => {
    const r = resolveAssumptions(base, items, balances, {
      useBudgetTotals: false,
      useLatestBalances: false,
      startDate: "2026-08",
    });
    expect(r).toEqual(base);
  });

  it("overrides income, expenses and rent from the budget", () => {
    const r = resolveAssumptions(base, items, balances, {
      useBudgetTotals: true,
      useLatestBalances: false,
      startDate: "2026-08",
    });
    expect(r.income.monthlyTakeHome).toBe(8000);
    expect(r.expenses.fixedMonthly).toBe(600);
    expect(r.expenses.variableMonthly).toBe(1000);
    expect(r.expenses.currentRentMonthly).toBe(2000);
    // Rates are untouched -- only the totals come from the budget.
    expect(r.expenses.inflationAnnual).toBe(base.expenses.inflationAnnual);
    expect(r.savings.cashBalance).toBe(base.savings.cashBalance);
  });

  it("overrides starting balances from the newest snapshot", () => {
    const r = resolveAssumptions(base, items, balances, {
      useBudgetTotals: false,
      useLatestBalances: true,
      startDate: "2026-08",
    });
    // checking + savings become cash; brokerage stays invested.
    expect(r.savings.cashBalance).toBe(35000);
    expect(r.savings.investmentBalance).toBe(9000);
    expect(r.retirement.currentBalance).toBe(90000);
    expect(r.retirement.employeeMonthly).toBe(base.retirement.employeeMonthly);
  });

  it("falls back to the typed-in balances when nothing has been logged", () => {
    const r = resolveAssumptions(base, items, [], {
      useBudgetTotals: false,
      useLatestBalances: true,
      startDate: "2026-08",
    });
    expect(r.savings.cashBalance).toBe(base.savings.cashBalance);
    expect(r.savings.investmentBalance).toBe(base.savings.investmentBalance);
  });

  it("applies both sources together without clobbering each other", () => {
    const r = resolveAssumptions(base, items, balances, {
      useBudgetTotals: true,
      useLatestBalances: true,
      startDate: "2026-08",
    });
    expect(r.income.monthlyTakeHome).toBe(8000);
    expect(r.savings.cashBalance).toBe(35000);
    expect(r.savings.investmentBalance).toBe(9000);
  });

  it("does not mutate the assumptions it was given", () => {
    const snapshot = JSON.stringify(base);
    resolveAssumptions(base, items, balances, {
      useBudgetTotals: true,
      useLatestBalances: true,
      startDate: "2026-08",
    });
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe("the placeholder seed data is internally consistent", () => {
  // Guards against the example budget and the example assumption totals
  // drifting apart, which would make the app contradict itself out of the box.
  const totals = deriveBudgetTotals(SEED_BUDGET);

  it("has budget line items that add up to the seeded assumption totals", () => {
    expect(totals.income).toBe(SEED_ASSUMPTIONS.income.monthlyTakeHome);
    expect(totals.fixed).toBe(SEED_ASSUMPTIONS.expenses.fixedMonthly);
    expect(totals.variable).toBe(SEED_ASSUMPTIONS.expenses.variableMonthly);
    expect(totals.rent).toBe(SEED_ASSUMPTIONS.expenses.currentRentMonthly);
  });

  it("leaves a positive amount over each month before retirement", () => {
    expect(budgetSurplus(totals)).toBeGreaterThan(0);
  });

  const dueNow = deriveObligations(SEED_BUDGET, "2026-08")
    .filter((o) => o.startMonth <= 1)
    .reduce((sum, o) => sum + o.monthlyAmount, 0);
  const monthlyAfterContributions =
    budgetSurplus(totals) -
    dueNow -
    SEED_ASSUMPTIONS.retirement.employeeMonthly;

  it("has commitments due right now", () => {
    expect(dueNow).toBeGreaterThan(0);
  });

  it("runs a MONTHLY DEFICIT on regular pay alone", () => {
    // Not a bug in the data -- the actual situation, and the reason the bonus
    // is modelled as a lump rather than smeared. Eleven months a year the
    // contributions cost more than the paycheques leave over.
    expect(monthlyAfterContributions).toBeLessThan(0);
  });

  it("is covered across the year once the January bonus lands", () => {
    const annual =
      monthlyAfterContributions * 12 + SEED_ASSUMPTIONS.income.annualBonusNet;
    expect(annual).toBeGreaterThan(0);
  });

  it("keeps the bonus out of monthly take-home", () => {
    expect(SEED_ASSUMPTIONS.income.annualBonusNet).toBeGreaterThan(0);
    expect(totals.income).toBe(SEED_ASSUMPTIONS.income.monthlyTakeHome);
  });

  it("keeps dated commitments out of the ordinary expense totals", () => {
    // Otherwise support payments would be counted twice: once in fixed costs and
    // again as an obligation.
    const dated = SEED_BUDGET.filter(isObligation);
    expect(dated.length).toBeGreaterThan(0);
    const datedTotal = dated.reduce((sum, b) => sum + b.amount, 0);
    expect(totals.fixed).toBe(SEED_ASSUMPTIONS.expenses.fixedMonthly);
    expect(totals.fixed + datedTotal).toBeGreaterThan(totals.fixed);
  });

  it("matches the seeded obligations to the dated budget lines", () => {
    const derived = deriveObligations(SEED_BUDGET, "2026-08");
    expect(derived).toHaveLength(SEED_ASSUMPTIONS.obligations.length);
  });

  it("flags exactly one rent line", () => {
    expect(SEED_BUDGET.filter((b) => b.isRent)).toHaveLength(1);
  });

  it("gives every seeded line item a unique id", () => {
    expect(new Set(SEED_BUDGET.map((b) => b.id)).size).toBe(SEED_BUDGET.length);
  });

  it("starts the seeded balances from the newest snapshot", () => {
    expect(deriveStartingBalances(SEED_BALANCES).asOf).toBe("2026-08-01");
  });

  it("has seeded balances that match the seeded starting assumptions", () => {
    const b = deriveStartingBalances(SEED_BALANCES);
    expect(b.cash).toBe(SEED_ASSUMPTIONS.savings.cashBalance);
    expect(b.investments).toBe(SEED_ASSUMPTIONS.savings.investmentBalance);
    expect(b.retirement).toBe(SEED_ASSUMPTIONS.retirement.currentBalance);
  });

  it("projects far enough ahead to reach every default milestone age", () => {
    const oldestMilestone = Math.max(...DEFAULT_MILESTONE_AGES);
    const endAge =
      SEED_ASSUMPTIONS.household.primaryAge + (DEFAULT_HORIZON_MONTHS - 1) / 12;
    expect(endAge).toBeGreaterThanOrEqual(oldestMilestone);
  });
});
