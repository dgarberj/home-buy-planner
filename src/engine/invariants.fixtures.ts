import { expect } from "vitest";
import type {
  Assumptions,
  MonthlyResult,
  ScenarioConfig,
} from "../model/types";
import { SEED_ASSUMPTIONS } from "../data/seed";

/**
 * ============================================================================
 *  Shared fixtures for the invariants suite (invariants.*.test.ts).
 * ============================================================================
 *
 * The hand-computed tests elsewhere check that specific numbers come out right.
 * The invariants tests check the model is internally coherent no matter what
 * you feed it, which is what catches the class of bug where two parts of the
 * engine quietly stop agreeing with each other.
 *
 * Every case below runs across a matrix of deliberately awkward inputs:
 * zero income, enormous contributions, negative cash, 100% down payments,
 * job losses that overlap the purchase, and so on.
 */

export const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);

/**
A spread of assumption sets designed to poke at the edges.
*/
export const CASES: { name: string; assumptions: Assumptions }[] = [
  { name: "seed defaults", assumptions: base },
  {
    name: "no growth anywhere",
    assumptions: {
      ...base,
      income: { ...base.income, growthAnnual: 0 },
      expenses: { ...base.expenses, inflationAnnual: 0 },
      retirement: { ...base.retirement, returnAnnual: 0 },
      savings: {
        ...base.savings,
        cashReturnAnnual: 0,
        investmentReturnAnnual: 0,
      },
      home: { ...base.home, appreciationAnnual: 0 },
    },
  },
  {
    name: "broke -- no cash, no investments",
    assumptions: {
      ...base,
      savings: { ...base.savings, cashBalance: 0, investmentBalance: 0 },
    },
  },
  {
    name: "contributions larger than income",
    assumptions: {
      ...base,
      // 2.4x of the default 100,000 gross salary runProjection falls back
      // to below == 20,000/mo, matching this case's old flat-dollar figure.
      retirement: { ...base.retirement, k401Pct: 2.4, hsaMonthly: 0 },
    },
  },
  {
    name: "no income at all",
    assumptions: {
      ...base,
      income: { ...base.income, monthlyTakeHome: 0, annualBonusNet: 0 },
    },
  },
  {
    name: "full cash purchase (100% down)",
    assumptions: {
      ...base,
      home: { ...base.home, downPaymentPct: 1, pmiAnnualPct: 0 },
    },
  },
  {
    name: "tiny deposit with expensive PMI",
    assumptions: {
      ...base,
      home: {
        ...base.home,
        downPaymentPct: 0.03,
        pmiAnnualPct: 0.02,
        pmiUpfrontPct: 0.0175,
      },
    },
  },
  {
    name: "zero-interest mortgage",
    assumptions: { ...base, home: { ...base.home, mortgageRateAnnual: 0 } },
  },
  {
    name: "huge employer lump, no match",
    assumptions: {
      ...base,
      retirement: {
        ...base.retirement,
        employerMatchMonthly: 0,
        employerAnnualLump: 40_000,
      },
    },
  },
  {
    name: "no emergency buffer at all",
    assumptions: { ...base, savings: { ...base.savings, cashBufferMonths: 0 } },
  },
  {
    name: "co-resident from day one, no premium",
    assumptions: {
      ...base,
      coResident: {
        ...base.coResident,
        requiresHomePurchase: false,
        homePricePremium: 0,
      },
    },
  },
  {
    name: "co-resident gated on the purchase, with a price premium",
    assumptions: {
      ...base,
      coResident: {
        ...base.coResident,
        enabled: true,
        monthlyAmount: 800,
        requiresHomePurchase: true,
        homePricePremium: 25_000,
      },
    },
  },
  {
    name: "severe permanent job loss",
    assumptions: {
      ...base,
      jobLoss: {
        startMonth: 2,
        durationMonths: 200,
        incomeReplacementPct: 0,
        expenseCutPct: 0,
        pauseRetirementContributions: true,
      },
    },
  },
  {
    name: "down-payment assistance -- forgiven",
    assumptions: {
      ...base,
      home: {
        ...base.home,
        assistanceEnabled: true,
        assistanceRepayment: "forgiven",
        assistancePctOfPrice: 0.05,
        assistanceMaxAmount: null,
        assistanceTermYears: 10,
      },
    },
  },
  {
    name: "down-payment assistance -- deferred",
    assumptions: {
      ...base,
      home: {
        ...base.home,
        assistanceEnabled: true,
        assistanceRepayment: "deferred",
        assistancePctOfPrice: 0.05,
        assistanceMaxAmount: null,
      },
    },
  },
  {
    name: "down-payment assistance -- amortised",
    assumptions: {
      ...base,
      home: {
        ...base.home,
        assistanceEnabled: true,
        assistanceRepayment: "amortised",
        assistancePctOfPrice: 0.05,
        assistanceMaxAmount: null,
        assistanceTermYears: 10,
      },
    },
  },
  {
    name: "down-payment assistance capped below the raw percentage",
    assumptions: {
      ...base,
      home: {
        ...base.home,
        assistanceEnabled: true,
        assistanceRepayment: "forgiven",
        assistancePctOfPrice: 0.05,
        assistanceMaxAmount: 2_000,
        assistanceTermYears: 10,
      },
    },
  },
  {
    name: "short mortgage term -- pays off inside the horizon",
    assumptions: {
      ...base,
      home: { ...base.home, mortgageTermYears: 3 },
    },
  },
  {
    name: "depreciating home",
    assumptions: {
      ...base,
      home: { ...base.home, appreciationAnnual: -0.05 },
    },
  },
];

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "rent",
    name: "Rent",
    buyMonth: null,
    hasJobLoss: false,
    enabled: true,
    color: "#000",
  },
  {
    id: "buy1",
    name: "Buy month 1",
    buyMonth: 1,
    hasJobLoss: false,
    enabled: true,
    color: "#000",
  },
  {
    id: "buy24",
    name: "Buy month 24",
    buyMonth: 24,
    hasJobLoss: false,
    enabled: true,
    color: "#000",
  },
  {
    id: "buyjl",
    name: "Buy + job loss",
    buyMonth: 18,
    hasJobLoss: true,
    enabled: true,
    color: "#000",
  },
];

export const HORIZON = 120;

/**
Run every assumption set against every scenario.
*/
export function forEachCase(
  function_: (a: Assumptions, s: ScenarioConfig, label: string) => void,
) {
  for (const c of CASES) {
    for (const s of SCENARIOS) {
      function_(c.assumptions, s, `${c.name} / ${s.name}`);
    }
  }
}

export function expectFiniteNumericFields(row: MonthlyResult, label: string) {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "number") continue;
    expect(
      Number.isFinite(value),
      `${label} month ${row.month} field ${key}`,
    ).toBe(true);
  }
}
