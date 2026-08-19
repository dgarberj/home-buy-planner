import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { runProjection, summarizeScenario } from "./projection";
import { at, FLAT, RENT_FOREVER } from "./projection.test-helpers";

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
