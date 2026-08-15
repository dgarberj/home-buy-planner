import { useMemo } from "react";
import { COST_DEFAULTS } from "../costDefaults";
import {
  ALL_MUNICIPALITIES,
  effectiveRate,
  qualityPerDollar,
  type Municipality,
} from "../data/localMarket";
import { pmiRateFor } from "../data/mortgageInsurance";
import {
  classifyReach,
  housingBudget,
  maxAffordablePrice,
  monthlyCostOfHouse,
  type HousingBudget,
  type Reach,
} from "../engine/affordability";
import type { Assumptions } from "../model/types";

export interface RankedTownCost {
  principalAndInterest: number;
  tax: number;
  insurance: number;
  pmi: number;
  maintenance: number;
  total: number;
}

export interface RankedTown {
  m: Municipality;
  rate: number;
  max: number;
  cost: RankedTownCost | null;
  valueScore: number | null;
  reach: Reach;
}

export interface RankedTowns {
  budget: HousingBudget;
  ceilingPrice: number;
  rows: RankedTown[];
}

/**
 * `assumptions` with the flat `home.pmiAnnualPct` replaced by the
 * credit-score-aware rate. Every PMI-dependent figure below -- ceiling,
 * per-town max, per-town cost, and therefore reach -- is derived from THIS,
 * so a card's reach badge, its displayed monthly total and the budget it's
 * judged against never disagree by a PMI-sized amount depending on which
 * number you look at.
 */
function withCreditPmi(
  assumptions: Assumptions,
  creditScore: number,
): Assumptions {
  return {
    ...assumptions,
    home: {
      ...assumptions.home,
      pmiAnnualPct: pmiRateFor(assumptions.home.downPaymentPct, creditScore),
    },
  };
}

/**
 * All-in monthly cost of a specific house in a specific town, using the same
 * credit-score-aware PMI as useRankedTowns -- shared so a town-detail view
 * can price a hypothetical override on the same basis as the ranked rows.
 */
export function costOfTownAtPrice(
  assumptions: Assumptions,
  rate: number,
  price: number,
  creditScore: number,
): RankedTownCost {
  return monthlyCostOfHouse(withCreditPmi(assumptions, creditScore), {
    price,
    effectiveTaxRate: rate,
    insuranceMonthly: COST_DEFAULTS.flatMonthlyInsuranceUsd,
  });
}

/**
 * Every municipality, ranked against a shared monthly budget.
 */
export function useRankedTowns(
  assumptions: Assumptions,
  reserve: number,
  creditScore: number,
): RankedTowns {
  const budget = useMemo(
    () =>
      housingBudget(assumptions, { atMonth: 12, reserveForSavings: reserve }),
    [assumptions, reserve],
  );

  const pmiAdjusted = useMemo(
    () => withCreditPmi(assumptions, creditScore),
    [assumptions, creditScore],
  );

  const ceilingPrice = useMemo(
    () =>
      maxAffordablePrice(pmiAdjusted, {
        monthlyBudget: budget.monthlyBudget,
        effectiveTaxRate: COST_DEFAULTS.typicalEffectiveTaxRate,
        insuranceMonthly: COST_DEFAULTS.flatMonthlyInsuranceUsd,
      }),
    [pmiAdjusted, budget.monthlyBudget],
  );

  const rows = useMemo(() => {
    return ALL_MUNICIPALITIES.map((m): RankedTown => {
      const rate = effectiveRate(m);
      const max = maxAffordablePrice(pmiAdjusted, {
        monthlyBudget: budget.monthlyBudget,
        effectiveTaxRate: rate,
        insuranceMonthly: COST_DEFAULTS.flatMonthlyInsuranceUsd,
      });

      const cost = m.medianPrice
        ? monthlyCostOfHouse(pmiAdjusted, {
            price: m.medianPrice,
            effectiveTaxRate: rate,
            insuranceMonthly: COST_DEFAULTS.flatMonthlyInsuranceUsd,
          })
        : null;

      const valueScore = qualityPerDollar(m, assumptions.home);
      return {
        m,
        rate,
        max,
        cost,
        valueScore,
        reach: classifyReach(m.medianPrice, max),
      };
    });
  }, [assumptions.home, pmiAdjusted, budget.monthlyBudget]);

  return { budget, ceilingPrice, rows };
}
