import { describe, expect, it } from "vitest";
import type { Assumptions, ScenarioConfig } from "../model/types";
import {
  cashRequiredToBuy,
  homePriceAtMonth,
  runProjection,
} from "./projection";
import { at, BUY_M12, FLAT, PI, RENT_FOREVER } from "./projection.test-helpers";

describe("runProjection -- baseline month with all rates at zero", () => {
  const rows = runProjection(FLAT, RENT_FOREVER, 60);

  it("produces one row per month, numbered from 1", () => {
    expect(rows).toHaveLength(60);
    expect(at(rows, 1).month).toBe(1);
    expect(at(rows, 60).month).toBe(60);
  });

  it("labels months 1-12 as year 1 and 13-24 as year 2", () => {
    expect(at(rows, 12).year).toBe(1);
    expect(at(rows, 13).year).toBe(2);
    expect(at(rows, 60).year).toBe(5);
  });

  it("month 1 is today: no growth has been applied yet", () => {
    const m1 = at(rows, 1);
    expect(m1.netIncome).toBe(10_000);
    expect(m1.totalExpenses).toBe(5_000);
    expect(m1.housingPayment).toBe(2_000);
    expect(m1.netCashFlow).toBe(2_000);
  });

  it("accumulates savings and retirement exactly as hand-computed", () => {
    expect(at(rows, 1).liquidSavings).toBeCloseTo(152_000, 6);
    expect(at(rows, 1).retirementBalance).toBeCloseTo(101_500, 6);
    expect(at(rows, 12).liquidSavings).toBeCloseTo(150_000 + 12 * 2_000, 6);
    expect(at(rows, 12).retirementBalance).toBeCloseTo(100_000 + 12 * 1_500, 6);
  });

  it("holds no home equity while renting", () => {
    expect(at(rows, 60).ownsHome).toBe(false);
    expect(at(rows, 60).homeEquity).toBe(0);
    expect(at(rows, 60).homeValue).toBe(0);
    expect(at(rows, 60).mortgageBalance).toBe(0);
  });

  it("nets worth to savings plus retirement while renting", () => {
    const m12 = at(rows, 12);
    expect(m12.netWorth).toBeCloseTo(
      m12.liquidSavings + m12.retirementBalance,
      6,
    );
    expect(m12.netWorth).toBeCloseTo(174_000 + 118_000, 6);
  });
});

describe("runProjection -- the buy-month transition", () => {
  const rows = runProjection(FLAT, BUY_M12, 60);

  it("still pays rent the month before buying", () => {
    const m11 = at(rows, 11);
    expect(m11.ownsHome).toBe(false);
    expect(m11.housingPayment).toBe(2_000);
    expect(m11.purchaseOutflow).toBe(0);
    expect(m11.liquidSavings).toBeCloseTo(150_000 + 11 * 2_000, 6);
  });

  it("switches from rent to full PITI in the buy month", () => {
    const m12 = at(rows, 12);
    expect(m12.ownsHome).toBe(true);
    // $1,918.56 principal & interest + $800 tax/insurance/HOA
    expect(m12.housingPayment).toBeCloseTo(PI + 800, 2);
  });

  it("takes down payment and closing costs out of cash exactly once", () => {
    // 20% of 400k = 80,000 down; 3% = 12,000 closing; 92,000 total
    expect(at(rows, 12).purchaseOutflow).toBeCloseTo(92_000, 6);
    expect(at(rows, 11).purchaseOutflow).toBe(0);
    expect(at(rows, 13).purchaseOutflow).toBe(0);
    const totalOutflow = rows.reduce((sum, r) => sum + r.purchaseOutflow, 0);
    expect(totalOutflow).toBeCloseTo(92_000, 6);
  });

  it("lands on the hand-computed cash balance in the buy month", () => {
    // 172,000 carried in + (10,000 - 5,000 - 2,718.56 - 1,000) - 92,000
    const m12 = at(rows, 12);
    expect(m12.netCashFlow).toBeCloseTo(10_000 - 5_000 - (PI + 800) - 1_000, 2);
    expect(m12.liquidSavings).toBeCloseTo(172_000 + 1_281.4393 - 92_000, 2);
  });

  it("opens the mortgage having already made the first payment", () => {
    const m12 = at(rows, 12);
    expect(m12.homeValue).toBeCloseTo(400_000, 6);
    // 320,000 * 1.005 - 1,918.56 = 319,681.44
    expect(m12.mortgageBalance).toBeCloseTo(319_681.44, 2);
    expect(m12.homeEquity).toBeCloseTo(400_000 - 319_681.44, 2);
  });

  it("adds up to the hand-computed net worth in the buy month", () => {
    // cash 81,281.44 + retirement 118,000 + equity 80,318.56 = 279,600
    expect(at(rows, 12).netWorth).toBeCloseTo(279_600, 2);
  });

  it("builds equity every month after the purchase", () => {
    for (let m = 13; m <= 60; m++) {
      expect(at(rows, m).homeEquity).toBeGreaterThan(
        at(rows, m - 1).homeEquity,
      );
    }
  });

  it("leaves months before the purchase identical to never buying", () => {
    const renting = runProjection(FLAT, RENT_FOREVER, 60);
    for (let m = 1; m <= 11; m++) {
      expect(at(rows, m).liquidSavings).toBeCloseTo(
        at(renting, m).liquidSavings,
        9,
      );
      expect(at(rows, m).netWorth).toBeCloseTo(at(renting, m).netWorth, 9);
    }
  });
});

