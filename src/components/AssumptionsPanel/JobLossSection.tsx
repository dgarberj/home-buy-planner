import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { Card, Field, NumberInput, PercentInput, Toggle } from "../ui";

export default function JobLossSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, settings } = useStore();

  return (
    <Card
      title={t("assumptions.jobLoss.title", "If someone loses their job")}
      subtitle={t(
        "assumptions.jobLoss.subtitle",
        "These apply only to scenarios where the job-loss switch is on.",
      )}
      className="lg:col-span-2"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label={t("assumptions.jobLoss.startMonth.label", "Starts in month")}
          hint={t(
            "assumptions.jobLoss.startMonth.hint",
            "How many months from now the income stops. Each scenario can override this.",
          )}
        >
          <NumberInput
            value={a.jobLoss.startMonth}
            min={1}
            max={settings.horizonMonths}
            onChange={(v) => setAssumptions({ jobLoss: { startMonth: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.jobLoss.duration.label", "Lasts (months)")}
          hint={t(
            "assumptions.jobLoss.duration.hint",
            "How long until income is back to normal.",
          )}
        >
          <NumberInput
            value={a.jobLoss.durationMonths}
            min={0}
            max={settings.horizonMonths}
            onChange={(v) => setAssumptions({ jobLoss: { durationMonths: v } })}
          />
        </Field>
        <Field
          label={t(
            "assumptions.jobLoss.incomeReplacement.label",
            "Income still coming in",
          )}
          hint={t(
            "assumptions.jobLoss.incomeReplacement.hint",
            "Share of normal take-home you'd still have: severance, unemployment, and the other salary. 0% means all income stops.",
          )}
        >
          <PercentInput
            value={a.jobLoss.incomeReplacementPct}
            step={5}
            onChange={(v) =>
              setAssumptions({ jobLoss: { incomeReplacementPct: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "assumptions.jobLoss.expenseCut.label",
            "Spending cut back by",
          )}
          hint={t(
            "assumptions.jobLoss.expenseCut.hint",
            "How much you'd trim from normal spending while the income is down. Housing is never cut — rent and mortgage still have to be paid.",
          )}
        >
          <PercentInput
            value={a.jobLoss.expenseCutPct}
            step={5}
            onChange={(v) => setAssumptions({ jobLoss: { expenseCutPct: v } })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Toggle
          checked={a.jobLoss.pauseRetirementContributions}
          onChange={(v) =>
            setAssumptions({ jobLoss: { pauseRetirementContributions: v } })
          }
          label={t(
            "assumptions.jobLoss.pauseContributions.label",
            "Pause retirement contributions during the gap",
          )}
          hint={t(
            "assumptions.jobLoss.pauseContributions.hint",
            "Both your contribution and the employer match stop, since they come with the job. This frees up cash but slows retirement growth.",
          )}
        />
      </div>
    </Card>
  );
}
