import { describe, expect, it } from "vitest";
import type { Assumptions, ScenarioConfig } from "../model/types";
import { monthlyPayment } from "./finance";
import {
  cashRequiredToBuy,
  homePriceAtMonth,
  monthForAge,
  runAllScenarios,
  runProjection,
  summarizeScenario,
} from "./projection";

/**
 * A deliberately boring fixture: every growth rate is ZERO so that each month
 * can be worked out on paper. Growth is then reintroduced one rate at a time in
 * the later blocks, which is what makes these assertions meaningful rather than
 * a re-implementation of the engine.
 *
 * Baseline monthly picture (no house, no job loss):
 *   income   10,000
 *   expenses  5,000  (3,000 fixed + 2,000 variable)
 *   rent      2,000
 *   401k      1,000 employee (out of cash) + 500 match (not out of cash)
 *   -> net cash flow = 10,000 - 5,000 - 2,000 - 1,000 = +2,000 / month
 */
const FLAT: Assumptions = {
  household: { primaryAge: 40, partnerAge: 40 },
  obligations: [],
  coResident: {
    enabled: false,
    label: "None",
    monthlyAmount: 0,
    requiresHomePurchase: true,
    homePricePremium: 0,
    growsWithInflation: true,
    endMonth: null,
  },
  secondIncome: {
    enabled: false,
    label: "Second income",
    monthlyTakeHome: 0,
    startMonth: 1,
    additionalCostsMonthly: 0,
    additionalCostsEndMonth: null,
    dependentCareFsaAnnual: 0,
    dependentCareFsaTaxRate: 0,
    growsWithIncome: true,
    affectedByJobLoss: false,
  },
  drawdown: {
    retirementAge: 65,
    withdrawalRate: 0.04,
    desiredMonthlySpendToday: 5_000,
    returnAnnual: 0.05,
    inflationAnnual: 0,
    includeHomeEquity: false,
    planToAge: 95,
  },
  income: {
    monthlyTakeHome: 10_000,
    growthAnnual: 0,
    annualBonusNet: 0,
    annualBonusMonth: 1,
    calendarStartMonth: 1,
  },
  expenses: {
    fixedMonthly: 3_000,
    variableMonthly: 2_000,
    inflationAnnual: 0,
    currentRentMonthly: 2_000,
  },
  retirement: {
    currentBalance: 100_000,
    k401Monthly: 400,
    hsaMonthly: 600,
    employerMatchMonthly: 500,
    employerAnnualLump: 0,
    employerAnnualLumpMonth: 1,
    returnAnnual: 0,
    hsaPayMedical: true,
    hsaTakeReimbursement: true,
    pauseHsaMax: false,
    hsaMedicalMonthly: 0,
    hsaReimbursement: 0,
    hsaReimbursementMonth: 1,
    hsaReimbursementAtPurchase: false,
    contributionsGrowWithIncome: false,
  },
  // Both pools earn nothing and the buffer is generous, so cash and
  // investments behave as one pot -- which keeps the arithmetic below doable
  // on paper. The split is exercised on its own further down.
  savings: {
    cashBalance: 150_000,
    investmentBalance: 0,
    cashReturnAnnual: 0,
    investmentReturnAnnual: 0,
    cashBufferMonths: 6,
  },
  home: {
    targetPrice: 400_000,
    downPaymentPct: 0.2,
    closingCostPct: 0.03,
    mortgageRateAnnual: 0.06,
    mortgageTermYears: 30,
    taxInsuranceHoaMonthly: 800,
    appreciationAnnual: 0,
    // Off in the baseline fixture so the arithmetic stays hand-checkable;
    // both are exercised in their own blocks below.
    maintenanceAnnualPct: 0,
    pmiAnnualPct: 0,
    pmiRemovedAtLtv: 0.8,
    pmiUpfrontPct: 0,
    assistanceEnabled: false,
    assistancePctOfPrice: 0,
    assistanceMaxAmount: null,
    assistanceRepayment: "none" as const,
    assistanceTermYears: 10,
  },
  jobLoss: {
    startMonth: 13,
    durationMonths: 6,
    incomeReplacementPct: 0.4,
    expenseCutPct: 0.2,
    pauseRetirementContributions: true,
  },
};

const RENT_FOREVER: ScenarioConfig = {
  id: "rent",
  name: "Keep renting",
  buyMonth: null,
  hasJobLoss: false,
  enabled: true,
  color: "#000",
};

const BUY_M12: ScenarioConfig = {
  ...RENT_FOREVER,
  id: "buy12",
  name: "Buy at 12",
  buyMonth: 12,
};

/**
1-based month lookup, so tests read the way the model is described.
*/
function at<T>(rows: T[], month: number): T {
  const row = rows[month - 1];
  if (!row) throw new Error(`no result for month ${month}`);
  return row;
}

// The hand-computed mortgage for this fixture: $320,000 at 6% over 30 years.
const PI = 1918.5607;

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

describe("the cash buffer and the investment sweep", () => {
  // FLAT holds 6 months of outgoings in cash: 6 * (5,000 + 2,000 rent) = 42,000.
  const TARGET = 6 * (5_000 + 2_000);

  it("sweeps everything above the buffer target into investments", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 60);
    // 150,000 opening + 2,000 cash flow, of which only 42,000 stays in cash.
    expect(at(rows, 1).cashBalance).toBeCloseTo(TARGET, 6);
    expect(at(rows, 1).investmentBalance).toBeCloseTo(152_000 - TARGET, 6);
    expect(at(rows, 1).liquidSavings).toBeCloseTo(152_000, 6);
  });

  it("pins cash at the target and sends every later surplus to investments", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 60);
    for (const m of [2, 11, 24, 60]) {
      expect(at(rows, m).cashBalance).toBeCloseTo(TARGET, 6);
    }
    expect(at(rows, 11).investmentBalance).toBeCloseTo(172_000 - TARGET, 6);
  });

  it("keeps everything in cash while the balance is under the target", () => {
    const lean: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 10_000 },
    };
    const rows = runProjection(lean, RENT_FOREVER, 60);
    expect(at(rows, 1).cashBalance).toBeCloseTo(12_000, 6);
    expect(at(rows, 1).investmentBalance).toBe(0);
  });

  it("sells investments rather than letting cash go negative", () => {
    const rows = runProjection(FLAT, BUY_M12, 60);
    // 42,000 cash + 1,281.44 flow - 92,000 for the house leaves cash short by
    // 48,718.56, which comes out of the 130,000 invested.
    expect(at(rows, 12).cashBalance).toBeCloseTo(0, 6);
    expect(at(rows, 12).investmentBalance).toBeCloseTo(81_281.44, 2);
    expect(at(rows, 12).liquidSavings).toBeCloseTo(81_281.44, 2);
  });

  it("lets cash go negative once there is nothing left to sell", () => {
    const broke: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 20_000 },
    };
    const rows = runProjection(broke, BUY_M12, 60);
    expect(at(rows, 12).investmentBalance).toBe(0);
    expect(at(rows, 12).cashBalance).toBeLessThan(0);
    expect(at(rows, 12).liquidSavings).toBeCloseTo(at(rows, 12).cashBalance, 9);
  });

  it("raises the buffer target when the mortgage replaces rent", () => {
    const rows = runProjection(FLAT, BUY_M12, 60);
    const owned = at(rows, 60);
    // Housing costs more once you own, so the emergency fund has to be bigger.
    const ownedTarget = 6 * (owned.totalExpenses + owned.housingPayment);
    expect(ownedTarget).toBeGreaterThan(TARGET);
    expect(owned.cashBalance).toBeCloseTo(ownedTarget, 6);
  });

  it("always reports liquid savings as the two pools added together", () => {
    const rows = runProjection(FLAT, BUY_M12, 60);
    for (const row of rows) {
      expect(row.liquidSavings).toBeCloseTo(
        row.cashBalance + row.investmentBalance,
        9,
      );
    }
  });

  it("ends up ahead when investments outperform cash", () => {
    const invested: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, investmentReturnAnnual: 0.07 },
    };
    const flat = runProjection(FLAT, RENT_FOREVER, 120);
    const grown = runProjection(invested, RENT_FOREVER, 120);
    expect(at(grown, 120).liquidSavings).toBeGreaterThan(
      at(flat, 120).liquidSavings,
    );
    // ...and the gain sits in the invested pool, not the buffer.
    expect(at(grown, 120).cashBalance).toBeCloseTo(
      at(flat, 120).cashBalance,
      6,
    );
  });
});

