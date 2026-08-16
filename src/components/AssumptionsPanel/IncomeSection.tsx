import { useTranslation } from "react-i18next";
import { deriveBudgetTotals } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, PercentInput, SectionTitle } from "../ui";

export default function IncomeSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, budget } = useStore();
  const totals = deriveBudgetTotals(budget);

  return (
    <Card title={t("assumptions.income.title", "Income")}>
      <SectionTitle>
        {t("assumptions.income.takeHomePay", "Take-home pay")}
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t(
            "assumptions.income.monthlyTakeHome.label",
            "Monthly take-home (combined)",
          )}
          hint={t(
            "assumptions.income.monthlyTakeHome.hint",
            "What actually lands in the bank each month after tax and deductions, for both of you together.",
          )}
        >
          <MoneyInput
            value={totals.income}
            disabled
            onChange={(v) => setAssumptions({ income: { monthlyTakeHome: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.income.annualRaise.label", "Annual raise")}
          hint={t(
            "assumptions.income.annualRaise.hint",
            "Average pay rise per year. 3% is a common long-run assumption; use 0% to be deliberately pessimistic.",
          )}
        >
          <PercentInput
            value={a.income.growthAnnual}
            onChange={(v) => setAssumptions({ income: { growthAnnual: v } })}
          />
        </Field>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {t(
          "assumptions.income.addedUpFrom",
          "Added up from {{count}} income line items in the Budget tab.",
          { count: budget.filter((b) => b.type === "income").length },
        )}
      </p>
    </Card>
  );
}
