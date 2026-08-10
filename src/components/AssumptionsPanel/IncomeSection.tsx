import { deriveBudgetTotals } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, PercentInput, SectionTitle } from "../ui";

export default function IncomeSection() {
  const { assumptions: a, setAssumptions, budget, settings } = useStore();
  const fromBudget = settings.useBudgetTotals;
  const totals = deriveBudgetTotals(budget);

  return (
    <Card title="Income">
      <SectionTitle>Take-home pay</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Monthly take-home (combined)"
          hint="What actually lands in the bank each month after tax and deductions, for both of you together."
        >
          <MoneyInput
            value={fromBudget ? totals.income : a.income.monthlyTakeHome}
            disabled={fromBudget}
            onChange={(v) => setAssumptions({ income: { monthlyTakeHome: v } })}
          />
        </Field>
        <Field
          label="Annual raise"
          hint="Average pay rise per year. 3% is a common long-run assumption; use 0% to be deliberately pessimistic."
        >
          <PercentInput
            value={a.income.growthAnnual}
            onChange={(v) => setAssumptions({ income: { growthAnnual: v } })}
          />
        </Field>
      </div>
      {fromBudget && (
        <p className="mt-3 text-xs text-slate-500">
          Added up from {budget.filter((b) => b.type === "income").length}{" "}
          income line items in the Budget tab.
        </p>
      )}
    </Card>
  );
}