describe("retirement contributions over a long horizon", () => {
  const raising: Assumptions = {
    ...FLAT,
    income: {
      monthlyTakeHome: 10_000,
      growthAnnual: 0.03,
      annualBonusNet: 0,
      annualBonusMonth: 1,
      calendarStartMonth: 1,
    },
  };

  it("holds contributions flat when the flag is off", () => {
    const rows = runProjection(raising, RENT_FOREVER, 60);
    // Zero return, so each month's increase is exactly the contribution.
    expect(
      at(rows, 13).retirementBalance - at(rows, 12).retirementBalance,
    ).toBeCloseTo(1_500, 6);
    expect(
      at(rows, 60).retirementBalance - at(rows, 59).retirementBalance,
    ).toBeCloseTo(1_500, 6);
  });

  it("grows contributions in step with pay when the flag is on", () => {
    const a: Assumptions = {
      ...raising,
      retirement: { ...FLAT.retirement, contributionsGrowWithIncome: true },
    };
    const rows = runProjection(a, RENT_FOREVER, 60);
    // One year of 3% raises: 1,500 becomes 1,545.
    expect(
      at(rows, 13).retirementBalance - at(rows, 12).retirementBalance,
    ).toBeCloseTo(1_545, 6);
    // Two years: 1,500 * 1.03^2.
    expect(
      at(rows, 25).retirementBalance - at(rows, 24).retirementBalance,
    ).toBeCloseTo(1_500 * 1.03 * 1.03, 6);
  });

  it("still pauses growing contributions during a job loss", () => {
    const a: Assumptions = {
      ...raising,
      retirement: { ...FLAT.retirement, contributionsGrowWithIncome: true },
    };
    const rows = runProjection(a, { ...RENT_FOREVER, hasJobLoss: true }, 60);
    expect(at(rows, 14).retirementBalance).toBeCloseTo(
      at(rows, 13).retirementBalance,
      6,
    );
  });
});

describe("ages and retirement milestones", () => {
  it("reports the primary person’s age each month", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 60);
    expect(at(rows, 1).age).toBeCloseTo(40, 9);
    expect(at(rows, 13).age).toBeCloseTo(41, 9);
    expect(at(rows, 60).age).toBeCloseTo(40 + 59 / 12, 9);
  });

  it("maps a target age back to the month it is reached", () => {
    expect(monthForAge(FLAT, 41, 60)).toBe(13);
    expect(monthForAge(FLAT, 44, 60)).toBe(49);
  });

  it("returns null for ages outside the projection window", () => {
    expect(monthForAge(FLAT, 65, 60)).toBeNull();
    expect(monthForAge(FLAT, 30, 60)).toBeNull();
  });

  it("records net worth at each milestone age it reaches", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 60);
    const s = summarizeScenario(FLAT, RENT_FOREVER, 60, [41, 42, 65]);
    expect(s.netWorthAtAge[41]).toBeCloseTo(at(rows, 13).netWorth, 9);
    expect(s.netWorthAtAge[42]).toBeCloseTo(at(rows, 25).netWorth, 9);
    // 65 is decades past the end of this projection.
    expect(s.netWorthAtAge[65]).toBeUndefined();
  });

  it("breaks each milestone down by where the money sits", () => {
    const rows = runProjection(FLAT, BUY_M12, 60);
    const s = summarizeScenario(FLAT, BUY_M12, 60, [42]);
    expect(s.retirementAtAge[42]).toBeCloseTo(
      at(rows, 25).retirementBalance,
      9,
    );
    expect(s.homeEquityAtAge[42]).toBeCloseTo(at(rows, 25).homeEquity, 9);
    expect(s.investmentsAtAge[42]).toBeCloseTo(
      at(rows, 25).investmentBalance,
      9,
    );
  });

  it("records nothing when no milestone ages are asked for", () => {
    const s = summarizeScenario(FLAT, RENT_FOREVER, 60);
    expect(s.netWorthAtAge).toEqual({});
  });
});

describe("the mortgage over its full life", () => {
  // Long enough to outlive a 30-year loan taken out in month 12.
  const HORIZON = 480;

  it("clears the loan on the last scheduled payment", () => {
    const s = summarizeScenario(FLAT, BUY_M12, HORIZON);
    // 360 payments starting in month 12 -> the last one lands in month 371.
    expect(s.mortgagePaidOffMonth).toBe(371);
  });

  it("drops the payment to escrow only once the loan is repaid", () => {
    const rows = runProjection(FLAT, BUY_M12, HORIZON);
    expect(at(rows, 371).housingPayment).toBeCloseTo(PI + 800, 2);
    expect(at(rows, 372).housingPayment).toBeCloseTo(800, 6);
    expect(at(rows, 480).housingPayment).toBeCloseTo(800, 6);
  });

  it("totals interest to payments made minus principal borrowed", () => {
    const s = summarizeScenario(FLAT, BUY_M12, HORIZON);
    const payment = monthlyPayment(320_000, 0.005, 360);
    expect(s.totalInterestPaid).toBeCloseTo(payment * 360 - 320_000, 2);
  });

  it("leaves the owner holding the whole house once the loan is gone", () => {
    const rows = runProjection(FLAT, BUY_M12, HORIZON);
    expect(at(rows, 480).mortgageBalance).toBe(0);
    expect(at(rows, 480).homeEquity).toBeCloseTo(at(rows, 480).homeValue, 9);
  });

  it("totals every housing payment across the horizon", () => {
    const rows = runProjection(FLAT, BUY_M12, HORIZON);
    const s = summarizeScenario(FLAT, BUY_M12, HORIZON);
    const byHand = rows.reduce((sum, r) => sum + r.housingPayment, 0);
    expect(s.totalHousingPaid).toBeCloseTo(byHand, 6);
  });

  it("leaves a renter paying more and owning nothing, given enough time", () => {
    // Rent inflates; a mortgage payment does not. Over 40 years that inverts.
    const withInflation: Assumptions = {
      ...FLAT,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.03 },
    };
    const renter = summarizeScenario(withInflation, RENT_FOREVER, HORIZON);
    const owner = summarizeScenario(withInflation, BUY_M12, HORIZON);
    expect(renter.totalHousingPaid).toBeGreaterThan(owner.totalHousingPaid);
    expect(owner.endingNetWorth).toBeGreaterThan(renter.endingNetWorth);
  });
});

describe("home upkeep", () => {
  const UPKEEP = 0.01; // 1% of home value per year
  const withUpkeep: Assumptions = {
    ...FLAT,
    home: { ...FLAT.home, maintenanceAnnualPct: UPKEEP },
  };

  it("accrues nothing while renting", () => {
    const rows = runProjection(withUpkeep, RENT_FOREVER, 60);
    expect(rows.every((r) => r.homeMaintenance === 0)).toBe(true);
  });

  it("starts accruing the month you buy", () => {
    const rows = runProjection(withUpkeep, BUY_M12, 60);
    expect(at(rows, 11).homeMaintenance).toBe(0);
    // 1% of 400,000 is 4,000 a year, so 333.33 a month.
    expect(at(rows, 12).homeMaintenance).toBeCloseTo(
      (400_000 * UPKEEP) / 12,
      6,
    );
  });

  it("is kept out of the housing payment, because it is not a bill", () => {
    const rows = runProjection(withUpkeep, BUY_M12, 60);
    expect(at(rows, 12).housingPayment).toBeCloseTo(PI + 800, 2);
  });

  it("still comes out of cash flow", () => {
    const rows = runProjection(withUpkeep, BUY_M12, 60);
    const without = runProjection(FLAT, BUY_M12, 60);
    expect(at(rows, 12).netCashFlow).toBeCloseTo(
      at(without, 12).netCashFlow - (400_000 * UPKEEP) / 12,
      6,
    );
    expect(at(rows, 12).liquidSavings).toBeCloseTo(
      at(without, 12).liquidSavings - 333.3333,
      3,
    );
  });

  it("grows as the house appreciates", () => {
    const appreciating: Assumptions = {
      ...withUpkeep,
      home: { ...withUpkeep.home, appreciationAnnual: 0.03 },
    };
    const rows = runProjection(appreciating, { ...BUY_M12, buyMonth: 13 }, 60);
    expect(at(rows, 13).homeMaintenance).toBeCloseTo(
      (412_000 * UPKEEP) / 12,
      6,
    );
    expect(at(rows, 25).homeMaintenance).toBeCloseTo(
      (412_000 * 1.03 * UPKEEP) / 12,
      6,
    );
  });

  it("raises the emergency fund target for owners", () => {
    // Long enough for the buffer to actually refill after the down payment.
    const rows = runProjection(withUpkeep, BUY_M12, 240);
    const row = at(rows, 240);
    const target =
      6 * (row.totalExpenses + row.housingPayment + row.homeMaintenance);
    expect(row.cashBalance).toBeCloseTo(target, 6);
    // Upkeep makes the target bigger than it would be without it.
    const without = at(runProjection(FLAT, BUY_M12, 240), 240);
    expect(target).toBeGreaterThan(
      6 * (without.totalExpenses + without.housingPayment),
    );
  });

  it("slows the refill of the buffer after a purchase drains it", () => {
    // Cash is still climbing back towards the target five years in, so every
    // spare dollar is sitting in the buffer rather than being invested.
    const rows = runProjection(withUpkeep, BUY_M12, 60);
    const row = at(rows, 60);
    const target =
      6 * (row.totalExpenses + row.housingPayment + row.homeMaintenance);
    expect(row.cashBalance).toBeLessThan(target);
    // Nothing is swept into investments while the buffer is still short, so the
    // invested pot just sits at whatever survived the down payment.
    expect(row.investmentBalance).toBeCloseTo(
      at(rows, 13).investmentBalance,
      6,
    );
  });

  it("totals across the horizon", () => {
    const s = summarizeScenario(withUpkeep, BUY_M12, 60);
    const rows = runProjection(withUpkeep, BUY_M12, 60);
    expect(s.totalMaintenancePaid).toBeCloseTo(
      rows.reduce((sum, r) => sum + r.homeMaintenance, 0),
      6,
    );
    // 49 months of ownership at 333.33.
    expect(s.totalMaintenancePaid).toBeCloseTo(
      (49 * (400_000 * UPKEEP)) / 12,
      4,
    );
  });

  it("measurably weakens the case for buying", () => {
    // The whole reason to model it: leaving upkeep out flatters ownership.
    const withOut = summarizeScenario(FLAT, BUY_M12, 240);
    const withIn = summarizeScenario(withUpkeep, BUY_M12, 240);
    expect(withIn.endingNetWorth).toBeLessThan(withOut.endingNetWorth);
  });
});

