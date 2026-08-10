import type { BudgetItem } from "../../model/types";
import { useStore } from "../../store/useStore";
import { DateInput, INLINE_INPUT, MoneyInput } from "../ui";

export default function BudgetRow({
  item,
  dated = false,
}: {
  item: BudgetItem;
  dated?: boolean;
}) {
  const { updateBudgetItem, removeBudgetItem } = useStore();

  return (
    <tr className="group border-b border-slate-100 last:border-0">
      <td className="py-1 pr-2">
        <input
          value={item.label}
          onChange={(event_) =>
            updateBudgetItem(item.id, { label: event_.target.value })
          }
          className={`${INLINE_INPUT} text-slate-900`}
        />
      </td>
      <td className="py-1 pr-2">
        <input
          value={item.category}
          onChange={(event_) =>
            updateBudgetItem(item.id, { category: event_.target.value })
          }
          className={`${INLINE_INPUT} text-slate-500`}
        />
      </td>
      <td className="py-1 pr-2">
        <MoneyInput
          variant="inline"
          align="right"
          step={10}
          value={item.amount}
          onChange={(amount) => updateBudgetItem(item.id, { amount })}
        />
      </td>
      {dated && (
        <>
          <td className="py-1 pr-2">
            <DateInput
              type="month"
              variant="inline"
              value={item.startsOn ?? ""}
              onChange={(v) =>
                updateBudgetItem(item.id, { startsOn: v || undefined })
              }
            />
          </td>
          <td className="py-1 pr-2">
            <DateInput
              type="month"
              variant="inline"
              value={item.endsOn ?? ""}
              onChange={(v) =>
                updateBudgetItem(item.id, { endsOn: v || undefined })
              }
            />
          </td>
        </>
      )}
      <td className="py-1 pl-1 text-right">
        <button
          type="button"
          onClick={() => removeBudgetItem(item.id)}
          title={`Remove ${item.label}`}
          className="rounded-md px-2 py-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
