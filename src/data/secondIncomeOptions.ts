/**
 * Realistic options for a second earner with a BBA, in the Philadelphia metro.
 *
 * Sourced August 2026:
 *  - Entry-level business administration, Pennsylvania: $43,916 average,
 *    $37,194-$53,677 range (Salary.com)
 *  - Business administration, Philadelphia, all experience: $69,745 average,
 *    25th percentile $47,900 (ZipRecruiter)
 *  - Part-time evening, Philadelphia: $16.49/hr average
 *  - Part-time weekend, Philadelphia: $17.01/hr average
 *
 * Take-home is computed at the MARGINAL rate, which is the right way to think
 * about a second income: it stacks on top of the first, so every dollar is
 * taxed at the top of the household's bracket, not at the average rate.
 *
 *   22% federal (married filing jointly, around $125k combined)
 * +  7.65% FICA
 * +  3.07% Pennsylvania
 * +  1% local earned income tax
 * = 33.72% marginal, so roughly 66 cents in the dollar reaches the account.
 */

export const SECOND_EARNER_MARGINAL_RATE = 0.3372;

/** Net of tax, from a gross annual salary. */
export function netMonthlyFromGross(grossAnnual: number): number {
  return (grossAnnual * (1 - SECOND_EARNER_MARGINAL_RATE)) / 12;
}

export interface SecondIncomeOption {
  key: string;
  label: string;
  grossAnnual: number;
  /** Childcare and other costs of working, per month. */
  costsMonthly: number;
  hoursNote: string;
  note: string;
  /** Does this build Social Security credits at the full rate? */
  fullCredits: boolean;
}

/**
 * The 2026 threshold for a full year of Social Security credits.
 *
 * One credit per $1,890 earned, four per year maximum, so $7,560 of earnings
 * buys a complete year. This is low enough that even modest part-time work
 * earns credits at exactly the same rate as a full-time salary -- which means
 * Social Security is NOT a reason to prefer full-time work.
 */
export const SS_CREDIT_2026 = { perCredit: 1_890, maxPerYear: 4, fullYearEarnings: 7_560 };

export const SECOND_INCOME_OPTIONS: SecondIncomeOption[] = [
  {
    key: 'none',
    label: 'Not working',
    grossAnnual: 0,
    costsMonthly: 0,
    hoursNote: '—',
    note: 'The current baseline. No income, no childcare, no Social Security credits accruing.',
    fullCredits: false,
  },
  {
    key: 'part-time-evenings',
    label: 'Part-time, nights and weekends',
    grossAnnual: 17_680,
    costsMonthly: 0,
    hoursNote: '20 hrs/week at $17/hr',
    note: 'No childcare, because one of you is always home. The trade is that you are rarely both off at the same time, and it builds little career progression.',
    fullCredits: true,
  },
  {
    key: 'full-time-entry',
    label: 'Full-time, entry-level BBA',
    grossAnnual: 48_000,
    costsMonthly: 1_400,
    hoursNote: '40 hrs/week',
    note: 'Around the 25th percentile for business administration in Philadelphia. Needs full-time childcare until school age.',
    fullCredits: true,
  },
  {
    key: 'full-time-established',
    label: 'Full-time, once established',
    grossAnnual: 69_745,
    costsMonthly: 1_400,
    hoursNote: '40 hrs/week',
    note: 'The Philadelphia average for business administration across all experience levels. A few years of full-time work is what gets you here — part-time evenings will not.',
    fullCredits: true,
  },
];

/** Net monthly benefit once the costs of working are subtracted. */
export function netBenefit(option: SecondIncomeOption, duringChildcare: boolean): number {
  return netMonthlyFromGross(option.grossAnnual) - (duringChildcare ? option.costsMonthly : 0);
}