describe("mortgage insurance", () => {
  const lowDown: Assumptions = {
    ...FLAT,
    home: { ...FLAT.home, downPaymentPct: 0.1, pmiAnnualPct: 0.006 },
  };
  // 10% down on 400,000 -> a 360,000 loan.
  const LOAN = 360_000;
  const PMI = (LOAN * 0.006) / 12; // 180 a month

  it("is charged when the down payment leaves the loan above the threshold", () => {
    const rows = runProjection(lowDown, BUY_M12, 60);
    // Opening loan-to-value is 90%, above the 80% cut-off.
    expect(at(rows, 12).pmiPayment).toBeCloseTo(PMI, 6);
  });

  it("is included in the housing payment rather than charged on top", () => {
    const rows = runProjection(lowDown, BUY_M12, 60);
    const pi = monthlyPayment(LOAN, 0.005, 360);
    expect(at(rows, 12).housingPayment).toBeCloseTo(pi + 800 + PMI, 4);
  });

  it("is never charged on a 20% down payment", () => {
    const rows = runProjection(
      { ...FLAT, home: { ...FLAT.home, pmiAnnualPct: 0.006 } },
      BUY_M12,
      60,
    );
    expect(rows.every((r) => r.pmiPayment === 0)).toBe(true);
    const s = summarizeScenario(
      { ...FLAT, home: { ...FLAT.home, pmiAnnualPct: 0.006 } },
      BUY_M12,
      60,
    );
    expect(s.totalPmiPaid).toBe(0);
    expect(s.pmiEndsMonth).toBeNull();
  });

  it("falls away exactly when the loan-to-value ratio clears the threshold", () => {
    const rows = runProjection(lowDown, BUY_M12, 480);
    const s = summarizeScenario(lowDown, BUY_M12, 480);
    expect(s.pmiEndsMonth).toBeGreaterThan(12);
    const endsAt = s.pmiEndsMonth!;
    // The month it stops, the ratio is at or under the cut-off...
    expect(
      at(rows, endsAt).mortgageBalance / at(rows, endsAt).homeValue,
    ).toBeLessThan(0.8 + 1e-9);
    // ...and the month before, it was still above it.
    expect(
      at(rows, endsAt - 1).mortgageBalance / at(rows, endsAt - 1).homeValue,
    ).toBeGreaterThan(0.8);
    expect(at(rows, endsAt).pmiPayment).toBe(0);
  });

  it("stops sooner when the house appreciates", () => {
    const appreciating: Assumptions = {
      ...lowDown,
      home: { ...lowDown.home, appreciationAnnual: 0.05 },
    };
    const flat = summarizeScenario(lowDown, BUY_M12, 480);
    const rising = summarizeScenario(appreciating, BUY_M12, 480);
    expect(rising.pmiEndsMonth!).toBeLessThan(flat.pmiEndsMonth!);
  });

  it("totals what was actually paid", () => {
    const s = summarizeScenario(lowDown, BUY_M12, 480);
    const months = s.pmiEndsMonth! - 12;
    expect(s.totalPmiPaid).toBeCloseTo(months * PMI, 4);
  });

  it("is gone for good once the loan is repaid", () => {
    const rows = runProjection(lowDown, BUY_M12, 480);
    expect(at(rows, 480).pmiPayment).toBe(0);
  });
});

describe("fixed obligations", () => {
  const withSupport: Assumptions = {
    ...FLAT,
    obligations: [
      {
        id: "o1",
        label: "Obligation A",
        monthlyAmount: 500,
        startMonth: 1,
        endMonth: 24,
      },
      {
        id: "o2",
        label: "Obligation B",
        monthlyAmount: 300,
        startMonth: 25,
        endMonth: 36,
      },
    ],
  };

  it("charges the right amount in each window", () => {
    const rows = runProjection(withSupport, RENT_FOREVER, 60);
    expect(at(rows, 1).obligations).toBe(500);
    expect(at(rows, 24).obligations).toBe(500);
    expect(at(rows, 25).obligations).toBe(300);
    expect(at(rows, 36).obligations).toBe(300);
    expect(at(rows, 37).obligations).toBe(0);
  });

  it("takes it straight out of cash flow", () => {
    const rows = runProjection(withSupport, RENT_FOREVER, 60);
    expect(at(rows, 1).netCashFlow).toBeCloseTo(2_000 - 500, 6);
    expect(at(rows, 25).netCashFlow).toBeCloseTo(2_000 - 300, 6);
  });

  it("steps cash flow up for good when an obligation ends", () => {
    const rows = runProjection(withSupport, RENT_FOREVER, 60);
    expect(at(rows, 37).netCashFlow).toBeCloseTo(2_000, 6);
    expect(at(rows, 60).netCashFlow).toBeCloseTo(2_000, 6);
  });

  it("does NOT inflate, unlike ordinary expenses", () => {
    const inflating: Assumptions = {
      ...withSupport,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.05 },
    };
    const rows = runProjection(inflating, RENT_FOREVER, 24);
    // Living costs have risen 5%; the support order has not moved.
    expect(at(rows, 13).totalExpenses).toBeCloseTo(5_250, 6);
    expect(at(rows, 13).obligations).toBe(500);
  });

  it("is NOT cut during a job loss, unlike ordinary expenses", () => {
    const rows = runProjection(
      withSupport,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    const m13 = at(rows, 13);
    // Living costs drop 20%; the court order does not care.
    expect(m13.totalExpenses).toBeCloseTo(4_000, 6);
    expect(m13.obligations).toBe(500);
    // 4,000 in - 4,000 living - 500 support - 2,000 rent - 0 contribution
    expect(m13.netCashFlow).toBeCloseTo(-2_500, 6);
  });

  it("makes a job loss meaningfully harder to survive", () => {
    const without = summarizeScenario(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    const withIt = summarizeScenario(
      withSupport,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(withIt.minCashBuffer).toBeLessThan(without.minCashBuffer);
  });

  it("counts towards the emergency fund target", () => {
    const rows = runProjection(withSupport, RENT_FOREVER, 24);
    const row = at(rows, 24);
    expect(row.cashBalance).toBeCloseTo(
      6 *
        (row.totalExpenses +
          row.obligations +
          row.housingPayment +
          row.homeMaintenance),
      6,
    );
  });

  it("pushes out the month the house becomes affordable", () => {
    const saving: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 50_000 },
    };
    const savingWithSupport: Assumptions = {
      ...saving,
      obligations: withSupport.obligations,
    };
    const a = summarizeScenario(saving, RENT_FOREVER, 120);
    const b = summarizeScenario(savingWithSupport, RENT_FOREVER, 120);
    expect(b.readinessMonth!).toBeGreaterThan(a.readinessMonth!);
  });

  it("runs to the horizon when no end month is given", () => {
    const openEnded: Assumptions = {
      ...FLAT,
      obligations: [
        {
          id: "o1",
          label: "Forever",
          monthlyAmount: 100,
          startMonth: 1,
          endMonth: null,
        },
      ],
    };
    const rows = runProjection(openEnded, RENT_FOREVER, 60);
    expect(rows.every((r) => r.obligations === 100)).toBe(true);
  });

  it("totals across the horizon", () => {
    const s = summarizeScenario(withSupport, RENT_FOREVER, 60);
    // 24 months at 500, then 12 at 300.
    expect(s.totalObligationsPaid).toBeCloseTo(24 * 500 + 12 * 300, 6);
  });
});

describe("a down payment below the threshold", () => {
  const lowDown: Assumptions = {
    ...FLAT,
    home: {
      ...FLAT.home,
      downPaymentPct: 0.1,
      pmiAnnualPct: 0.006,
      pmiUpfrontPct: 0.0175,
    },
  };

  it("adds the upfront premium to the cash needed at closing", () => {
    // 10% of 400,000 down + 3% closing + 1.75% of the 360,000 loan
    expect(cashRequiredToBuy(lowDown, 1)).toBeCloseTo(
      40_000 + 12_000 + 6_300,
      4,
    );
  });

  it("takes the upfront premium out on the day you buy", () => {
    const rows = runProjection(lowDown, BUY_M12, 60);
    expect(at(rows, 12).purchaseOutflow).toBeCloseTo(58_300, 4);
  });

  it("charges nothing upfront on a 20% down payment", () => {
    const bigDown: Assumptions = {
      ...FLAT,
      home: { ...FLAT.home, pmiUpfrontPct: 0.0175 },
    };
    expect(cashRequiredToBuy(bigDown, 1)).toBeCloseTo(92_000, 4);
    expect(
      at(runProjection(bigDown, BUY_M12, 60), 12).purchaseOutflow,
    ).toBeCloseTo(92_000, 4);
  });

  it("makes the house take longer to afford than the headline deposit suggests", () => {
    const saving = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 20_000 },
    };
    const cheapDeposit = summarizeScenario(
      { ...saving, home: lowDown.home },
      RENT_FOREVER,
      120,
    );
    // The deposit is smaller, but the premium and fees claw some of that back.
    expect(cheapDeposit.readinessCashRequired).toBeCloseTo(58_300, 4);
  });

  it("charges both the upfront premium and the monthly one", () => {
    const rows = runProjection(lowDown, BUY_M12, 60);
    expect(at(rows, 12).purchaseOutflow).toBeGreaterThan(0);
    expect(at(rows, 12).pmiPayment).toBeCloseTo((360_000 * 0.006) / 12, 6);
  });
});

