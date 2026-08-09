/**
 * First-time buyer assistance available in south-east Pennsylvania.
 *
 * Sourced August 2026 from:
 *  - PHFA purchase assistance: https://www.phfa.org/programs/assistance.aspx
 *  - PHFA Appendix A (limits, effective 1 Jul 2026):
 *    https://www.phfa.org/forms/sellersguide/appendices/a.pdf
 *  - Delaware County Housing & Community Development:
 *    https://delcopa.gov/hcd/housinginitiatives
 *
 * "First-time buyer" throughout means no ownership interest in a principal
 * residence in the previous three years. Renting the whole time qualifies.
 */

export interface AssistanceProgram {
  key: string;
  name: string;
  provider: string;
  /**
  What you get, in words.
  */
  benefit: string;
  /**
  Percentage of purchase price, where the benefit scales.
  */
  pctOfPrice: number | null;
  /**
  Hard cap in dollars, or null for none.
  */
  maxAmount: number | null;
  /**
  How it is repaid: forgiven, deferred, amortised, or a straight grant.
  */
  repayment: 'forgiven' | 'deferred' | 'amortised' | 'grant';
  minCreditScore: number | null;
  /**
  Liquid assets you may still hold after closing. Retirement usually excluded.
  */
  maxLiquidAssetsAfterClosing: number | null;
  requiresFirstTimeBuyer: boolean;
  /**
  Household income ceiling for a 3+ person household in Delaware County.
  */
  incomeLimit3Plus: number | null;
  purchasePriceLimit: number | null;
  combinable: string;
  note: string;
  url: string;
}

/**
 * PHFA limits for Region 1 -- Bucks, Chester, Delaware, Montgomery.
 * Philadelphia is a designated target area with materially higher ceilings.
 */
export const PHFA_LIMITS = {
  region1: {
    counties: ['Delaware', 'Montgomery', 'Chester', 'Bucks'],
    purchasePrice: 588_800,
    income1to2: 122_700,
    income3Plus: 141_100,
  },
  philadelphia: {
    purchasePrice: 730_600,
    income1to2: 147_200,
    income3Plus: 171_700,
  },
};

export const ASSISTANCE_PROGRAMS: AssistanceProgram[] = [
  {
    key: 'kfit',
    name: 'K-FIT — Keystone Forgivable in Ten Years',
    provider: 'PHFA',
    benefit: '5% of the purchase price, with no dollar cap, forgiven 10% a year over ten years',
    pctOfPrice: 0.05,
    maxAmount: null,
    repayment: 'forgiven',
    minCreditScore: 660,
    maxLiquidAssetsAfterClosing: 50_000,
    requiresFirstTimeBuyer: true,
    incomeLimit3Plus: 141_100,
    purchasePriceLimit: 588_800,
    combinable: 'Pairs with the Keystone Home Loan only. Cannot be stacked with other PHFA assistance.',
    note: 'The strongest offer on this list by a distance — no cap, and it disappears entirely if you stay ten years. Requires a PHFA first mortgage rather than a Conventional 97, so compare the rate.',
    url: 'https://www.phfa.org/programs/assistance.aspx',
  },
  {
    key: 'kdate',
    name: 'K-DATE — Keystone Due At Time of Expiration',
    provider: 'PHFA',
    benefit: '5% of purchase price on loans over $150,000 (8% below that), 0% interest, no monthly payment',
    pctOfPrice: 0.05,
    maxAmount: null,
    repayment: 'deferred',
    minCreditScore: 660,
    maxLiquidAssetsAfterClosing: 50_000,
    requiresFirstTimeBuyer: true,
    incomeLimit3Plus: 141_100,
    purchasePriceLimit: 588_800,
    combinable: 'Pairs with Keystone Home Loan or Keystone Flex. Not with other PHFA assistance.',
    note: 'Not forgiven — repaid when you sell, refinance or pay off the first mortgage. No monthly cost in the meantime, so it helps cash flow but not net worth.',
    url: 'https://www.phfa.org/programs/assistance/kdate.aspx',
  },
  {
    key: 'advantage',
    name: 'Keystone Advantage Assistance',
    provider: 'PHFA',
    benefit: 'The lesser of 4% or $6,000, at 0% interest, repaid over ten years',
    pctOfPrice: 0.04,
    maxAmount: 6_000,
    repayment: 'amortised',
    minCreditScore: 660,
    maxLiquidAssetsAfterClosing: 50_000,
    requiresFirstTimeBuyer: false,
    incomeLimit3Plus: 141_100,
    purchasePriceLimit: null,
    combinable: 'Pairs with HFA Preferred, Keystone Government or Keystone Home Loan.',
    note: 'Rises to $8,000 if your employer is on the PHFA Employer Assisted Housing list — worth ten minutes to check.',
    url: 'https://www.phfa.org/programs/assistance.aspx',
  },
  {
    key: 'phfa-grant',
    name: 'PHFA Grant',
    provider: 'PHFA',
    benefit: '$500 towards closing costs, never repaid',
    pctOfPrice: null,
    maxAmount: 500,
    repayment: 'grant',
    minCreditScore: null,
    maxLiquidAssetsAfterClosing: null,
    requiresFirstTimeBuyer: false,
    incomeLimit3Plus: 141_100,
    purchasePriceLimit: null,
    combinable: 'Requires the HFA Preferred (Lo MI) loan. Can be stacked with Keystone Advantage.',
    note: 'Small, but free, and it stacks.',
    url: 'https://www.phfa.org/programs/assistance.aspx',
  },
  {
    key: 'delco-first',
    name: 'Homeownership First',
    provider: 'Delaware County',
    benefit: 'Up to $10,000 towards deposit and closing costs, at 0% interest',
    pctOfPrice: null,
    maxAmount: 10_000,
    repayment: 'deferred',
    minCreditScore: null,
    maxLiquidAssetsAfterClosing: null,
    requiresFirstTimeBuyer: true,
    incomeLimit3Plus: null,
    purchasePriceLimit: null,
    combinable: 'Not a PHFA programme, so it may stack — confirm with a participating lender.',
    note: 'Repayable on sale or transfer, and forgiven after five years if the property sits in a designated Revitalization Area. Aimed at low-to-moderate incomes and the funding is limited, so treat it as a maybe. Requires counselling.',
    url: 'https://delcopa.gov/hcd/housinginitiatives',
  },
];

