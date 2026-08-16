import type { TFunction } from "i18next";

/**
Display helpers. Nothing here affects the model -- formatting only.

Currency/date figures always stay `en-US` regardless of UI language (this is
a US-market tool), so most helpers below take no `t`. `ordinal()` and
`duration()` are the exception -- they hand-roll English words ("1st",
"2 months") that would otherwise leak into an otherwise-Spanish sentence, so
they take a `TFunction` and route through the catalog.
*/

export const money = (n: number, digits = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
"1st", "2nd", "3rd", "94th", "93rd" -- for percentile labels.
*/
export function ordinal(n: number, t: TFunction): string {
  const rounded = Math.round(n);
  const module100 = rounded % 100;
  let suffix: string;
  if (module100 >= 11 && module100 <= 13) {
    suffix = "th";
  } else {
    switch (rounded % 10) {
      case 1: {
        suffix = "st";
        break;
      }
      case 2: {
        suffix = "nd";
        break;
      }
      case 3: {
        suffix = "rd";
        break;
      }
      default: {
        suffix = "th";
      }
    }
  }
  return t("format.ordinal", `${rounded}${suffix}`, { n: rounded });
}

/**
Compact form for chart axes: $1.2M, $340k, -$18k.
*/
export function moneyShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/**
0.035 -> "3.5%"
*/
export const pct = (decimal: number, digits = 1) =>
  `${(decimal * 100).toFixed(digits)}%`;

/**
Month 1 is the start date itself.
*/
export function monthToDate(startDate: string, month: number): Date {
  const [y, m] = startDate.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1 + (month - 1), 1);
}

/**
"Oct 2027"
*/
export function monthLabel(startDate: string, month: number): string {
  return monthToDate(startDate, month).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
"month 14 (Oct 2027)" -- the phrasing used in the plain-English callouts.
*/
export function monthPhrase(startDate: string, month: number): string {
  return `month ${month} (${monthLabel(startDate, month)})`;
}

/**
"1 year 2 months"
*/
export function duration(months: number, t: TFunction): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) {
    parts.push(t("format.years", `${y} year${y === 1 ? "" : "s"}`, { count: y }));
  }
  if (m) {
    parts.push(t("format.months", `${m} month${m === 1 ? "" : "s"}`, { count: m }));
  }
  return parts.length > 0 ? parts.join(" ") : t("format.zeroMonths", "0 months");
}
