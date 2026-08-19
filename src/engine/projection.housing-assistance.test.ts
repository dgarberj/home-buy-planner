import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import {
  cashRequiredToBuy,
  homePriceAtMonth,
  runProjection,
  summarizeScenario,
} from "./projection";
import { at, BUY_M12, FLAT, RENT_FOREVER } from "./projection.test-helpers";

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