export interface EligibilityCheck {
  program: AssistanceProgram;
  eligible: boolean;
  /**
  Estimated benefit in dollars at the given purchase price.
  */
  estimatedBenefit: number;
  /**
  Reasons it does not apply, if any.
  */
  blockers: string[];
  /**
  Things that need confirming rather than blocking.
  */
  caveats: string[];
}

/**
 * Work out, from the household's own figures, which programmes are actually in
 * reach. Pure, so it can be tested rather than eyeballed.
 */
export function checkEligibility(input: {
  purchasePrice: number;
  householdGrossIncome: number;
  householdSize: number;
  creditScore: number;
  liquidAssetsAfterClosing: number;
  isFirstTimeBuyer: boolean;
  county: string;
}): EligibilityCheck[] {
  return ASSISTANCE_PROGRAMS.map((program) => {
    const blockers: string[] = [];
    const caveats: string[] = [];

    if (program.minCreditScore !== null && input.creditScore < program.minCreditScore) {
      blockers.push(`Needs a credit score of ${program.minCreditScore}; yours is ${input.creditScore}.`);
    }
    if (program.requiresFirstTimeBuyer && !input.isFirstTimeBuyer) {
      blockers.push('Requires a first-time buyer — no principal residence owned in three years.');
    }
    if (program.incomeLimit3Plus !== null) {
      // The published tables split at three household members.
      const limit =
        input.householdSize >= 3 ? program.incomeLimit3Plus : PHFA_LIMITS.region1.income1to2;
      if (input.householdGrossIncome > limit) {
        blockers.push(
          `Household income of $${Math.round(input.householdGrossIncome).toLocaleString()} exceeds the $${limit.toLocaleString()} limit.`,
        );
      }
    }
    if (program.purchasePriceLimit !== null && input.purchasePrice > program.purchasePriceLimit) {
      blockers.push(
        `Purchase price above the $${program.purchasePriceLimit.toLocaleString()} ceiling.`,
      );
    }
    if (
      program.maxLiquidAssetsAfterClosing !== null &&
      input.liquidAssetsAfterClosing > program.maxLiquidAssetsAfterClosing
    ) {
      blockers.push(
        `More than $${program.maxLiquidAssetsAfterClosing.toLocaleString()} of liquid assets left after closing.`,
      );
    }
    if (program.key === 'delco-first') {
      caveats.push('Aimed at low-to-moderate incomes; the published limits are not the PHFA ones. Confirm directly.', 'Funding is limited and completing the counselling does not guarantee an award.');
    } else if (program.key === 'kfit' || program.key === 'kdate') {
      caveats.push('Requires a PHFA first mortgage, so compare its rate against a Conventional 97.');
    }

    const byPct = program.pctOfPrice === null ? Infinity : input.purchasePrice * program.pctOfPrice;
    const byCap = program.maxAmount ?? Infinity;
    const estimated = Math.min(byPct, byCap);

    return {
      program,
      eligible: blockers.length === 0,
      estimatedBenefit: Number.isFinite(estimated) ? estimated : 0,
      blockers,
      caveats,
    };
  });
}
