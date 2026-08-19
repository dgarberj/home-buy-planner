import { useTranslation } from "react-i18next";
import { deriveBudgetTotals } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, PercentInput, SectionTitle } from "../ui";

export default function ExpensesSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, budget } = useStore();
  const totals = deriveBudgetTotals(budget);

  return (
    <Card title={t("assumptions.expenses.title", "Expenses")}>
      <SectionTitle>
        {t(
          "assumptions.expenses.subtitle",
          "Monthly spending, excluding housing",
        )}
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("assumptions.expenses.fixed.label", "Fixed costs")}
          hint={t(
            "assumptions.expenses.fixed.hint",
            "Bills that are the same every month: insurance, car payment, loan payments, subscriptions.",
          )}
        >
          <MoneyInput
            value={totals.fixed}
            disabled
            onChange={(v) => setAssumptions({ expenses: { fixedMonthly: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.expenses.variable.label", "Variable costs")}
          hint={t(
            "assumptions.expenses.variable.hint",
            "Spending that moves around: groceries, dining, shopping, travel.",
          )}
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
          label={t("assumptions.expenses.rent.label", "Current rent")}
          hint={t(
            "assumptions.expenses.rent.hint",
            "Tracked separately because it disappears the month you buy, replaced by the mortgage payment.",
          )}
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
          label={t("assumptions.expenses.inflation.label", "Annual inflation")}
          hint={t(
            "assumptions.expenses.inflation.hint",
            "How fast expenses and rent grow each year. Applied to everything except the mortgage payment, which is fixed.",
          )}
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
