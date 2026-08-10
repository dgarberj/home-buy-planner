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
  return (
    <Drawer open={open} onClose={onClose} title="Edit budget line items">
      <div className="grid gap-4">
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

      <div className="mt-4 grid gap-4">
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
    </Drawer>
  );
}