describe("runProjection -- job loss", () => {
  const scenario: ScenarioConfig = {
    ...RENT_FOREVER,
    id: "jl",
    hasJobLoss: true,
  };
  const rows = runProjection(FLAT, scenario, 60);

  it("marks exactly the months in the window as disrupted", () => {
    // startMonth 13, duration 6 -> months 13,14,15,16,17,18
    expect(at(rows, 12).jobLossActive).toBe(false);
    for (let m = 13; m <= 18; m++) expect(at(rows, m).jobLossActive).toBe(true);
    expect(at(rows, 19).jobLossActive).toBe(false);
    expect(rows.filter((r) => r.jobLossActive)).toHaveLength(6);
  });

  it("cuts income to the replacement rate and expenses by the cut rate", () => {
    const m13 = at(rows, 13);
    expect(m13.netIncome).toBeCloseTo(10_000 * 0.4, 6);
    expect(m13.totalExpenses).toBeCloseTo(5_000 * 0.8, 6);
    expect(m13.housingPayment).toBe(2_000); // rent does not get cut
  });

  it("pauses both employee and employer retirement contributions", () => {
    // Retirement is frozen at its month-12 value for the whole window.
    expect(at(rows, 12).retirementBalance).toBeCloseTo(118_000, 6);
    for (let m = 13; m <= 18; m++) {
      expect(at(rows, m).retirementBalance).toBeCloseTo(118_000, 6);
    }
    expect(at(rows, 19).retirementBalance).toBeCloseTo(119_500, 6);
  });

  it("burns cash at the hand-computed rate during the gap", () => {
    // 4,000 in - 4,000 expenses - 2,000 rent - 0 contribution = -2,000 / month
    for (let m = 13; m <= 18; m++)
      expect(at(rows, m).netCashFlow).toBeCloseTo(-2_000, 6);
    expect(at(rows, 12).liquidSavings).toBeCloseTo(174_000, 6);
    expect(at(rows, 18).liquidSavings).toBeCloseTo(174_000 - 6 * 2_000, 6);
  });

  it("recovers to the normal +2,000 a month once the window closes", () => {
    expect(at(rows, 19).netCashFlow).toBeCloseTo(2_000, 6);
    expect(at(rows, 19).liquidSavings).toBeCloseTo(164_000, 6);
    expect(at(rows, 20).liquidSavings).toBeCloseTo(166_000, 6);
  });

  it("keeps paying full retirement contributions when the pause flag is off", () => {
    const noPause: Assumptions = {
      ...FLAT,
      jobLoss: { ...FLAT.jobLoss, pauseRetirementContributions: false },
    };
    const r = runProjection(noPause, scenario, 24);
    expect(at(r, 18).retirementBalance).toBeCloseTo(100_000 + 18 * 1_500, 6);
    // ...and that contribution still comes out of cash: 4,000-4,000-2,000-1,000
    expect(at(r, 18).netCashFlow).toBeCloseTo(-3_000, 6);
  });

  it("honours a per-scenario job-loss override", () => {
    const longer: ScenarioConfig = {
      ...scenario,
      jobLossOverride: { startMonth: 30, durationMonths: 3 },
    };
    const r = runProjection(FLAT, longer, 60);
    expect(at(r, 13).jobLossActive).toBe(false);
    expect(at(r, 30).jobLossActive).toBe(true);
    expect(at(r, 32).jobLossActive).toBe(true);
    expect(at(r, 33).jobLossActive).toBe(false);
  });

  it("applies nothing when a scenario opts out of the job loss", () => {
    const rentOnly = runProjection(FLAT, RENT_FOREVER, 60);
    expect(rentOnly.some((r) => r.jobLossActive)).toBe(false);
  });

  it("applies nothing when the duration is zero", () => {
    const zero: Assumptions = {
      ...FLAT,
      jobLoss: { ...FLAT.jobLoss, durationMonths: 0 },
    };
    expect(runProjection(zero, scenario, 60).some((r) => r.jobLossActive)).toBe(
      false,
    );
  });
});

