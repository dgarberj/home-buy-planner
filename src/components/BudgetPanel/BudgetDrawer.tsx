import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { BudgetItem } from "../../model/types";
import { isObligation, type deriveBudgetTotals } from "../../lib/derive";
import { Drawer } from "../ui";
import BudgetGroup from "./BudgetGroup";

/**
 * The editable budget line items, moved out of the main content pane into a
 * drawer since this is data entry that's only touched occasionally -- the
 * "left over each month" summary in BudgetPanel/index.tsx is what's worth
 * seeing at a glance.
 */

function groups(
  t: TFunction,
): { type: BudgetItem["type"]; title: string; hint: string; accent: string }[] {
  return [
    {
      type: "income",
      title: t("budgetPanel.groups.income.title", "Money in"),
      hint: t(
        "budgetPanel.groups.income.hint",
        "Take-home pay after tax and deductions — what actually arrives in the bank.",
      ),
      accent: "text-emerald-700",
    },
    {
      type: "fixed",
      title: t("budgetPanel.groups.fixed.title", "Fixed costs"),
      hint: t(
        "budgetPanel.groups.fixed.hint",
        "Same amount every month: rent, insurance, car and loan payments, subscriptions.",
      ),
      accent: "text-slate-700",
    },
    {
      type: "variable",
      title: t("budgetPanel.groups.variable.title", "Variable costs"),
      hint: t(
        "budgetPanel.groups.variable.hint",
        "Spending that moves around month to month: groceries, dining, shopping, travel.",
      ),
      accent: "text-slate-700",
    },
  ];
}

export default function BudgetDrawer({
  open,
  onClose,
  budget,
  totals,
  rentItems,
  obligationItems,
  obligationsTotal,
  addBudgetItem,
}: {
  open: boolean;
  onClose: () => void;
  budget: BudgetItem[];
  totals: ReturnType<typeof deriveBudgetTotals>;
  rentItems: BudgetItem[];
  obligationItems: BudgetItem[];
  obligationsTotal: number;
  addBudgetItem: (item?: Partial<BudgetItem>) => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("budgetPanel.drawerTitle", "Edit budget line items")}
    >
      <div className="grid gap-4">
        {groups(t).map((g) => (
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

      <div className="mt-4 grid gap-4">
        <BudgetGroup
          title={t(
            "budgetPanel.groups.rent.title",
            "Rent (goes away when you buy)",
          )}
          hint={t(
            "budgetPanel.groups.rent.hint",
            "Rent is tracked on its own because it is replaced by the mortgage payment the month you buy. Everything else carries on.",
          )}
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
          addLabel={t("budgetPanel.groups.commitments.addLabel", "+ Add commitment")}
          title={t(
            "budgetPanel.groups.commitments.title",
            "Commitments with an end date",
          )}
          hint={t(
            "budgetPanel.groups.commitments.hint",
            "A lease, a loan, or a court-ordered or contractual payment with a known end date. These are modelled differently from ordinary expenses: they never inflate, and they are NOT cut during a job loss — you cannot unilaterally stop paying a court-ordered obligation. The month one ends, cash flow steps up for good.",
          )}
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
    </Drawer>
  );
}
