/**
 * Federal income tax brackets and standard deduction, 2026.
 *
 * Kept apart from the market data because these need revisiting every
 * January, when the IRS publishes the new numbers.
 *
 * Source: Tax Foundation's 2026 bracket table, sourced from the IRS's own
 * inflation-adjustment release (Rev. Proc. 2025-32, reflecting the OBBBA's
 * permanent TCJA rate structure), August 2026.
 *
 * FEDERAL INCOME TAX ONLY. This deliberately excludes FICA (Social
 * Security/Medicare) and state tax (Delaware, Pennsylvania) -- both would
 * need their own sourcing and neither is in scope here. `marginalRate` and
 * `federalTaxOn` exist to show the tax savings from pre-tax retirement
 * contributions, not to compute actual take-home pay -- the app takes
 * take-home as a direct input everywhere else and this does not change
 * that.
 */

export type FilingStatus = "single" | "marriedJoint";

export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16_100,
  marriedJoint: 32_200,
};

/**
Each bracket's rate and the top of its income range. The last bracket's
`upTo` is Infinity -- there is no ceiling on the top rate.
*/
export const FEDERAL_BRACKETS_2026: Record<
  FilingStatus,
  { rate: number; upTo: number }[]
> = {
  single: [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Infinity },
  ],
  marriedJoint: [
    { rate: 0.1, upTo: 24_800 },
    { rate: 0.12, upTo: 100_800 },
    { rate: 0.22, upTo: 211_400 },
    { rate: 0.24, upTo: 403_550 },
    { rate: 0.32, upTo: 512_450 },
    { rate: 0.35, upTo: 768_700 },
    { rate: 0.37, upTo: Infinity },
  ],
};

/**
Federal income tax owed on a given amount of taxable income (after the
standard deduction), walking each bracket rather than applying a single
flat rate -- this is what makes tax-savings maths correct even when a
contribution straddles a bracket boundary.
*/
export function federalTaxOn(
  taxableIncome: number,
  status: FilingStatus,
): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let bottom = 0;
  const brackets = FEDERAL_BRACKETS_2026[status];
  for (const { rate, upTo } of brackets) {
    const taxableInBracket = Math.max(0, Math.min(taxableIncome, upTo) - bottom);
    tax += taxableInBracket * rate;
    if (taxableIncome <= upTo) break;
    bottom = upTo;
  }
  return tax;
}

/**
The rate applied to the next dollar earned, given gross annual income and
the standard deduction -- useful for labeling ("you're in the 22% bracket"),
not for computing exact dollar savings on a contribution (use
`federalTaxOn` for that, since a contribution can straddle a boundary).
*/
export function marginalRate(grossAnnual: number, status: FilingStatus): number {
  const taxableIncome = Math.max(0, grossAnnual - STANDARD_DEDUCTION_2026[status]);
  const brackets = FEDERAL_BRACKETS_2026[status];
  for (const { rate, upTo } of brackets) {
    if (taxableIncome <= upTo) return rate;
  }
  return brackets.at(-1)!.rate;
}