describe("retirement contributions -- who puts in what, and when", () => {
  // FLAT: employee 1,000/mo, employer match 500/mo, no lump, 0% return.
  const withLump: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      employerAnnualLump: 3_000,
      employerAnnualLumpMonth: 1,
    },
  };

  it("separates your money from your employer’s", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 24);
    expect(at(rows, 2).employeeContribution).toBe(1_000);
    expect(at(rows, 2).employerContribution).toBe(500);
  });

  it("takes only YOUR contribution out of cash flow", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 12);
    // 10,000 in - 5,000 living - 2,000 rent - 1,000 your contribution.
    // The employer's 500 never touches take-home.
    expect(at(rows, 2).netCashFlow).toBeCloseTo(2_000, 6);
  });

  it("grows the balance by both contributions together", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 12);
    const growth =
      at(rows, 2).retirementBalance - at(rows, 1).retirementBalance;
    expect(growth).toBeCloseTo(1_500, 6);
  });

  it("lands the employer’s annual lump in one month only", () => {
    const rows = runProjection(withLump, RENT_FOREVER, 24);
    // Month 1 is January in this fixture.
    expect(at(rows, 1).employerContribution).toBe(3_500); // 500 match + 3,000 lump
    expect(at(rows, 2).employerContribution).toBe(500);
    expect(at(rows, 13).employerContribution).toBe(3_500);
    expect(rows.filter((r) => r.employerContribution > 500)).toHaveLength(2);
  });

  it("puts the lump in the right month when the projection starts mid-year", () => {
    const august: Assumptions = {
      ...withLump,
      income: { ...withLump.income, calendarStartMonth: 8 },
    };
    const rows = runProjection(august, RENT_FOREVER, 24);
    expect(at(rows, 6).employerContribution).toBe(3_500); // January
    expect(at(rows, 18).employerContribution).toBe(3_500);
    expect(at(rows, 1).employerContribution).toBe(500);
  });

  it("never lets the employer lump touch your cash flow", () => {
    const withOut = runProjection(FLAT, RENT_FOREVER, 24);
    const withIt = runProjection(withLump, RENT_FOREVER, 24);
    for (let m = 1; m <= 24; m++) {
      expect(at(withIt, m).netCashFlow).toBeCloseTo(
        at(withOut, m).netCashFlow,
        9,
      );
      expect(at(withIt, m).liquidSavings).toBeCloseTo(
        at(withOut, m).liquidSavings,
        9,
      );
    }
    // ...but it does grow retirement, by exactly two years of lumps.
    expect(
      at(withIt, 24).retirementBalance - at(withOut, 24).retirementBalance,
    ).toBeCloseTo(6_000, 6);
  });

  it("adds up to the right total over a year", () => {
    const rows = runProjection(withLump, RENT_FOREVER, 12);
    const employee = rows.reduce((sum, r) => sum + r.employeeContribution, 0);
    const employer = rows.reduce((sum, r) => sum + r.employerContribution, 0);
    expect(employee).toBeCloseTo(12_000, 6);
    expect(employer).toBeCloseTo(12 * 500 + 3_000, 6);
    // Zero return, so the balance moves by exactly what went in.
    expect(at(rows, 12).retirementBalance - 100_000).toBeCloseTo(
      employee + employer,
      6,
    );
  });

  it("pauses every stream during a job loss, lump included", () => {
    const januaryLoss: Assumptions = {
      ...withLump,
      jobLoss: { ...FLAT.jobLoss, startMonth: 12, durationMonths: 6 },
    };
    const rows = runProjection(
      januaryLoss,
      { ...RENT_FOREVER, hasJobLoss: true },
      24,
    );
    expect(at(rows, 13).jobLossActive).toBe(true);
    expect(at(rows, 13).employeeContribution).toBe(0);
    expect(at(rows, 13).employerContribution).toBe(0); // no profit share if you are gone
    expect(at(rows, 13).retirementBalance).toBeCloseTo(
      at(rows, 12).retirementBalance,
      6,
    );
  });

  it("keeps paying the lump when the pause flag is off", () => {
    const noPause: Assumptions = {
      ...withLump,
      jobLoss: {
        ...FLAT.jobLoss,
        startMonth: 12,
        durationMonths: 6,
        pauseRetirementContributions: false,
      },
    };
    const rows = runProjection(
      noPause,
      { ...RENT_FOREVER, hasJobLoss: true },
      24,
    );
    expect(at(rows, 13).employerContribution).toBe(3_500);
  });

  it("grows the lump with pay rises alongside everything else", () => {
    const raising: Assumptions = {
      ...withLump,
      income: { ...withLump.income, growthAnnual: 0.03 },
      retirement: { ...withLump.retirement, contributionsGrowWithIncome: true },
    };
    const rows = runProjection(raising, RENT_FOREVER, 24);
    expect(at(rows, 13).employerContribution).toBeCloseTo(3_500 * 1.03, 6);
  });

  it("holds the lump flat when contributions are set not to grow", () => {
    const rows = runProjection(withLump, RENT_FOREVER, 24);
    expect(at(rows, 13).employerContribution).toBe(3_500);
  });
});

describe("the household’s actual contribution stack", () => {
  // Guards the specific arithmetic that was wrong: the HSA family limit counts
  // employer and employee money TOGETHER, so an employer seed reduces your own
  // room rather than adding to it.
  const SALARY = 115_000;
  const HSA_FAMILY_LIMIT = 8_750;
  const EMPLOYER_HSA_SEED = 1_000;

  it("gives you only the HSA room the employer seed leaves behind", () => {
    const yourHsaRoom = HSA_FAMILY_LIMIT - EMPLOYER_HSA_SEED;
    expect(yourHsaRoom).toBe(7_750);
    // Contributing the full 8,750 yourself on top of the seed would be an
    // excess contribution, and penalised.
    expect(yourHsaRoom + EMPLOYER_HSA_SEED).toBe(HSA_FAMILY_LIMIT);
  });

  it("adds your 401(k) and HSA into one monthly figure", () => {
    const your401k = (SALARY * 0.06) / 12;
    const yourHsa = (HSA_FAMILY_LIMIT - EMPLOYER_HSA_SEED) / 12;
    expect(Math.round(your401k)).toBe(575);
    expect(Math.round(yourHsa)).toBe(646);
    expect(Math.round(your401k + yourHsa)).toBe(1_221);
  });

  it("keeps the employer match separate at 4.5% of salary", () => {
    expect(Math.round((SALARY * 0.045) / 12)).toBe(431);
  });

  it("adds the January employer lump from both plans", () => {
    const employer401kLump = SALARY * 0.015;
    expect(employer401kLump).toBe(1_725);
    expect(employer401kLump + EMPLOYER_HSA_SEED).toBe(2_725);
  });

  it("totals the year correctly across all four streams", () => {
    const yours = 1_221 * 12;
    const employer = 431 * 12 + 2_725;
    expect(yours).toBe(14_652);
    expect(employer).toBe(7_897);
    // Roughly 19.6% of salary going in altogether.
    expect((yours + employer) / SALARY).toBeGreaterThan(0.19);
    expect((yours + employer) / SALARY).toBeLessThan(0.2);
  });
});