describe("runProjection -- growth, inflation and returns", () => {
  it("grows income by exactly the annual rate over twelve months", () => {
    const a: Assumptions = {
      ...FLAT,
      income: { ...FLAT.income, growthAnnual: 0.03 },
    };
    const rows = runProjection(a, RENT_FOREVER, 60);
    expect(at(rows, 1).netIncome).toBeCloseTo(10_000, 9);
    expect(at(rows, 13).netIncome).toBeCloseTo(10_300, 6);
    expect(at(rows, 25).netIncome).toBeCloseTo(10_609, 6);
  });

  it("inflates expenses and rent together by exactly the annual rate", () => {
    const a: Assumptions = {
      ...FLAT,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.04 },
    };
    const rows = runProjection(a, RENT_FOREVER, 60);
    expect(at(rows, 13).totalExpenses).toBeCloseTo(5_200, 6);
    expect(at(rows, 13).housingPayment).toBeCloseTo(2_080, 6);
  });

  it("compounds savings and retirement returns monthly", () => {
    const a: Assumptions = {
      ...FLAT,
      savings: {
        ...FLAT.savings,
        cashBalance: 100_000,
        cashReturnAnnual: 0.12,
        investmentReturnAnnual: 0.12,
      },
      retirement: { ...FLAT.retirement, returnAnnual: 0.12 },
    };
    const rows = runProjection(a, RENT_FOREVER, 12);
    // 100,000 * (1.12)^(1/12) + 2,000 of cash flow
    expect(at(rows, 1).liquidSavings).toBeCloseTo(
      100_000 * Math.pow(1.12, 1 / 12) + 2_000,
      6,
    );
    // Return is earned on the OPENING balance, before this month's contribution.
    expect(at(rows, 2).liquidSavings).toBeCloseTo(
      at(rows, 1).liquidSavings * Math.pow(1.12, 1 / 12) + 2_000,
      6,
    );
  });

  it("holds the escrow portion of PITI flat in nominal terms", () => {
    const a: Assumptions = {
      ...FLAT,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.04 },
    };
    const rows = runProjection(a, BUY_M12, 60);
    const escrowAt = (m: number) =>
      at(rows, m).housingPayment - (at(rows, 12).housingPayment - 800);
    expect(escrowAt(60)).toBeCloseTo(800, 6);
  });
});

describe("home price, appreciation and the cost of waiting", () => {
  const appreciating: Assumptions = {
    ...FLAT,
    home: { ...FLAT.home, appreciationAnnual: 0.03 },
  };

  it("prices the target house at today’s price in month 1", () => {
    expect(homePriceAtMonth(appreciating, 1)).toBeCloseTo(400_000, 6);
  });

  it("appreciates the target house by exactly the annual rate each year", () => {
    expect(homePriceAtMonth(appreciating, 13)).toBeCloseTo(412_000, 6);
    expect(homePriceAtMonth(appreciating, 25)).toBeCloseTo(424_360, 6);
  });

  it("requires down payment plus closing costs on the appreciated price", () => {
    expect(cashRequiredToBuy(appreciating, 1)).toBeCloseTo(92_000, 6);
    expect(cashRequiredToBuy(appreciating, 13)).toBeCloseTo(412_000 * 0.23, 6);
  });

  it("makes buying later cost more up front and carry a bigger loan", () => {
    const early = runProjection(appreciating, { ...BUY_M12, buyMonth: 13 }, 60);
    const late = runProjection(appreciating, { ...BUY_M12, buyMonth: 25 }, 60);
    expect(at(late, 25).purchaseOutflow).toBeGreaterThan(
      at(early, 13).purchaseOutflow,
    );
    expect(at(late, 25).housingPayment).toBeGreaterThan(
      at(early, 13).housingPayment,
    );
    expect(at(late, 25).homeValue).toBeCloseTo(424_360, 6);
  });

  it("appreciates the owned home from its purchase price, not today’s price", () => {
    const rows = runProjection(appreciating, { ...BUY_M12, buyMonth: 13 }, 60);
    expect(at(rows, 13).homeValue).toBeCloseTo(412_000, 6);
    expect(at(rows, 25).homeValue).toBeCloseTo(412_000 * 1.03, 6);
  });
});

describe("negative cash is surfaced, not hidden", () => {
  it("lets liquid savings go below zero when the purchase is unaffordable", () => {
    const broke: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 20_000 },
    };
    const rows = runProjection(broke, BUY_M12, 60);
    // 20,000 + 11*2,000 = 42,000 carried in, then -92,000 for the house.
    expect(at(rows, 12).liquidSavings).toBeLessThan(0);
    expect(at(rows, 12).liquidSavings).toBeCloseTo(
      42_000 + 1_281.4393 - 92_000,
      2,
    );
  });
});
