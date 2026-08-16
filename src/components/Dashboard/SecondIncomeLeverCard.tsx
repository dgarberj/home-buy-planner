import { useTranslation } from "react-i18next";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Card, Toggle } from "../ui";

/**
The single biggest lever, switchable in place.
*/
export default function SecondIncomeLeverCard() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const settings = useStore((s) => s.settings);
  const setAssumptions = useStore((s) => s.setAssumptions);

  if (assumptions.secondIncome.monthlyTakeHome <= 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Toggle
          checked={assumptions.secondIncome.enabled}
          onChange={(v) => setAssumptions({ secondIncome: { enabled: v } })}
          label={
            <>
              <strong>{assumptions.secondIncome.label}</strong>{" "}
              {t(
                "dashboard.secondIncome.assumesPrefix",
                "— every figure below assumes this",
              )}{" "}
              {assumptions.secondIncome.enabled
                ? t("dashboard.secondIncome.happens", "happens")
                : t("dashboard.secondIncome.doesNotHappen", "does not happen")}
            </>
          }
          hint={t(
            "dashboard.secondIncome.hint",
            "Flip it to see the whole plan recalculate. Off is the safer baseline; on is what you are planning for.",
          )}
        />
        <span className="text-xs text-slate-500">
          {t(
            "dashboard.secondIncome.summary",
            "{{amount}}/mo from {{date}}, less {{childcare}} of childcare",
            {
              amount: money(assumptions.secondIncome.monthlyTakeHome),
              date: monthLabel(
                settings.startDate,
                assumptions.secondIncome.startMonth,
              ),
              childcare: money(
                assumptions.secondIncome.additionalCostsMonthly,
              ),
            },
          )}
        </span>
      </div>
    </Card>
  );
}
