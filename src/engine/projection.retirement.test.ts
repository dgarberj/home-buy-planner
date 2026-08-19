import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { monthForAge, runProjection, summarizeScenario } from "./projection";
import { at, BUY_M12, FLAT, RENT_FOREVER } from "./projection.test-helpers";

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
    const s = summarizeScenario(FLAT, RENT_FOREVER, 60, 100_000, [41, 42, 65]);
    expect(s.netWorthAtAge[41]).toBeCloseTo(at(rows, 13).netWorth, 9);
    expect(s.netWorthAtAge[42]).toBeCloseTo(at(rows, 25).netWorth, 9);
    // 65 is decades past the end of this projection.
    expect(s.netWorthAtAge[65]).toBeUndefined();
  });

  it("breaks each milestone down by where the money sits", () => {
    const rows = runProjection(FLAT, BUY_M12, 60);
    const s = summarizeScenario(FLAT, BUY_M12, 60, 100_000, [42]);
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
