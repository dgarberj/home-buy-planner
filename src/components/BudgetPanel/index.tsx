import { useMemo } from "react";
import type { BudgetItem } from "../../model/types";
import {
  budgetSurplus,
  deriveBudgetTotals,
  deriveObligations,
  isObligation,
} from "../../lib/derive";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card } from "../ui";
import BudgetGroup from "./BudgetGroup";

/**
 * The monthly budget: every recurring dollar in and out, editable in place.
 *
 * This is the panel that gets touched most often, so it is designed for fast
 * scanning and editing -- grouped by kind, running totals per group, and a
 * single "left over each month" number that answers the real question.
 */

const GROUPS: {
  type: BudgetItem["type"];
  title: string;
  hint: string;
  accent: string;
}[] = [
  {
    type: "income",
    title: "Money in",
    hint: "Take-home pay after tax and deductions — what actually arrives in the bank.",
    accent: "text-emerald-700",
  },
  {
    type: "fixed",
    title: "Fixed costs",
    hint: "Same amount every month: rent, insurance, car and loan payments, subscriptions.",
    accent: "text-slate-700",
  },
  {
    type: "variable",
    title: "Variable costs",
    hint: "Spending that moves around month to month: groceries, dining, shopping, travel.",
    accent: "text-slate-700",
  },
];

export default function BudgetPanel() {
  const { budget, addBudgetItem } = useStore();
  const startDate = useStore((s) => s.settings.startDate);

  const totals = useMemo(() => deriveBudgetTotals(budget), [budget]);
  const rentItems = budget.filter((b) => b.isRent && !isObligation(b));
  const obligationItems = budget.filter((b) => isObligation(b));
  // Only what is due right now counts towards this month's surplus.
  const obligationsTotal = useMemo(
    () =>
      deriveObligations(budget, startDate)
        .filter(
          (o) => o.startMonth <= 1 && (o.endMonth === null || o.endMonth >= 1),
        )
        .reduce((sum, o) => sum + o.monthlyAmount, 0),
    [budget, startDate],
  );
  const surplus = budgetSurplus(totals) - obligationsTotal;

  return (
    <Card
      title="Monthly budget"
      subtitle="Every recurring dollar in and out. Edit any number directly — the projection updates as you type."
      right={
        <div className="text-right">
          <div className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-slate-500">
            Left over each month
          </div>
          <div
            className={`whitespace-nowrap text-2xl font-semibold tabular-nums ${
              surplus < 0 ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {money(surplus)}
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <BudgetGroup
            key={g.type}
            title={g.title}
            hint={g.hint}
            items={budget.filter(
              (b) => b.type === g.type && !b.isRent && !isObligation(b),
            )}
            total={totals[g.type]}
            onAdd={() => addBudgetItem({ type: g.type, label: "New item" })}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BudgetGroup
          title="Rent (goes away when you buy)"
          hint="Rent is tracked on its own because it is replaced by the mortgage payment the month you buy. Everything else carries on."
          items={rentItems}
          total={totals.rent}
          onAdd={() =>
            addBudgetItem({
              type: "fixed",
              label: "Rent",
              category: "Housing",
              isRent: true,
            })
          }
        />
        <BudgetGroup
          dated
          addLabel="+ Add commitment"
          title="Commitments with an end date"
          hint="A lease, a loan, or a court-ordered or contractual payment with a known end date. These are modelled differently from ordinary expenses: they never inflate, and they are NOT cut during a job loss — you cannot unilaterally stop paying a court-ordered obligation. The month one ends, cash flow steps up for good."
          items={obligationItems}
          total={obligationsTotal}
          onAdd={() => {
            const fiveYearsOut = new Date();
            fiveYearsOut.setFullYear(fiveYearsOut.getFullYear() + 5);
            addBudgetItem({
              type: "fixed",
              label: "New commitment",
              category: "Family",
              endsOn: fiveYearsOut.toISOString().slice(0, 7),
            });
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>
          In{" "}
          <strong className="tabular-nums text-emerald-700">
            {money(totals.income)}
          </strong>
        </span>
        <span aria-hidden>−</span>
        <span>
          Out{" "}
          <strong className="tabular-nums text-slate-900">
            {money(
              totals.fixed + totals.variable + totals.rent + obligationsTotal,
            )}
          </strong>
        </span>
        <span aria-hidden>=</span>
        <span>
          Left over{" "}
          <strong
            className={`tabular-nums ${surplus < 0 ? "text-red-600" : "text-emerald-700"}`}
          >
            {money(surplus)}
          </strong>
        </span>
        <span className="text-xs text-slate-400">
          Retirement contributions come out of this — set them in Assumptions.
        </span>
      </div>
    </Card>
  );
}
