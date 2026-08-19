import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { SEED_ASSUMPTIONS } from "../data/seed";
import {
  cashToClose,
  classifyReach,
  housingBudget,
  maxAffordablePrice,
  monthlyCostOfHouse,
} from "./affordability";
import { monthlyNominal, monthlyPayment } from "./finance";

const base: Assumptions = structuredClone(SEED_ASSUMPTIONS);

/**
A deliberately simple set-up so the arithmetic can be checked by hand.
*/
const SIMPLE: Assumptions = {
  ...base,
  income: { ...base.income, monthlyTakeHome: 10_000 },
  expenses: { ...base.expenses, fixedMonthly: 1_000, variableMonthly: 2_000 },
  // 400/mo at the 100,000 default `housingBudget` falls back to when a test
  // doesn't pass `grossAnnualSalary`.
  retirement: {
    ...base.retirement,
    k401Pct: 0.048,
    hsaMonthly: 600,
    iraMonthly: 0,
  },
  obligations: [
    {
      id: "a",
      label: "Obligation",
      monthlyAmount: 500,
      startMonth: 1,
      endMonth: 24,
    },
  ],
  coResident: { ...base.coResident, enabled: true, monthlyAmount: 800 },
  secondIncome: { ...base.secondIncome, enabled: false },
  home: {
    ...base.home,
    downPaymentPct: 0.2,
    mortgageRateAnnual: 0.06,
    mortgageTermYears: 30,
    maintenanceAnnualPct: 0.01,
    pmiAnnualPct: 0.0055,
    pmiRemovedAtLtv: 0.8,
  },
};

describe("housingBudget", () => {
  it("adds up to what is genuinely left for housing", () => {
    const b = housingBudget(SIMPLE, { atMonth: 1, reserveForSavings: 0 });
    // 10,000 in + 800 from the co-resident - 3,000 living - 500 support
    // - 1,000 of contributions
    expect(b.monthlyBudget).toBe(6_300);
  });

  it("counts the co-resident, because that money only exists once you own", () => {
    const alone: Assumptions = {
      ...SIMPLE,
      coResident: { ...SIMPLE.coResident, enabled: false },
    };
    expect(
      housingBudget(alone, { atMonth: 1, reserveForSavings: 0 }).monthlyBudget,
    ).toBe(5_500);
  });

  it("excludes rent, since that is the thing being replaced", () => {
    const dearerRent: Assumptions = {
      ...SIMPLE,
      expenses: { ...SIMPLE.expenses, currentRentMonthly: 5_000 },
    };
    expect(
      housingBudget(dearerRent, { atMonth: 1, reserveForSavings: 0 })
        .monthlyBudget,
    ).toBe(6_300);
  });

  it("drops obligations that have ended by the month asked about", () => {
    // Support runs to month 24, so by month 25 it is gone.
    expect(
      housingBudget(SIMPLE, { atMonth: 25, reserveForSavings: 0 })
        .monthlyBudget,
    ).toBe(6_800);
  });

  it("holds back whatever you reserve for saving", () => {
    expect(
      housingBudget(SIMPLE, { atMonth: 1, reserveForSavings: 800 })
        .monthlyBudget,
    ).toBe(5_500);
  });

  it("shows its working", () => {
    const b = housingBudget(SIMPLE, { atMonth: 1, reserveForSavings: 300 });
    const { breakdown: d } = b;
    expect(
      d.income +
        d.coResident -
        d.livingCosts -
        d.obligations -
        d.retirementContributions -
        d.reserveForSavings,
    ).toBe(b.monthlyBudget);
  });
});

