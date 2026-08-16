import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  budgetSurplus,
  deriveBudgetTotals,
  deriveObligations,
  isObligation,
} from "../../lib/derive";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Button, Card } from "../ui";
import BudgetDrawer from "./BudgetDrawer";

/**
 * The monthly budget: every recurring dollar in and out, editable in place.
 *
 * This is the panel that gets touched most often, so it is designed for fast
 * scanning and editing -- grouped by kind, running totals per group, and a
 * single "left over each month" number that answers the real question. The
 * editable line items live in BudgetDrawer, opened from here.
 */

export default function BudgetPanel() {
  const { t } = useTranslation();
  const { budget, addBudgetItem } = useStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      title={t("budgetPanel.title", "Monthly budget")}
      subtitle={t(
        "budgetPanel.subtitle",
        "Every recurring dollar in and out. Edit any number directly — the projection updates as you type.",
      )}
      right={
        <div className="text-right">
          <div className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("budgetPanel.leftOverEachMonth", "Left over each month")}
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
      <div>
        <Button
          size="md"
          variant="primary"
          onClick={() => setIsDrawerOpen(true)}
        >
          {t("budgetPanel.editLineItems", "Edit your line items →")}
        </Button>
      </div>
      <BudgetDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        budget={budget}
        totals={totals}
        rentItems={rentItems}
        obligationItems={obligationItems}
        obligationsTotal={obligationsTotal}
        addBudgetItem={addBudgetItem}
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>
          {t("budgetPanel.in", "In")}{" "}
          <strong className="tabular-nums text-emerald-700">
            {money(totals.income)}
          </strong>
        </span>
        <span aria-hidden>−</span>
        <span>
          {t("budgetPanel.out", "Out")}{" "}
          <strong className="tabular-nums text-slate-900">
            {money(
              totals.fixed + totals.variable + totals.rent + obligationsTotal,
            )}
          </strong>
        </span>
        <span aria-hidden>=</span>
        <span>
          {t("budgetPanel.leftOver", "Left over")}{" "}
          <strong
            className={`tabular-nums ${surplus < 0 ? "text-red-600" : "text-emerald-700"}`}
          >
            {money(surplus)}
          </strong>
        </span>
        <span className="text-xs text-slate-400">
          {t(
            "budgetPanel.retirementNote",
            "Retirement contributions come out of this — set them in Assumptions.",
          )}
        </span>
      </div>
    </Card>
  );
}