describe("an annual bonus", () => {
  // FLAT starts in January, so month 1 is January and month 13 is the next one.
  const withBonus: Assumptions = {
    ...FLAT,
    income: { ...FLAT.income, annualBonusNet: 6_000, annualBonusMonth: 1 },
  };

  it("lands in one month a year, not spread across twelve", () => {
    const rows = runProjection(withBonus, RENT_FOREVER, 36);
    expect(at(rows, 1).bonusIncome).toBe(6_000);
    for (let m = 2; m <= 12; m++) expect(at(rows, m).bonusIncome).toBe(0);
    expect(at(rows, 13).bonusIncome).toBe(6_000);
    expect(at(rows, 25).bonusIncome).toBe(6_000);
    expect(rows.filter((r) => r.bonusIncome > 0)).toHaveLength(3);
  });

  it("lands in the right month when the projection starts mid-year", () => {
    // Start in August: January is then month 6, and again at month 18.
    const august: Assumptions = {
      ...withBonus,
      income: { ...withBonus.income, calendarStartMonth: 8 },
    };
    const rows = runProjection(august, RENT_FOREVER, 24);
    expect(at(rows, 6).bonusIncome).toBe(6_000);
    expect(at(rows, 18).bonusIncome).toBe(6_000);
    expect(at(rows, 1).bonusIncome).toBe(0);
    expect(at(rows, 7).bonusIncome).toBe(0);
  });

  it("adds to that month’s income on top of the regular paycheque", () => {
    const rows = runProjection(withBonus, RENT_FOREVER, 24);
    expect(at(rows, 1).netIncome).toBe(16_000); // 10,000 base + 6,000 bonus
    expect(at(rows, 2).netIncome).toBe(10_000);
  });

  it("leaves the other eleven months exactly as they were", () => {
    const withOut = runProjection(FLAT, RENT_FOREVER, 24);
    const withIt = runProjection(withBonus, RENT_FOREVER, 24);
    expect(at(withIt, 2).netCashFlow).toBeCloseTo(
      at(withOut, 2).netCashFlow,
      9,
    );
    expect(at(withIt, 12).netCashFlow).toBeCloseTo(
      at(withOut, 12).netCashFlow,
      9,
    );
  });

  it("shows up as a step in cash, then a return to the normal rate", () => {
    const rows = runProjection(withBonus, RENT_FOREVER, 24);
    const jump = at(rows, 13).liquidSavings - at(rows, 12).liquidSavings;
    const ordinary = at(rows, 14).liquidSavings - at(rows, 13).liquidSavings;
    expect(jump).toBeCloseTo(ordinary + 6_000, 6);
  });

  it("grows with pay rises like the rest of income", () => {
    const raising: Assumptions = {
      ...withBonus,
      income: { ...withBonus.income, growthAnnual: 0.03 },
    };
    const rows = runProjection(raising, RENT_FOREVER, 24);
    expect(at(rows, 13).bonusIncome).toBeCloseTo(6_000 * 1.03, 6);
  });

  it("is cut during a job loss -- you are not there to earn it", () => {
    const jobLossInJanuary: Assumptions = {
      ...withBonus,
      jobLoss: { ...FLAT.jobLoss, startMonth: 12, durationMonths: 6 },
    };
    const rows = runProjection(
      jobLossInJanuary,
      { ...RENT_FOREVER, hasJobLoss: true },
      24,
    );
    // Month 13 is a January and sits inside the window.
    expect(at(rows, 13).jobLossActive).toBe(true);
    expect(at(rows, 13).bonusIncome).toBeCloseTo(6_000 * 0.4, 6);
  });

  it("leaves cash thinner than the smeared version for the eleven dry months", () => {
    // This is the whole point of modelling it as a lump. Start in February so
    // the bonus is eleven months away rather than arriving immediately.
    const february: Assumptions = {
      ...withBonus,
      income: { ...withBonus.income, calendarStartMonth: 2 },
    };
    const spread: Assumptions = {
      ...FLAT,
      income: { ...FLAT.income, monthlyTakeHome: 10_500 }, // 6,000/yr smeared
    };
    const lumpy = runProjection(february, RENT_FOREVER, 24);
    const smooth = runProjection(spread, RENT_FOREVER, 24);
    for (let m = 1; m <= 11; m++) {
      expect(at(lumpy, m).liquidSavings).toBeLessThan(
        at(smooth, m).liquidSavings,
      );
    }
    // The bonus lands in month 12 and the gap closes.
    expect(at(lumpy, 12).bonusIncome).toBe(6_000);
    expect(at(lumpy, 12).liquidSavings).toBeGreaterThan(
      at(smooth, 11).liquidSavings,
    );
  });

  it("does nothing at all when set to zero", () => {
    const rows = runProjection(FLAT, RENT_FOREVER, 24);
    expect(rows.every((r) => r.bonusIncome === 0)).toBe(true);
  });
});

describe("a partner returning to work", () => {
  const returning: Assumptions = {
    ...FLAT,
    secondIncome: {
      enabled: true,
      label: "Partner",
      monthlyTakeHome: 1_000,
      startMonth: 12,
      additionalCostsMonthly: 1_200,
      additionalCostsEndMonth: 36,
      dependentCareFsaAnnual: 0,
      dependentCareFsaTaxRate: 0,
      growsWithIncome: false,
      affectedByJobLoss: false,
    },
  };

  it("brings in nothing before the start month", () => {
    const rows = runProjection(returning, RENT_FOREVER, 60);
    expect(at(rows, 11).secondIncome).toBe(0);
    expect(at(rows, 11).secondIncomeCosts).toBe(0);
    expect(at(rows, 11).netCashFlow).toBeCloseTo(2_000, 6);
  });

  it("starts on the month you choose", () => {
    const rows = runProjection(returning, RENT_FOREVER, 60);
    expect(at(rows, 12).secondIncome).toBe(1_000);
    expect(at(rows, 12).secondIncomeCosts).toBe(1_200);
  });

  it("is NET NEGATIVE while childcare is running", () => {
    // The point of modelling the costs at all. 1,000 in, 1,200 out.
    const rows = runProjection(returning, RENT_FOREVER, 60);
    expect(at(rows, 12).netCashFlow).toBeCloseTo(2_000 - 200, 6);
    expect(at(rows, 12).netCashFlow).toBeLessThan(at(rows, 11).netCashFlow);
  });

  it("turns strongly positive the month childcare ends", () => {
    const rows = runProjection(returning, RENT_FOREVER, 60);
    expect(at(rows, 36).secondIncomeCosts).toBe(1_200);
    expect(at(rows, 37).secondIncomeCosts).toBe(0);
    expect(at(rows, 37).secondIncome).toBe(1_000);
    // A $1,400 swing in one month: the cost stops, the income does not.
    expect(at(rows, 37).netCashFlow - at(rows, 36).netCashFlow).toBeCloseTo(
      1_200,
      6,
    );
    expect(at(rows, 37).netCashFlow).toBeCloseTo(3_000, 6);
  });

  it("keeps paying when the other earner loses their job", () => {
    // The reason a second earner is the best hedge in this model.
    const rows = runProjection(
      returning,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(at(rows, 13).jobLossActive).toBe(true);
    expect(at(rows, 13).netIncome).toBeCloseTo(10_000 * 0.4, 6); // main salary cut
    expect(at(rows, 13).secondIncome).toBe(1_000); // this is not
  });

  it("is cut too when told it shares the same risk", () => {
    const sameEmployer: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, affectedByJobLoss: true },
    };
    const rows = runProjection(
      sameEmployer,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(at(rows, 13).secondIncome).toBeCloseTo(1_000 * 0.4, 6);
  });

  it("does NOT hedge a job loss while childcare is still being paid", () => {
    // I assumed a second wage was straightforwardly protective. It is not,
    // while the childcare bill exceeds the wage: during the gap you are still
    // paying $1,200 to earn $1,000, so cash drains $200/month FASTER than if
    // she had not gone back.
    const running: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, startMonth: 1 },
    };
    const without = runProjection(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    const withIt = runProjection(
      running,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(
      at(withIt, 13).netCashFlow - at(without, 13).netCashFlow,
    ).toBeCloseTo(-200, 6);

    // Worth saying plainly: in a real job loss you would probably drop the
    // childcare, since the out-of-work parent is home. The model does not
    // assume that, because it is a decision rather than an arithmetic fact.
  });

  it("DOES hedge a job loss once childcare is behind you", () => {
    // Same wage, no childcare: now it is the strongest protection in the model,
    // because it is a different employer and takes no haircut at all.
    const afterCare: Assumptions = {
      ...returning,
      secondIncome: {
        ...returning.secondIncome,
        startMonth: 1,
        additionalCostsMonthly: 0,
      },
    };
    const without = runProjection(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    const withIt = runProjection(
      afterCare,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    for (let m = 13; m <= 18; m++) {
      expect(
        at(withIt, m).netCashFlow - at(without, m).netCashFlow,
      ).toBeCloseTo(1_000, 6);
    }
    const a = summarizeScenario(
      afterCare,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    const b = summarizeScenario(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(a.minCashBuffer).toBeGreaterThan(b.minCashBuffer);
  });

  it("grows with pay rises when told to", () => {
    const raising: Assumptions = {
      ...returning,
      income: { ...FLAT.income, growthAnnual: 0.03 },
      secondIncome: { ...returning.secondIncome, growsWithIncome: true },
    };
    const rows = runProjection(raising, RENT_FOREVER, 60);
    expect(at(rows, 24).secondIncome).toBeCloseTo(
      1_000 * Math.pow(1.03, 23 / 12),
      6,
    );
  });

  it("inflates the childcare bill like any other cost", () => {
    const inflating: Assumptions = {
      ...returning,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.05 },
    };
    const rows = runProjection(inflating, RENT_FOREVER, 60);
    expect(at(rows, 24).secondIncomeCosts).toBeCloseTo(
      1_200 * Math.pow(1.05, 23 / 12),
      6,
    );
  });

  it("runs the costs to the horizon when no end month is set", () => {
    const openEnded: Assumptions = {
      ...returning,
      secondIncome: {
        ...returning.secondIncome,
        additionalCostsEndMonth: null,
      },
    };
    const rows = runProjection(openEnded, RENT_FOREVER, 60);
    expect(at(rows, 60).secondIncomeCosts).toBeGreaterThan(0);
  });

  it("counts the childcare bill towards the emergency fund target", () => {
    const rows = runProjection(returning, RENT_FOREVER, 30);
    const row = at(rows, 30);
    expect(row.cashBalance).toBeCloseTo(
      6 *
        (row.totalExpenses +
          row.obligations +
          row.housingPayment +
          row.homeMaintenance +
          row.secondIncomeCosts),
      6,
    );
  });

  it("totals both sides across the horizon", () => {
    const s = summarizeScenario(returning, RENT_FOREVER, 60);
    // Income months 12-60 = 49; costs months 12-36 = 25.
    expect(s.totalSecondIncome).toBeCloseTo(49 * 1_000, 6);
    expect(s.totalSecondIncomeCosts).toBeCloseTo(25 * 1_200, 6);
  });

  it("leaves everything untouched when switched off", () => {
    const off: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, enabled: false },
    };
    const a = runProjection(off, RENT_FOREVER, 60);
    const b = runProjection(FLAT, RENT_FOREVER, 60);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is WORSE the sooner it starts, when childcare ends on a fixed date", () => {
    // Counter-intuitive and worth knowing. Childcare stops at school age
    // whatever you do, so returning earlier only buys more months of the
    // net-negative stretch. Purely financially, later is better here.
    const earlier: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, startMonth: 1 },
    };
    const a = summarizeScenario(earlier, RENT_FOREVER, 120);
    const b = summarizeScenario(returning, RENT_FOREVER, 120);
    expect(a.endingNetWorth).toBeLessThan(b.endingNetWorth);
    // Eleven extra months at -200 a month, plus the compounding forgone.
    expect(b.endingNetWorth - a.endingNetWorth).toBeGreaterThan(2_000);
  });

  it("is unambiguously good once it starts after childcare ends", () => {
    const afterSchool: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, startMonth: 40 },
    };
    const a = summarizeScenario(afterSchool, RENT_FOREVER, 120);
    const b = summarizeScenario(FLAT, RENT_FOREVER, 120);
    expect(a.endingNetWorth).toBeGreaterThan(b.endingNetWorth);
    // No childcare overlap at all, so every dollar lands on the bottom line.
    const rows = runProjection(afterSchool, RENT_FOREVER, 120);
    expect(at(rows, 40).secondIncomeCosts).toBe(0);
    expect(at(rows, 40).netCashFlow).toBeCloseTo(3_000, 6);
  });

  it("is worth more the cheaper the childcare", () => {
    const cheapCare: Assumptions = {
      ...returning,
      secondIncome: { ...returning.secondIncome, additionalCostsMonthly: 400 },
    };
    const a = summarizeScenario(cheapCare, RENT_FOREVER, 120);
    const b = summarizeScenario(returning, RENT_FOREVER, 120);
    expect(a.endingNetWorth).toBeGreaterThan(b.endingNetWorth);
  });
});

