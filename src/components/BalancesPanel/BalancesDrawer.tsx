import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { BalanceSnapshot } from "../../model/types";
import { money } from "../../lib/format";
import {
  Button,
  DateInput,
  Drawer,
  InfoTip,
  NumberInput,
  Table,
  Td,
  Th,
} from "../ui";

/**
 * The editable balance-history table, moved out of the main content pane
 * into a drawer since this is data entry that's only touched occasionally --
 * the "Available for a house" summary in BalancesPanel/index.tsx is what's
 * worth seeing at a glance.
 */

function columns(t: TFunction) {
  return [
    {
      key: "checking",
      label: t("balancesPanel.columns.checking.label", "Checking"),
      hint: t(
        "balancesPanel.columns.checking.hint",
        "Everyday spending account.",
      ),
    },
    {
      key: "savings",
      label: t("balancesPanel.columns.savings.label", "Savings / HYSA"),
      hint: t(
        "balancesPanel.columns.savings.hint",
        "Cash set aside, including the house fund.",
      ),
    },
    {
      key: "investments",
      label: t("balancesPanel.columns.investments.label", "Investments"),
      hint: t(
        "balancesPanel.columns.investments.hint",
        "Taxable brokerage. Not retirement accounts.",
      ),
    },
    {
      key: "retirement",
      label: t("balancesPanel.columns.retirement.label", "Retirement"),
      hint: t(
        "balancesPanel.columns.retirement.hint",
        "All 401(k)s and IRAs combined.",
      ),
    },
    {
      key: "debt",
      label: t("balancesPanel.columns.debt.label", "Debt"),
      hint: t(
        "balancesPanel.columns.debt.hint",
        "Everything owed: student loans, car loans, credit cards. Tracked for context; the projection does not amortise it separately.",
      ),
    },
  ] as const;
}

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
  const { t } = useTranslation();
  const sorted = balances.toSorted((a, b) => a.date.localeCompare(b.date));
  const latestId = sorted.at(-1)?.id;
  const COLUMNS = columns(t);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("balancesPanel.drawerTitle", "Edit balance history")}
    >
      <Table minWidthClassName="min-w-[860px]">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <Th sticky className="bg-white pb-2 pr-3">
              {t("balancesPanel.columns.date", "Date")}
            </Th>
            {COLUMNS.map((c) => (
              <Th key={c.key} align="right" className="pb-2 pr-3">
                <span className="inline-flex items-center">
                  {c.label}
                  <InfoTip text={c.hint} placement="bottom" />
                </span>
              </Th>
            ))}
            <Th align="right" className="pb-2 pr-3">
              {t("balancesPanel.columns.net", "Net")}
            </Th>
            <Th />
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
            const rowTint = isLatest ? "bg-blue-50/40" : "";
            return (
              <tr
                key={row.id}
                className={`group border-b border-slate-100 last:border-0 ${rowTint}`}
              >
                <Td sticky className={`py-1 pr-3 ${rowTint || "bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <DateInput
                      variant="inline"
                      value={row.date}
                      onChange={(v) => updateBalance(row.id, { date: v })}
                    />
                    {isLatest && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {t("balancesPanel.startBadge", "Start")}
                      </span>
                    )}
                  </div>
                </Td>
                {COLUMNS.map((c) => (
                  <Td key={c.key} className="py-1 pr-3">
                    <NumberInput
                      variant="inline"
                      align="right"
                      step={100}
                      value={row[c.key]}
                      onChange={(v) => updateBalance(row.id, { [c.key]: v })}
                    />
                  </Td>
                ))}
                <Td
                  align="right"
                  className="py-1 pr-3 text-sm font-semibold tabular-nums text-slate-900"
                >
                  {money(net)}
                </Td>
                <Td align="right" className="py-1">
                  <button
                    type="button"
                    onClick={() => removeBalance(row.id)}
                    title={t("balancesPanel.removeSnapshot", "Remove snapshot")}
                    className="rounded-md px-2 py-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="mt-3">
        <Button size="sm" variant="ghost" onClick={() => addBalance()}>
          {t("balancesPanel.addSnapshot", "+ Add snapshot")}
        </Button>
      </div>
    </Drawer>
  );
}
