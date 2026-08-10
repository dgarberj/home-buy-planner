import type { BalanceSnapshot } from "../../model/types";
import { money } from "../../lib/format";
import { Button, DateInput, Drawer, InfoTip, NumberInput } from "../ui";

/**
 * The editable balance-history table, moved out of the main content pane
 * into a drawer since this is data entry that's only touched occasionally --
 * the "Available for a house" summary in BalancesPanel/index.tsx is what's
 * worth seeing at a glance.
 */

const COLUMNS = [
  { key: "checking", label: "Checking", hint: "Everyday spending account." },
  {
    key: "savings",
    label: "Savings / HYSA",
    hint: "Cash set aside, including the house fund.",
  },
  {
    key: "investments",
    label: "Investments",
    hint: "Taxable brokerage. Not retirement accounts.",
  },
  {
    key: "retirement",
    label: "Retirement",
    hint: "All 401(k)s and IRAs combined.",
  },
  {
    key: "debt",
    label: "Debt",
    hint: "Everything owed: student loans, car loans, credit cards. Tracked for context; the projection does not amortise it separately.",
  },
] as const;

export default function BalancesDrawer({
  open,
  onClose,
  balances,
  addBalance,
  updateBalance,
  removeBalance,
}: {
  open: boolean;
  onClose: () => void;
  balances: BalanceSnapshot[];
  addBalance: (snapshot?: Partial<BalanceSnapshot>) => void;
  updateBalance: (id: string, patch: Partial<BalanceSnapshot>) => void;
  removeBalance: (id: string) => void;
}) {
  const sorted = balances.toSorted((a, b) => a.date.localeCompare(b.date));
  const latestId = sorted.at(-1)?.id;

  return (
    <Drawer open={open} onClose={onClose} title="Edit balance history">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <span className="inline-flex items-center">
                    {c.label}
                    <InfoTip text={c.hint} placement="bottom" />
                  </span>
                </th>
              ))}
              <th className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Net
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const net =
                row.checking +
                row.savings +
                row.investments +
                row.retirement -
                row.debt;
              const isLatest = row.id === latestId;
              return (
                <tr
                  key={row.id}
                  className={`group border-b border-slate-100 last:border-0 ${
                    isLatest ? "bg-blue-50/40" : ""
                  }`}
                >
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-2">
                      <DateInput
                        variant="inline"
                        value={row.date}
                        onChange={(v) => updateBalance(row.id, { date: v })}
                      />
                      {isLatest && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          Start
                        </span>
                      )}
                    </div>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="py-1 pr-3">
                      <NumberInput
                        variant="inline"
                        align="right"
                        step={100}
                        value={row[c.key]}
                        onChange={(v) => updateBalance(row.id, { [c.key]: v })}
                      />
                    </td>
                  ))}
                  <td className="py-1 pr-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {money(net)}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeBalance(row.id)}
                      title="Remove snapshot"
                      className="rounded-md px-2 py-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Button size="sm" variant="ghost" onClick={() => addBalance()}>
          + Add snapshot
        </Button>
      </div>
    </Drawer>
  );
}
