import { deriveBudgetTotals } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, PercentInput, SectionTitle } from "../ui";

export default function ExpensesSection() {
  const { assumptions: a, setAssumptions, budget } = useStore();
  const totals = deriveBudgetTotals(budget);

  return (
    <Card title="Expenses">
      <SectionTitle>Monthly spending, excluding housing</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Fixed costs"
          hint="Bills that are the same every month: insurance, car payment, loan payments, subscriptions."
        >
          <MoneyInput
            value={totals.fixed}
            disabled
            onChange={(v) => setAssumptions({ expenses: { fixedMonthly: v } })}
          />
        </Field>
        <Field
          label="Variable costs"
          hint="Spending that moves around: groceries, dining, shopping, travel."
        >
          <MoneyInput
            value={totals.variable}
            disabled
            onChange={(v) =>
              setAssumptions({ expenses: { variableMonthly: v } })
            }
          />
        </Field>
        <Field
          label="Current rent"
          hint="Tracked separately because it disappears the month you buy, replaced by the mortgage payment."
        >
          <MoneyInput
            value={totals.rent}
            disabled
            onChange={(v) =>
              setAssumptions({ expenses: { currentRentMonthly: v } })
            }
          />
        </Field>
        <Field
          label="Annual inflation"
          hint="How fast expenses and rent grow each year. Applied to everything except the mortgage payment, which is fixed."
        >
          <PercentInput
            value={a.expenses.inflationAnnual}
            onChange={(v) =>
              setAssumptions({ expenses: { inflationAnnual: v } })
            }
          />
        </Field>
      </div>
    </Card>
  );
}