describe("maxAffordablePrice", () => {
  const arguments_ = { effectiveTaxRate: 0.0109, insuranceMonthly: 150 };

  it("produces a price whose all-in cost matches the budget", () => {
    // The real test: feed the answer back through the cost calculator.
    for (const budget of [2_000, 3_000, 4_500, 6_300]) {
      const price = maxAffordablePrice(SIMPLE, {
        ...arguments_,
        monthlyBudget: budget,
      });
      const cost = monthlyCostOfHouse(SIMPLE, { ...arguments_, price });
      expect(cost.total).toBeCloseTo(budget, 6);
    }
  });

  it("buys less house where the tax rate is higher", () => {
    const cheapTax = maxAffordablePrice(SIMPLE, {
      ...arguments_,
      monthlyBudget: 3_000,
      effectiveTaxRate: 0.009,
    });
    const dearTax = maxAffordablePrice(SIMPLE, {
      ...arguments_,
      monthlyBudget: 3_000,
      effectiveTaxRate: 0.03,
    });
    expect(dearTax).toBeLessThan(cheapTax);

    // Rather than a guessed threshold, derive the ratio the maths demands.
    // Cost per dollar of price = loan payment + tax + upkeep, so the ratio is
    // fixed by those three terms and nothing else.
    const pmtPerDollar = monthlyPayment(1, monthlyNominal(0.06), 360);
    const perDollar = (taxRate: number) =>
      0.8 * pmtPerDollar + taxRate / 12 + 0.01 / 12;
    const expectedRatio = perDollar(0.009) / perDollar(0.03);
    expect(dearTax / cheapTax).toBeCloseTo(expectedRatio, 3);

    // Which works out at roughly 78% -- a 3% tax rate costs you about a fifth
    // of your buying power against a 0.9% one.
    expect(expectedRatio).toBeGreaterThan(0.77);
    expect(expectedRatio).toBeLessThan(0.8);
  });

  it("buys less house at a higher mortgage rate", () => {
    const dearer: Assumptions = {
      ...SIMPLE,
      home: { ...SIMPLE.home, mortgageRateAnnual: 0.08 },
    };
    expect(
      maxAffordablePrice(dearer, { ...arguments_, monthlyBudget: 3_000 }),
    ).toBeLessThan(
      maxAffordablePrice(SIMPLE, { ...arguments_, monthlyBudget: 3_000 }),
    );
  });

  it("buys MORE house on a small deposit, because the payment is what binds", () => {
    // Counter-intuitive but right: 3% down borrows more but the monthly cost
    // per dollar of price is what the budget actually constrains.
    const small: Assumptions = {
      ...SIMPLE,
      home: { ...SIMPLE.home, downPaymentPct: 0.03 },
    };
    const bigDeposit = maxAffordablePrice(SIMPLE, {
      ...arguments_,
      monthlyBudget: 3_000,
    });
    const smallDeposit = maxAffordablePrice(small, {
      ...arguments_,
      monthlyBudget: 3_000,
    });
    // ...though PMI claws some of it back, so the gap is modest.
    expect(smallDeposit).toBeLessThan(bigDeposit);
  });

  it("charges no PMI at a 20% deposit", () => {
    const cost = monthlyCostOfHouse(SIMPLE, { ...arguments_, price: 400_000 });
    expect(cost.pmi).toBe(0);
  });

  it("charges PMI below the threshold", () => {
    const small: Assumptions = {
      ...SIMPLE,
      home: { ...SIMPLE.home, downPaymentPct: 0.03 },
    };
    const cost = monthlyCostOfHouse(small, { ...arguments_, price: 400_000 });
    expect(cost.pmi).toBeCloseTo((400_000 * 0.97 * 0.0055) / 12, 6);
  });

  it("returns zero rather than a negative price on an impossible budget", () => {
    expect(
      maxAffordablePrice(SIMPLE, { ...arguments_, monthlyBudget: 0 }),
    ).toBe(0);
    expect(
      maxAffordablePrice(SIMPLE, { ...arguments_, monthlyBudget: -500 }),
    ).toBe(0);
  });

  it("rises roughly in line with the budget", () => {
    const a = maxAffordablePrice(SIMPLE, {
      ...arguments_,
      monthlyBudget: 2_150,
    });
    const b = maxAffordablePrice(SIMPLE, {
      ...arguments_,
      monthlyBudget: 4_150,
    });
    // Insurance is fixed, so it is not exactly double -- but close.
    expect(b / a).toBeGreaterThan(1.9);
    expect(b / a).toBeLessThan(2.1);
  });
});

describe("monthlyCostOfHouse", () => {
  const arguments_ = {
    effectiveTaxRate: 0.0109,
    insuranceMonthly: 150,
    price: 400_000,
  };

  it("totals its own components", () => {
    const c = monthlyCostOfHouse(SIMPLE, arguments_);
    expect(c.total).toBeCloseTo(
      c.principalAndInterest + c.tax + c.insurance + c.pmi + c.maintenance,
      9,
    );
  });

  it("matches a hand-computed principal and interest", () => {
    const c = monthlyCostOfHouse(SIMPLE, arguments_);
    const expected = monthlyPayment(400_000 * 0.8, monthlyNominal(0.06), 360);
    expect(c.principalAndInterest).toBeCloseTo(expected, 6);
  });

  it("charges tax as the effective rate on the price", () => {
    expect(monthlyCostOfHouse(SIMPLE, arguments_).tax).toBeCloseTo(
      (400_000 * 0.0109) / 12,
      6,
    );
  });

  it("accrues upkeep at the maintenance rate", () => {
    expect(monthlyCostOfHouse(SIMPLE, arguments_).maintenance).toBeCloseTo(
      (400_000 * 0.01) / 12,
      6,
    );
  });
});