describe("a Dependent Care FSA", () => {
  const withFsa: Assumptions = {
    ...FLAT,
    secondIncome: {
      enabled: true,
      label: "Partner",
      monthlyTakeHome: 2_650,
      startMonth: 1,
      additionalCostsMonthly: 1_400,
      additionalCostsEndMonth: 36,
      dependentCareFsaAnnual: 7_500,
      dependentCareFsaTaxRate: 0.3372,
      growsWithIncome: false,
      affectedByJobLoss: false,
    },
  };

  it("saves the marginal rate on childcare paid through it", () => {
    const rows = runProjection(withFsa, RENT_FOREVER, 60);
    // $7,500/yr = $625/mo of the $1,400 bill goes through pre-tax.
    expect(at(rows, 1).dependentCareTaxSaving).toBeCloseTo(625 * 0.3372, 6);
  });

  it("reduces the reported cost of childcare by exactly that saving", () => {
    const rows = runProjection(withFsa, RENT_FOREVER, 60);
    expect(at(rows, 1).secondIncomeCosts).toBeCloseTo(1_400 - 625 * 0.3372, 6);
  });

  it("is capped by the election, not by the childcare bill", () => {
    const bigBill: Assumptions = {
      ...withFsa,
      secondIncome: { ...withFsa.secondIncome, additionalCostsMonthly: 3_000 },
    };
    const rows = runProjection(bigBill, RENT_FOREVER, 12);
    // Still only $625/mo goes through the FSA, however large the bill.
    expect(at(rows, 1).dependentCareTaxSaving).toBeCloseTo(625 * 0.3372, 6);
  });

  it("is capped by the childcare bill, not by the election", () => {
    const smallBill: Assumptions = {
      ...withFsa,
      secondIncome: { ...withFsa.secondIncome, additionalCostsMonthly: 300 },
    };
    const rows = runProjection(smallBill, RENT_FOREVER, 12);
    expect(at(rows, 1).dependentCareTaxSaving).toBeCloseTo(300 * 0.3372, 6);
  });

  it("stops when the childcare does", () => {
    const rows = runProjection(withFsa, RENT_FOREVER, 60);
    expect(at(rows, 36).dependentCareTaxSaving).toBeGreaterThan(0);
    expect(at(rows, 37).dependentCareTaxSaving).toBe(0);
    expect(at(rows, 37).secondIncomeCosts).toBe(0);
  });

  it("is worth real money over the childcare years", () => {
    const without: Assumptions = {
      ...withFsa,
      secondIncome: { ...withFsa.secondIncome, dependentCareFsaAnnual: 0 },
    };
    const a = summarizeScenario(withFsa, RENT_FOREVER, 60);
    const b = summarizeScenario(without, RENT_FOREVER, 60);
    // 36 months at $210.75 saved.
    expect(a.endingNetWorth - b.endingNetWorth).toBeGreaterThan(7_000);
  });
});

describe("drawing on the HSA rather than hoarding it", () => {
  const spendIt: Assumptions = {
    ...FLAT,
    retirement: { ...FLAT.retirement, hsaMedicalMonthly: 300 },
  };
  const reimburse: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      hsaReimbursement: 3_000,
      hsaReimbursementMonth: 1,
    },
  };

  it("turns monthly medical spending into cash flow", () => {
    const rows = runProjection(spendIt, RENT_FOREVER, 24);
    expect(at(rows, 1).hsaMedicalPaid).toBe(300);
    expect(at(rows, 1).netCashFlow).toBeCloseTo(2_000 + 300, 6);
  });

  it("takes it straight out of the retirement balance", () => {
    const rows = runProjection(spendIt, RENT_FOREVER, 24);
    const plain = runProjection(FLAT, RENT_FOREVER, 24);
    expect(at(rows, 1).retirementBalance).toBeCloseTo(
      at(plain, 1).retirementBalance - 300,
      6,
    );
  });

  it("lands the reimbursement at closing when tied to the purchase", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const rows = runProjection(atPurchase, BUY_M12, 24);
    expect(at(rows, 12).hsaReimbursed).toBe(6_000);
    expect(at(rows, 1).hsaReimbursed).toBe(0);
    expect(rows.filter((r) => r.hsaReimbursed > 0)).toHaveLength(1);
  });

  it("follows the buy month as the scenario changes", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const later = runProjection(atPurchase, { ...BUY_M12, buyMonth: 30 }, 40);
    expect(at(later, 30).hsaReimbursed).toBe(6_000);
    expect(at(later, 12).hsaReimbursed).toBe(0);
  });

  it("never takes the reimbursement in a scenario that never buys", () => {
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const renting = runProjection(atPurchase, RENT_FOREVER, 60);
    expect(renting.every((r) => r.hsaReimbursed === 0)).toBe(true);
  });

  it("arrives in time to help with the cash needed at closing", () => {
    // The whole point of timing it to the purchase.
    const atPurchase: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        hsaReimbursement: 6_000,
        hsaReimbursementAtPurchase: true,
      },
    };
    const withIt = runProjection(atPurchase, BUY_M12, 24);
    const without = runProjection(FLAT, BUY_M12, 24);
    expect(
      at(withIt, 12).liquidSavings - at(without, 12).liquidSavings,
    ).toBeCloseTo(6_000, 6);
  });

  it("lands a one-off reimbursement in the month you choose", () => {
    const rows = runProjection(reimburse, RENT_FOREVER, 24);
    expect(at(rows, 1).hsaReimbursed).toBe(3_000);
    expect(at(rows, 2).hsaReimbursed).toBe(0);
    expect(at(rows, 1).liquidSavings).toBeCloseTo(
      at(runProjection(FLAT, RENT_FOREVER, 24), 1).liquidSavings + 3_000,
      6,
    );
  });

  it("is a straight transfer -- net worth is unchanged the month it happens", () => {
    // The money moves from one pocket to another. Only the compounding differs.
    const rows = runProjection(reimburse, RENT_FOREVER, 1);
    const plain = runProjection(FLAT, RENT_FOREVER, 1);
    expect(at(rows, 1).netWorth).toBeCloseTo(at(plain, 1).netWorth, 6);
  });

  it("costs long-run growth, because the HSA compounds faster than cash", () => {
    const growing: Assumptions = {
      ...reimburse,
      retirement: { ...reimburse.retirement, returnAnnual: 0.07 },
      savings: {
        ...FLAT.savings,
        cashReturnAnnual: 0.04,
        investmentReturnAnnual: 0.04,
      },
    };
    const kept: Assumptions = {
      ...growing,
      retirement: { ...growing.retirement, hsaReimbursement: 0 },
    };
    const a = summarizeScenario(growing, RENT_FOREVER, 240);
    const b = summarizeScenario(kept, RENT_FOREVER, 240);
    expect(a.endingNetWorth).toBeLessThan(b.endingNetWorth);
  });

  it("never draws more than the HSA actually holds", () => {
    const overdrawn: Assumptions = {
      ...FLAT,
      retirement: {
        ...FLAT.retirement,
        currentBalance: 500,
        hsaReimbursement: 50_000,
      },
    };
    const rows = runProjection(overdrawn, RENT_FOREVER, 12);
    expect(at(rows, 1).retirementBalance).toBeGreaterThanOrEqual(0);
    expect(at(rows, 1).hsaReimbursed).toBeLessThan(50_000);
  });

  it("does nothing at all when both are left at zero", () => {
    const a = runProjection(FLAT, RENT_FOREVER, 24);
    for (const row of a) {
      expect(row.hsaMedicalPaid).toBe(0);
      expect(row.hsaReimbursed).toBe(0);
    }
  });
});

