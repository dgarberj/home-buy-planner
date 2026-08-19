import { describe, expect, it } from "vitest";
import type { Assumptions } from "../model/types";
import { monthlyPayment } from "./finance";
import {
  cashRequiredToBuy,
  runProjection,
  summarizeScenario,
} from "./projection";
import { at, BUY_M12, FLAT, PI, RENT_FOREVER } from "./projection.test-helpers";

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
