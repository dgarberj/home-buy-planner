import { useTranslation } from "react-i18next";
import type { BudgetItem } from "../../model/types";
import { money } from "../../lib/format";
import { Button, InfoTip } from "../ui";
import BudgetRow from "./BudgetRow";

export default function BudgetGroup({
  title,
  hint,
  items,
  total,
  onAdd,
  dated = false,
  addLabel,
}: {
  title: string;
  hint: string;
  items: BudgetItem[];
  total: number;
  onAdd: () => void;
  dated?: boolean;
  addLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        <h4 className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
          <InfoTip text={hint} />
        </h4>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {money(total)}
          <span className="ml-1 text-xs font-normal text-slate-400">
            {t("budgetPanel.perMonthSuffix", "/mo")}
          </span>
        </span>
      </div>
      <div className={`px-2 py-1 ${dated ? "overflow-x-auto" : ""}`}>
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-400">
            {t("budgetPanel.groupEmpty", "Nothing here yet.")}
          </p>
        ) : (
          <table
            className={`w-full table-fixed ${dated ? "min-w-[560px]" : ""}`}
          >
            <colgroup>
              {dated ? (
                <>
                  <col className="w-[30%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[6%]" />
                </>
              ) : (
                <>
                  <col className="w-[44%]" />
                  <col className="w-[26%]" />
                  <col className="w-[22%]" />
                  <col className="w-[8%]" />
                </>
              )}
            </colgroup>
            {dated && (
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-2 pb-1">
                    {t("budgetPanel.columns.what", "What")}
                  </th>
                  <th className="px-2 pb-1">
                    {t("budgetPanel.columns.category", "Category")}
                  </th>
                  <th className="px-2 pb-1 text-right">
                    {t("budgetPanel.columns.amount", "Amount")}
                  </th>
                  <th className="px-2 pb-1">
                    {t("budgetPanel.columns.starts", "Starts")}
                  </th>
                  <th className="px-2 pb-1">
                    {t("budgetPanel.columns.ends", "Ends")}
                  </th>
                  <th />
                </tr>
              </thead>
            )}
            <tbody>
              {items.map((item) => (
                <BudgetRow key={item.id} item={item} dated={dated} />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <Button size="sm" variant="ghost" onClick={onAdd}>
          {addLabel ?? t("budgetPanel.addLine", "+ Add line")}
        </Button>
      </div>
    </div>
  );
}