describe("the HSA levers switch cleanly on and off", () => {
  const drawing: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      hsaMedicalMonthly: 300,
      hsaReimbursement: 6_000,
      hsaReimbursementAtPurchase: true,
    },
  };

  it("pays no medical from the HSA when the toggle is off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaPayMedical: false },
    };
    const rows = runProjection(off, BUY_M12, 24);
    expect(rows.every((r) => r.hsaMedicalPaid === 0)).toBe(true);
  });

  it("takes no reimbursement when that toggle is off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaTakeReimbursement: false },
    };
    const rows = runProjection(off, BUY_M12, 24);
    expect(rows.every((r) => r.hsaReimbursed === 0)).toBe(true);
  });

  it("switches each independently of the other", () => {
    const medicalOnly: Assumptions = {
      ...drawing,
      retirement: { ...drawing.retirement, hsaTakeReimbursement: false },
    };
    const rows = runProjection(medicalOnly, BUY_M12, 24);
    expect(at(rows, 12).hsaMedicalPaid).toBe(300);
    expect(at(rows, 12).hsaReimbursed).toBe(0);
  });

  it("returns to the untouched baseline with both off", () => {
    const off: Assumptions = {
      ...drawing,
      retirement: {
        ...drawing.retirement,
        hsaPayMedical: false,
        hsaTakeReimbursement: false,
      },
    };
    expect(JSON.stringify(runProjection(off, BUY_M12, 24))).toBe(
      JSON.stringify(runProjection(FLAT, BUY_M12, 24)),
    );
  });
});

describe("diverting the HSA to the deposit", () => {
  const diverted: Assumptions = {
    ...FLAT,
    retirement: {
      ...FLAT.retirement,
      pauseHsaMax: true,
    },
  };

  it("lowers what goes into retirement each month", () => {
    const rows = runProjection(diverted, RENT_FOREVER, 24);
    expect(at(rows, 1).employeeContribution).toBe(400);
    expect(
      at(runProjection(FLAT, RENT_FOREVER, 24), 1).employeeContribution,
    ).toBe(1_000);
  });

  it("puts the difference straight into cash flow", () => {
    const rows = runProjection(diverted, RENT_FOREVER, 24);
    const plain = runProjection(FLAT, RENT_FOREVER, 24);
    expect(at(rows, 1).netCashFlow - at(plain, 1).netCashFlow).toBeCloseTo(
      600,
      6,
    );
  });

  it("builds the buffer faster, which is the whole point", () => {
    const a = summarizeScenario(diverted, RENT_FOREVER, 60);
    const b = summarizeScenario(FLAT, RENT_FOREVER, 60);
    expect(at(a.months, 24).liquidSavings).toBeGreaterThan(
      at(b.months, 24).liquidSavings,
    );
  });

  it("costs long-run retirement, which is the price", () => {
    const a = summarizeScenario(diverted, RENT_FOREVER, 240);
    const b = summarizeScenario(FLAT, RENT_FOREVER, 240);
    expect(a.months[239]!.retirementBalance).toBeLessThan(
      b.months[239]!.retirementBalance,
    );
  });

  it("does nothing when switched off", () => {
    const off: Assumptions = {
      ...diverted,
      retirement: { ...diverted.retirement, pauseHsaMax: false },
    };
    expect(JSON.stringify(runProjection(off, RENT_FOREVER, 24))).toBe(
      JSON.stringify(runProjection(FLAT, RENT_FOREVER, 24)),
    );
  });
});

describe("down-payment assistance switches off cleanly", () => {
  const withKfit: Assumptions = {
    ...FLAT,
    home: {
      ...FLAT.home,
      assistanceEnabled: true,
      assistancePctOfPrice: 0.05,
      assistanceRepayment: "forgiven",
      assistanceTermYears: 10,
    },
  };

  it("reduces cash at closing when on", () => {
    const rows = runProjection(withKfit, BUY_M12, 24);
    const plain = runProjection(FLAT, BUY_M12, 24);
    expect(at(rows, 12).purchaseOutflow).toBeCloseTo(
      at(plain, 12).purchaseOutflow - 400_000 * 0.05,
      4,
    );
    expect(at(rows, 12).assistanceReceived).toBeCloseTo(20_000, 4);
  });

  it("sits as a lien against equity until forgiven", () => {
    const rows = runProjection(withKfit, BUY_M12, 200);
    expect(at(rows, 12).assistanceOutstanding).toBeGreaterThan(19_000);
    // Ten years later it has melted away entirely.
    expect(at(rows, 132).assistanceOutstanding).toBeCloseTo(0, 4);
  });

  it("does nothing when the toggle is off", () => {
    const off: Assumptions = {
      ...withKfit,
      home: { ...withKfit.home, assistanceEnabled: false },
    };
    expect(JSON.stringify(runProjection(off, BUY_M12, 24))).toBe(
      JSON.stringify(runProjection(FLAT, BUY_M12, 24)),
    );
  });
});

