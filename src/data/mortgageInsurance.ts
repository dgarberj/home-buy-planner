/**
 * Private mortgage insurance rates by loan-to-value and credit score.
 *
 * These are indicative annual rates as a share of the original loan, drawn from
 * published 2026 borrower-paid PMI tables. Actual quotes vary by insurer, by
 * debt-to-income ratio, and by property type, so treat these as a planning
 * range and get a real quote before committing.
 *
 * The pattern that matters: PMI is punishingly expensive on a low deposit with
 * mediocre credit, and remarkably cheap on a low deposit with excellent credit.
 * At 780+ it is often the difference between "wait three more years" and
 * "buy now for an extra hundred a month".
 */

export interface PmiTier {
  /** Minimum credit score for this row. */
  minScore: number;
  label: string;
  /** Annual PMI rate by down payment, as a decimal of the original loan. */
  byDownPayment: {
    /** 3% down -- a Conventional 97 loan. */
    three: number;
    /** 5% down. */
    five: number;
    /** 10% down. */
    ten: number;
    /** 15% down. */
    fifteen: number;
  };
}

export const PMI_TIERS: PmiTier[] = [
  { minScore: 760, label: '760+', byDownPayment: { three: 0.0055, five: 0.0041, ten: 0.003, fifteen: 0.0019 } },
  { minScore: 740, label: '740-759', byDownPayment: { three: 0.0068, five: 0.0053, ten: 0.0038, fifteen: 0.0024 } },
  { minScore: 720, label: '720-739', byDownPayment: { three: 0.0082, five: 0.0064, ten: 0.0047, fifteen: 0.003 } },
  { minScore: 700, label: '700-719', byDownPayment: { three: 0.0105, five: 0.0082, ten: 0.006, fifteen: 0.0039 } },
  { minScore: 680, label: '680-699', byDownPayment: { three: 0.0126, five: 0.0099, ten: 0.0072, fifteen: 0.0047 } },
  { minScore: 620, label: '620-679', byDownPayment: { three: 0.0194, five: 0.0152, ten: 0.0111, fifteen: 0.0072 } },
];

/** The indicative annual PMI rate for a given down payment and credit score. */
export function pmiRateFor(downPaymentPct: number, creditScore: number): number {
  const tier = PMI_TIERS.find((t) => creditScore >= t.minScore) ?? PMI_TIERS[PMI_TIERS.length - 1]!;
  const dp = tier.byDownPayment;
  if (downPaymentPct >= 0.2) return 0;
  if (downPaymentPct >= 0.15) return dp.fifteen;
  if (downPaymentPct >= 0.1) return dp.ten;
  if (downPaymentPct >= 0.05) return dp.five;
  return dp.three;
}

/**
 * Conventional 97: 3% down, no upfront premium, and PMI that cancels at 80%
 * loan-to-value. The key contrast with FHA, which charges 1.75% upfront and
 * keeps mortgage insurance for the life of the loan on a low deposit.
 */
export const CONVENTIONAL_97 = {
  minDownPaymentPct: 0.03,
  minCreditScore: 620,
  upfrontPremiumPct: 0,
  pmiCancelsAtLtv: 0.8,
  note: 'No upfront premium, and the monthly premium falls away at 80% LTV. On strong credit this usually beats FHA over the life of the loan.',
};
