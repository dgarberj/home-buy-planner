import type { Assumptions } from '../model/types';
import { monthlyNominal, monthlyPayment } from './finance';

/**
 * ============================================================================
 *  What a LENDER will actually allow.
 * ============================================================================
 *
 * Everything else in this app asks "can we live on what is left". A lender asks
 * a completely different question: "what share of GROSS income do the debts
 * take". The two disagree, and the lender's answer is the one that decides
 * whether you get the loan at all.
 *
 * The difference matters most here because of support payments. It is not a living
 * cost to an underwriter, it is a debt — Fannie Mae counts alimony, child
 * support and maintenance with more than ten months remaining. At $1,055 a
 * month against roughly $10,400 of gross income, it consumes about ten points
 * of DTI before a mortgage is even considered.
 *
 * Limits (Fannie Mae, 2026):
 *   36%  the classic manual-underwriting benchmark
 *   45%  manual underwriting, with a strong credit score and reserves
 *   50%  the ceiling through Desktop Underwriter
 *
 * Pure, and tested. Not a pre-approval: an underwriter looks at documents, not
 * at this.
 */

export const DTI_LIMITS = {
  /** Comfortable. Most lenders approve without argument. */
  conservative: 0.36,
  /** Manual underwriting with compensating factors. */
  manual: 0.45,
  /** The Desktop Underwriter ceiling. Beyond this, no. */
  automated: 0.5,
};

/**
 * A debt with fewer than this many payments left is generally excluded from
 * DTI. Worth knowing: a car loan close to the end can be timed around.
 */
export const MONTHS_REMAINING_EXCLUSION = 10;

export interface DtiInput {
  /** Gross monthly income before any deduction. NOT take-home. */
  grossMonthlyIncome: number;
  /** Proposed housing payment: principal, interest, tax, insurance, PMI, HOA. */
  proposedHousing: number;
  /** Support payments, alimony and maintenance you PAY. */
  supportPaid: number;
  /** Car loans, student loans, personal loans. */
  instalmentDebts: number;
  /** Minimum payments on revolving credit, even if you clear it monthly. */
  revolvingMinimums: number;
}

export interface DtiResult {
  /** Housing alone as a share of gross income. */
  frontEnd: number;
  /** Everything as a share of gross income. This is the one that decides. */
  backEnd: number;
  totalDebts: number;
  /** Which band the ratio falls in. */
  verdict: 'comfortable' | 'workable' | 'tight' | 'declined';
  /** Housing payment that would land exactly on a given limit. */
  headroomAt: Record<keyof typeof DTI_LIMITS, number>;
  /** How much of the ratio support payments alone is using. */
  supportShare: number;
}

export function debtToIncome(input: DtiInput): DtiResult {
  const nonHousing = input.supportPaid + input.instalmentDebts + input.revolvingMinimums;
  const totalDebts = nonHousing + input.proposedHousing;
  const gross = input.grossMonthlyIncome;

  const backEnd = gross > 0 ? totalDebts / gross : Infinity;

  const verdict: DtiResult['verdict'] =
    backEnd <= DTI_LIMITS.conservative
      ? 'comfortable'
      : backEnd <= DTI_LIMITS.manual
        ? 'workable'
        : backEnd <= DTI_LIMITS.automated
          ? 'tight'
          : 'declined';

  /** The largest housing payment that still fits under each limit. */
  const headroomAt = {
    conservative: Math.max(0, gross * DTI_LIMITS.conservative - nonHousing),
    manual: Math.max(0, gross * DTI_LIMITS.manual - nonHousing),
    automated: Math.max(0, gross * DTI_LIMITS.automated - nonHousing),
  };

  return {
    frontEnd: gross > 0 ? input.proposedHousing / gross : Infinity,
    backEnd,
    totalDebts,
    verdict,
    headroomAt,
    supportShare: gross > 0 ? input.supportPaid / gross : 0,
  };
}

/**
 * The dearest house a lender would allow, working back from the DTI limit
 * rather than from what is left in the budget.
 *
 * This is frequently a LOWER number than the household-budget answer, because
 * a lender counts gross income and ignores that you spend little.
 */
export function maxPriceByDti(
  assumptions: Assumptions,
  opts: {
    grossMonthlyIncome: number;
    supportPaid: number;
    instalmentDebts: number;
    revolvingMinimums: number;
    effectiveTaxRate: number;
    insuranceMonthly: number;
    limit?: number;
  },
): number {
  const { home } = assumptions;
  const limit = opts.limit ?? DTI_LIMITS.manual;
  const nonHousing = opts.supportPaid + opts.instalmentDebts + opts.revolvingMinimums;
  const housingAllowance = opts.grossMonthlyIncome * limit - nonHousing;
  if (housingAllowance <= opts.insuranceMonthly) return 0;

  const loanShare = 1 - home.downPaymentPct;
  const termMonths = Math.round(home.mortgageTermYears * 12);
  const pmtPerDollar = monthlyPayment(1, monthlyNominal(home.mortgageRateAnnual), termMonths);
  const needsPmi = loanShare > home.pmiRemovedAtLtv;
  const pmiPerDollar = needsPmi ? (loanShare * home.pmiAnnualPct) / 12 : 0;

  // Upkeep is deliberately absent: a lender does not count it, even though you
  // will pay it. That is one reason a lender's maximum is not a safe maximum.
  const costPerDollar = loanShare * pmtPerDollar + opts.effectiveTaxRate / 12 + pmiPerDollar;
  if (costPerDollar <= 0) return 0;

  return Math.max(0, (housingAllowance - opts.insuranceMonthly) / costPerDollar);
}

/**
 * Whether a debt can be left out of the calculation because it is nearly over.
 * Fannie Mae generally excludes instalment debts with ten or fewer payments
 * left -- so the month you apply can genuinely change what you qualify for.
 */
export function isExcludableFromDti(monthsRemaining: number): boolean {
  return monthsRemaining <= MONTHS_REMAINING_EXCLUSION;
}