describe("a co-resident contributing to the household", () => {
  const withMum: Assumptions = {
    ...FLAT,
    coResident: {
      enabled: true,
      label: "Co-resident",
      monthlyAmount: 800,
      requiresHomePurchase: true,
      homePricePremium: 40_000,
      growsWithInflation: false,
      endMonth: null,
    },
  };

  it("contributes nothing while you are still renting", () => {
    const rows = runProjection(withMum, BUY_M12, 60);
    expect(at(rows, 11).coResidentIncome).toBe(0);
    expect(at(rows, 11).netCashFlow).toBeCloseTo(2_000, 6);
  });

  it("starts contributing the month you buy", () => {
    const rows = runProjection(withMum, BUY_M12, 60);
    expect(at(rows, 12).coResidentIncome).toBe(800);
    expect(at(rows, 60).coResidentIncome).toBe(800);
  });

  it("never contributes at all if you never buy", () => {
    const rows = runProjection(withMum, RENT_FOREVER, 60);
    expect(rows.every((r) => r.coResidentIncome === 0)).toBe(true);
  });

  it("can be set to start immediately instead", () => {
    const now: Assumptions = {
      ...withMum,
      coResident: { ...withMum.coResident, requiresHomePurchase: false },
    };
    expect(at(runProjection(now, RENT_FOREVER, 60), 1).coResidentIncome).toBe(
      800,
    );
  });

  it("adds straight to cash flow", () => {
    const rows = runProjection(withMum, BUY_M12, 60);
    const without = runProjection(FLAT, BUY_M12, 60);
    // Same month, same everything, except 800 more coming in -- and a bigger
    // mortgage on the pricier house, so compare the income side directly.
    expect(
      at(rows, 13).netCashFlow - at(rows, 13).coResidentIncome,
    ).toBeLessThan(at(without, 13).netCashFlow);
    expect(at(rows, 13).coResidentIncome).toBe(800);
  });

  it("raises the price of the house you have to buy", () => {
    // 400,000 target plus a 40,000 premium for the extra space.
    expect(homePriceAtMonth(withMum, 1)).toBeCloseTo(440_000, 6);
    expect(cashRequiredToBuy(withMum, 1)).toBeCloseTo(440_000 * 0.23, 6);
    const rows = runProjection(withMum, BUY_M12, 60);
    expect(at(rows, 12).purchaseOutflow).toBeCloseTo(440_000 * 0.23, 4);
    expect(at(rows, 12).homeValue).toBeCloseTo(440_000, 6);
  });

  it("leaves the price alone when switched off", () => {
    const off: Assumptions = {
      ...withMum,
      coResident: { ...withMum.coResident, enabled: false },
    };
    expect(homePriceAtMonth(off, 1)).toBeCloseTo(400_000, 6);
  });

  it("keeps paying during a job loss, unlike a salary", () => {
    // This is the whole point: their income does not depend on your job.
    const rows = runProjection(withMum, { ...BUY_M12, hasJobLoss: true }, 60);
    const m13 = at(rows, 13);
    expect(m13.jobLossActive).toBe(true);
    expect(m13.netIncome).toBeCloseTo(10_000 * 0.4, 6); // salary is cut
    expect(m13.coResidentIncome).toBe(800); // this is not
  });

  it("cushions a job loss, holding the house price constant", () => {
    // Isolate the income effect: same house, same everything, 800 a month more.
    const noPremium: Assumptions = {
      ...withMum,
      coResident: { ...withMum.coResident, homePricePremium: 0 },
    };
    const without = summarizeScenario(
      FLAT,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    const with_ = summarizeScenario(
      noPremium,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    expect(with_.minCashBuffer).toBeGreaterThan(without.minCashBuffer);
    // Six months of job loss, 800 a month arriving throughout.
    expect(with_.minCashBuffer - without.minCashBuffer).toBeGreaterThan(4_000);
  });

  it("shrinks the job-loss dip more than the same amount of salary would", () => {
    // A salary rise of 800 gets cut to the replacement rate during the gap;
    // this does not. That is the difference worth knowing about.
    const noPremium: Assumptions = {
      ...withMum,
      coResident: { ...withMum.coResident, homePricePremium: 0 },
    };
    const extraSalary: Assumptions = {
      ...FLAT,
      income: { ...FLAT.income, monthlyTakeHome: 10_800 },
    };
    const viaCoResident = runProjection(
      noPremium,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    const viaSalary = runProjection(
      extraSalary,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    // Month 13 is inside the job-loss window.
    expect(at(viaCoResident, 13).netCashFlow).toBeGreaterThan(
      at(viaSalary, 13).netCashFlow,
    );
  });

  it("can cost more than it brings in, once the price premium is counted", () => {
    // The honest counterweight: a bigger deposit up front on a pricier house
    // can leave you thinner overall, even with the extra income arriving.
    const without = summarizeScenario(
      FLAT,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    const withPremium = summarizeScenario(
      withMum,
      { ...BUY_M12, hasJobLoss: true },
      60,
    );
    expect(withPremium.minCashBuffer).toBeLessThan(without.minCashBuffer);
    // ...even though month-to-month cash flow is clearly better.
    const rows = runProjection(withMum, BUY_M12, 60);
    const plain = runProjection(FLAT, BUY_M12, 60);
    expect(at(rows, 60).netCashFlow).toBeGreaterThan(at(plain, 60).netCashFlow);
  });

  it("pays for its own price premium over the long run", () => {
    const without = summarizeScenario(FLAT, BUY_M12, 300);
    const withPremium = summarizeScenario(withMum, BUY_M12, 300);
    expect(withPremium.endingNetWorth).toBeGreaterThan(without.endingNetWorth);
  });

  it("tracks inflation when told to", () => {
    const indexed: Assumptions = {
      ...withMum,
      expenses: { ...FLAT.expenses, inflationAnnual: 0.03 },
      coResident: { ...withMum.coResident, growsWithInflation: true },
    };
    const rows = runProjection(indexed, BUY_M12, 60);
    expect(at(rows, 13).coResidentIncome).toBeCloseTo(800 * 1.03, 6);
  });

  it("stops at the end month when one is set", () => {
    const limited: Assumptions = {
      ...withMum,
      coResident: { ...withMum.coResident, endMonth: 36 },
    };
    const rows = runProjection(limited, BUY_M12, 60);
    expect(at(rows, 36).coResidentIncome).toBe(800);
    expect(at(rows, 37).coResidentIncome).toBe(0);
  });

  it("totals the contribution across the horizon", () => {
    const s = summarizeScenario(withMum, BUY_M12, 60);
    // 49 months of ownership at 800.
    expect(s.totalCoResidentIncome).toBeCloseTo(49 * 800, 6);
  });

  it("pushes the deposit further away, because the house costs more", () => {
    const saving: Assumptions = {
      ...FLAT,
      savings: { ...FLAT.savings, cashBalance: 50_000 },
    };
    const savingWithMum: Assumptions = {
      ...saving,
      coResident: withMum.coResident,
    };
    const a = summarizeScenario(saving, RENT_FOREVER, 120);
    const b = summarizeScenario(savingWithMum, RENT_FOREVER, 120);
    // The contribution only starts after you buy, so it cannot help you save.
    expect(b.readinessMonth!).toBeGreaterThan(a.readinessMonth!);
  });
});

describe("summarizeScenario", () => {
  const saving: Assumptions = {
    ...FLAT,
    savings: { ...FLAT.savings, cashBalance: 50_000 },
  };

  it("finds the first month the down payment is fully funded", () => {
    // Needs 92,000. Cash is 50,000 + 2,000 * m, so month 21 is the first to clear.
    const s = summarizeScenario(saving, RENT_FOREVER, 60);
    expect(s.readinessMonth).toBe(21);
    expect(s.readinessCashRequired).toBeCloseTo(92_000, 6);
  });

  it("measures readiness independently of the scenario’s own purchase", () => {
    // Buying at month 12 drains the account, but the question "when could we
    // afford it" still has the same answer.
    const s = summarizeScenario(saving, { ...BUY_M12 }, 60);
    expect(s.readinessMonth).toBe(21);
  });

  it("reports not-on-track when the horizon runs out first", () => {
    const tight: Assumptions = {
      ...saving,
      expenses: { ...FLAT.expenses, variableMonthly: 4_000 }, // net cash flow now 0
    };
    const s = summarizeScenario(tight, RENT_FOREVER, 60);
    expect(s.readinessMonth).toBeNull();
  });

  it("flags a purchase that the model cannot actually fund", () => {
    const s = summarizeScenario(saving, BUY_M12, 60);
    expect(s.fundedAtPurchase).toBe(false);
    expect(s.goesNegative).toBe(true);
    expect(s.minCashBuffer).toBeLessThan(0);
    expect(s.minCashBufferMonth).toBe(12);
  });

  it("confirms a purchase the model can fund", () => {
    const s = summarizeScenario(FLAT, BUY_M12, 60);
    expect(s.fundedAtPurchase).toBe(true);
    expect(s.goesNegative).toBe(false);
    expect(s.minCashBuffer).toBeCloseTo(81_281.44, 2);
    expect(s.minCashBufferMonth).toBe(12);
  });

  it("puts the minimum buffer at the bottom of a deep job-loss dip", () => {
    // A total income stop with no belt-tightening: -7,000 a month for a year.
    const severe: Assumptions = {
      ...FLAT,
      jobLoss: {
        ...FLAT.jobLoss,
        durationMonths: 12,
        incomeReplacementPct: 0,
        expenseCutPct: 0,
      },
    };
    const s = summarizeScenario(
      severe,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    // Cash peaks at 174,000 in month 12, then drains through month 24.
    expect(s.minCashBufferMonth).toBe(24);
    expect(s.minCashBuffer).toBeCloseTo(174_000 - 12 * 7_000, 6);
    expect(s.goesNegative).toBe(false);
  });

  it("reports the starting balance as the buffer when we only ever save", () => {
    // A mild disruption that never digs below where we started is not a buffer
    // event: the thinnest cash moment is still month 1.
    const s = summarizeScenario(
      FLAT,
      { ...RENT_FOREVER, hasJobLoss: true },
      60,
    );
    expect(s.minCashBufferMonth).toBe(1);
    expect(s.minCashBuffer).toBeCloseTo(152_000, 6);
    // ...but the job-loss trough is still visible in the month-by-month data.
    const trough = s.months[17];
    expect(trough?.liquidSavings).toBeCloseTo(162_000, 6);
  });

  it("reports net worth at years 1, 3 and 5", () => {
    const s = summarizeScenario(FLAT, RENT_FOREVER, 60);
    expect(s.netWorthAtYear[1]).toBeCloseTo(174_000 + 118_000, 6);
    expect(s.netWorthAtYear[3]).toBeCloseTo(
      150_000 + 36 * 2_000 + 100_000 + 36 * 1_500,
      6,
    );
    expect(s.netWorthAtYear[5]).toBeCloseTo(s.endingNetWorth, 9);
  });

  it("omits year markers beyond a shorter horizon", () => {
    const s = summarizeScenario(FLAT, RENT_FOREVER, 24);
    expect(s.netWorthAtYear[1]).toBeDefined();
    expect(s.netWorthAtYear[3]).toBeUndefined();
  });
});

describe("runAllScenarios", () => {
  const scenarios: ScenarioConfig[] = [
    BUY_M12,
    { ...RENT_FOREVER, id: "off", name: "Hidden", enabled: false },
  ];

  it("runs only the enabled scenarios", () => {
    const out = runAllScenarios(FLAT, scenarios, 60);
    expect(out).toHaveLength(1);
    expect(out[0]?.scenarioId).toBe("buy12");
    expect(out[0]?.months).toHaveLength(60);
  });

  it("is pure: repeated runs give identical results", () => {
    const a = runAllScenarios(FLAT, scenarios, 60);
    const b = runAllScenarios(FLAT, scenarios, 60);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("does not mutate the assumptions it is given", () => {
    const snapshot = JSON.stringify(FLAT);
    runAllScenarios(FLAT, scenarios, 60);
    expect(JSON.stringify(FLAT)).toBe(snapshot);
  });
});
