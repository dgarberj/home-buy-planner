/**
 * Small, pure financial primitives. No app state, no React, no side effects.
 * Every function here is unit-tested against hand-computed values.
 */

/**
 * Convert an annual rate to its true monthly equivalent, so that compounding it
 * twelve times reproduces the annual rate exactly.
 *
 *   monthlyGeometric(0.12) ** 12 === 1.12
 *
 * Used for income growth, expense inflation, investment returns and home
 * appreciation -- anything where "6% a year" means 6% a year.
 */
export function monthlyGeometric(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/**
 * Convert an annual rate to a monthly rate by simple division.
 *
 * This is the US mortgage convention: a quoted 6.5% loan charges 6.5/12 % per
 * month, which is why its effective annual rate is slightly above 6.5%. Using
 * `monthlyGeometric` here would understate the payment.
 */
export function monthlyNominal(annualRate: number): number {
  return annualRate / 12;
}

/**
Compound `value` forward by `months` months at a monthly rate.
*/
export function compound(
  value: number,
  monthlyRate: number,
  months: number,
): number {
  return value * Math.pow(1 + monthlyRate, months);
}

/**
 * Standard fixed-rate amortising payment (the spreadsheet `PMT`).
 *
 *   payment = L * r / (1 - (1 + r)^-n)
 *
 * @param principal loan amount
 * @param monthlyRate periodic rate (use `monthlyNominal(apr)`)
 * @param termMonths total number of payments
 */
export function monthlyPayment(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0;
  if (principal <= 0) return 0;
  // A 0% loan is just principal spread evenly; the formula divides by zero.
  if (monthlyRate === 0) return principal / termMonths;
  return (
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
  );
}

/**
 * Remaining principal after `paymentsMade` payments on a fixed-rate loan.
 *
 *   balance = L*(1+r)^n - PMT * (((1+r)^n - 1) / r)
 *
 * Clamped at 0 so a fully-paid loan never reports a negative balance.
 */
export function remainingBalance(
  principal: number,
  monthlyRate: number,
  termMonths: number,
  paymentsMade: number,
): number {
  if (paymentsMade <= 0) return principal;
  if (paymentsMade >= termMonths) return 0;
  const payment = monthlyPayment(principal, monthlyRate, termMonths);
  if (monthlyRate === 0) return Math.max(0, principal - payment * paymentsMade);
  const growth = Math.pow(1 + monthlyRate, paymentsMade);
  const balance = principal * growth - payment * ((growth - 1) / monthlyRate);
  return Math.max(0, balance);
}