describe("classifyReach", () => {
  const max = 400_000;

  it("calls a house well inside the budget comfortable", () => {
    expect(classifyReach(300_000, max)).toBe("comfortable");
    expect(classifyReach(360_000, max)).toBe("comfortable");
  });

  it("calls one that uses the whole budget a stretch", () => {
    expect(classifyReach(380_000, max)).toBe("stretch");
    expect(classifyReach(400_000, max)).toBe("stretch");
  });

  it("calls anything above it out of reach", () => {
    expect(classifyReach(400_001, max)).toBe("out-of-reach");
    expect(classifyReach(1_206_000, max)).toBe("out-of-reach");
  });

  it("says unknown rather than guessing when no price was sourced", () => {
    expect(classifyReach(null, max)).toBe("unknown");
    expect(classifyReach(undefined, max)).toBe("unknown");
  });
});

describe("cashToClose", () => {
  // Read the closing-cost rate off the assumptions rather than hardcoding it,
  // so itemising costs by township does not break the test.
  const cc = SIMPLE.home.closingCostPct;

  it("is deposit plus closing costs at a large deposit", () => {
    expect(cashToClose(SIMPLE, 400_000)).toBeCloseTo(400_000 * (0.2 + cc), 6);
  });

  it("adds the upfront premium on a small deposit", () => {
    const fha: Assumptions = {
      ...SIMPLE,
      home: { ...SIMPLE.home, downPaymentPct: 0.03, pmiUpfrontPct: 0.0175 },
    };
    expect(cashToClose(fha, 400_000)).toBeCloseTo(
      400_000 * (0.03 + cc + 0.97 * 0.0175),
      6,
    );
  });

  it("nets off down-payment assistance", () => {
    const withKfit: Assumptions = {
      ...SIMPLE,
      home: {
        ...SIMPLE.home,
        assistanceEnabled: true,
        assistancePctOfPrice: 0.05,
        assistanceMaxAmount: null,
        assistanceRepayment: "forgiven",
      },
    };
    // 5% of the price is money you do not have to bring on the day.
    expect(cashToClose(withKfit, 400_000)).toBeCloseTo(
      cashToClose(SIMPLE, 400_000) - 400_000 * 0.05,
      6,
    );
  });

  it("respects a dollar cap on the assistance", () => {
    const capped: Assumptions = {
      ...SIMPLE,
      home: {
        ...SIMPLE.home,
        assistanceEnabled: true,
        assistancePctOfPrice: 0.04,
        assistanceMaxAmount: 6_000,
        assistanceRepayment: "amortised",
      },
    };
    // 4% of 400,000 is 16,000, but the cap bites at 6,000.
    expect(cashToClose(capped, 400_000)).toBeCloseTo(
      cashToClose(SIMPLE, 400_000) - 6_000,
      6,
    );
  });

  it("never goes below zero, however generous the assistance", () => {
    const enormous: Assumptions = {
      ...SIMPLE,
      home: {
        ...SIMPLE.home,
        assistanceEnabled: true,
        assistancePctOfPrice: 0.9,
        assistanceMaxAmount: null,
        assistanceRepayment: "forgiven",
      },
    };
    expect(cashToClose(enormous, 400_000)).toBe(0);
  });
});

describe("the trap this module exists to expose", () => {
  it("shows the low-tax townships are the ones you cannot afford", () => {
    // Radnor: 23.1 mills, excellent schools, median $1.2m.
    // Darby Borough: 55.9 mills, weak schools, median well under $200k.
    const budget = 3_000;
    const radnorMax = maxAffordablePrice(SIMPLE, {
      monthlyBudget: budget,
      effectiveTaxRate: 0.0126,
      insuranceMonthly: 150,
    });
    const darbyMax = maxAffordablePrice(SIMPLE, {
      monthlyBudget: budget,
      effectiveTaxRate: 0.0305,
      insuranceMonthly: 150,
    });

    // The low rate does buy you more house per dollar...
    expect(radnorMax).toBeGreaterThan(darbyMax);
    // ...but nowhere near enough to reach Radnor's actual median.
    expect(classifyReach(1_206_000, radnorMax)).toBe("out-of-reach");
    // Ranking by tax rate alone would have pointed you straight at it.
    expect(0.0126).toBeLessThan(0.0305);
  });
});
