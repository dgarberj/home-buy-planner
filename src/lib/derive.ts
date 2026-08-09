import type {
  Assumptions,
  BalanceSnapshot,
  BudgetItem,
  TimedObligation,
} from "../model/types";

/**
 * Roll the itemised budget up into the four totals the engine consumes.
 *
 * Rent is pulled out of the fixed total and tracked on its own, because it is
 * the one expense that disappears the month we buy a house.
 */
export interface BudgetTotals {
  income: number;
  fixed: number;
  variable: number;
  rent: number;
}

/**
 * A budget line with a start or end date is a commitment, not an ordinary
 * expense: it does not inflate and it cannot be cut in a crisis. Those lines
 * are pulled out of the totals and handled as obligations instead, so they are
 * never counted twice.
 */
export function isObligation(item: BudgetItem): boolean {
  return Boolean(item.startsOn || item.endsOn);
}

/**
Months between the projection start and an ISO "YYYY-MM", 1-based.
*/
export function monthIndexFor(startDate: string, isoMonth: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ty, tm] = isoMonth.split("-").map(Number);
  return ((ty ?? 0) - (sy ?? 0)) * 12 + ((tm ?? 1) - (sm ?? 1)) + 1;
}

/**
 * Convert dated budget lines into engine-ready obligations.
 * Anything before the projection starts is clamped to month 1; anything that
 * ended before it starts is dropped entirely.
 */
export function deriveObligations(
  items: BudgetItem[],
  startDate: string,
): TimedObligation[] {
  const out: TimedObligation[] = [];
  for (const item of items) {
    if (!isObligation(item)) continue;
    const startMonth = item.startsOn
      ? monthIndexFor(startDate, item.startsOn)
      : 1;
    const endMonth = item.endsOn ? monthIndexFor(startDate, item.endsOn) : null;
    // Already finished before the projection begins.
    if (endMonth !== null && endMonth < 1) continue;
    out.push({
      id: item.id,
      label: item.label,
      monthlyAmount: item.amount,
      startMonth: Math.max(1, startMonth),
      endMonth,
    });
  }
  return out;
}

export function deriveBudgetTotals(items: BudgetItem[]): BudgetTotals {
  const totals: BudgetTotals = { income: 0, fixed: 0, variable: 0, rent: 0 };
  for (const item of items) {
    // Dated lines are obligations; they are added back by the engine.
    if (isObligation(item)) continue;
    if (item.isRent) {
      totals.rent += item.amount;
      continue;
    }
    if (item.type === "income") totals.income += item.amount;
    else if (item.type === "fixed") totals.fixed += item.amount;
    else totals.variable += item.amount;
  }
  return totals;
}

/**
Money left over each month before any retirement contribution.
*/
export function budgetSurplus(totals: BudgetTotals): number {
  return totals.income - totals.fixed - totals.variable - totals.rent;
}

export interface StartingBalances {
  /**
  Checking + savings/HYSA -- the near-term buffer.
  */
  cash: number;
  /**
  Taxable brokerage -- the invested pool.
  */
  investments: number;
  /**
  cash + investments. What could be handed over at a closing table.
  */
  liquid: number;
  retirement: number;
  debt: number;
  asOf: string | null;
}

/**
 * The most recent balance snapshot becomes the model's starting point.
 * "Liquid" is checking + savings/HYSA + investments -- everything that could
 * actually be handed over at a closing table.
 */
export function deriveStartingBalances(
  snapshots: BalanceSnapshot[],
): StartingBalances {
  if (snapshots.length === 0) {
    return {
      cash: 0,
      investments: 0,
      liquid: 0,
      retirement: 0,
      debt: 0,
      asOf: null,
    };
  }
  const latest = snapshots.toSorted((a, b) => a.date.localeCompare(b.date))[
    snapshots.length - 1
  ]!;
  const cash = latest.checking + latest.savings;
  return {
    cash,
    investments: latest.investments,
    liquid: cash + latest.investments,
    retirement: latest.retirement,
    debt: latest.debt,
    asOf: latest.date,
  };
}

/**
 * Produce the Assumptions the engine should actually run with, given the user's
 * choice of whether the Budget and Balances tabs drive the numbers.
 *
 * Pure, and tested -- this is the seam where hand-entered assumptions and
 * real-world data meet, and it is easy to get silently wrong.
 */
export function resolveAssumptions(
  assumptions: Assumptions,
  budget: BudgetItem[],
  balances: BalanceSnapshot[],
  options: {
    useBudgetTotals: boolean;
    useLatestBalances: boolean;
    startDate: string;
  },
): Assumptions {
  let resolved = assumptions;

  // The engine needs to know which projection months are Januaries.
  const startCalendarMonth = Number(options.startDate.split("-", 2)[1] ?? 1);
  resolved = {
    ...resolved,
    income: { ...resolved.income, calendarStartMonth: startCalendarMonth },
  };

  if (options.useBudgetTotals) {
    const t = deriveBudgetTotals(budget);
    resolved = {
      ...resolved,
      income: { ...resolved.income, monthlyTakeHome: t.income },
      expenses: {
        ...resolved.expenses,
        fixedMonthly: t.fixed,
        variableMonthly: t.variable,
        currentRentMonthly: t.rent,
      },
      obligations: deriveObligations(budget, options.startDate),
    };
  }

  if (options.useLatestBalances) {
    const b = deriveStartingBalances(balances);
    if (b.asOf !== null) {
      resolved = {
        ...resolved,
        savings: {
          ...resolved.savings,
          cashBalance: b.cash,
          investmentBalance: b.investments,
        },
        retirement: { ...resolved.retirement, currentBalance: b.retirement },
      };
    }
  }

  return resolved;
}
