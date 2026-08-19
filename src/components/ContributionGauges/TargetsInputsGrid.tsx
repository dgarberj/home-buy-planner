import { useTranslation } from "react-i18next";
import { IRA_LIMITS } from "../../data/contributionLimits";
import { type FilingStatus } from "../../data/taxBrackets";
import { money } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Field, MoneyInput, PercentInputWithMonthly, Select } from "../ui";
import {
  FILING_STATUS_LABEL,
  HSA_COVERAGE_LABEL,
  filingStatusLabel,
  hsaCoverageLabel,
  type ContributionFigures,
} from "./TargetsCard.calc";

/**
 * The editable settings grid at the bottom of the targets card: salary,
 * filing status, and the per-plan contribution fields.
 */
export default function TargetsInputsGrid({
  figures,
  assumptions,
  setAssumptions,
  setSettings,
}: {
  figures: ContributionFigures;
  assumptions: ReturnType<typeof useProjections>["assumptions"];
  setAssumptions: ReturnType<typeof useStore.getState>["setAssumptions"];
  setSettings: ReturnType<typeof useStore.getState>["setSettings"];
}) {
  const { t } = useTranslation();
  const {
    gross,
    filingStatus,
    hasK401Plan,
    hasHsaPlan,
    hasIraPlan,
    hsaCoverageTier,
  } = figures;

  return (
    <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
      <Field
        label={t(
          "contributionGauges.targets.grossSalary.label",
          "Gross salary",
        )}
        hint={t(
          "contributionGauges.targets.grossSalary.hint",
          "Base salary before bonus. The 401(k) target is a share of this.",
        )}
      >
        <MoneyInput
          value={gross}
          step={1000}
          onChange={(v) => setSettings({ grossAnnualSalary: v })}
        />
      </Field>
      <Field
        label={t(
          "contributionGauges.targets.filingStatusField.label",
          "Filing status",
        )}
        hint={t(
          "contributionGauges.targets.filingStatusField.hint",
          "Single or married filing jointly. Used only to look up your federal marginal tax rate below — it does not change your take-home pay elsewhere in the app.",
        )}
      >
        <Select
          value={filingStatus}
          onChange={(v) => setSettings({ filingStatus: v as FilingStatus })}
        >
          {(Object.keys(FILING_STATUS_LABEL) as FilingStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {filingStatusLabel(t, status)}
              </option>
            ),
          )}
        </Select>
      </Field>
      {hasK401Plan && (
        <>
          <Field
            label={t(
              "contributionGauges.targets.k401Field.label",
              "401(k) contribution",
            )}
            hint={t(
              "contributionGauges.targets.k401Field.hint",
              "Share of gross salary. Comes out pre-tax and lands in the retirement balance in this model.",
            )}
          >
            <PercentInputWithMonthly
              value={assumptions.retirement.k401Pct}
              annualBasis={gross}
              onChange={(v) => setAssumptions({ retirement: { k401Pct: v } })}
            />
          </Field>
          <Field
            label={t(
              "contributionGauges.targets.employerMatchField.label",
              "Employer match / month",
            )}
            hint={t(
              "contributionGauges.targets.employerMatchField.hint",
              "The regular monthly match only. The January lump is separate.",
            )}
          >
            <MoneyInput
              value={assumptions.retirement.employerMatchMonthly}
              onChange={(v) =>
                setAssumptions({
                  retirement: { employerMatchMonthly: v },
                })
              }
            />
          </Field>
          <Field
            label={t(
              "contributionGauges.targets.employerLumpField.label",
              "Employer January lump",
            )}
            hint={t(
              "contributionGauges.targets.employerLumpField.hint",
              "Once-a-year employer 401(k) money: a profit-share contribution. Free money that is easy to forget precisely because it arrives once.",
            )}
          >
            <MoneyInput
              step={100}
              value={assumptions.retirement.employerAnnualLump}
              onChange={(v) =>
                setAssumptions({ retirement: { employerAnnualLump: v } })
              }
            />
          </Field>
        </>
      )}
      {hasHsaPlan && (
        <>
          <Field
            label={t(
              "contributionGauges.targets.hsaCoverageField.label",
              "HSA coverage",
            )}
            hint={t(
              "contributionGauges.targets.hsaCoverageField.hint",
              "Self-only vs. family HDHP coverage sets the IRS contribution ceiling above -- not filing status. A married couple can carry self-only coverage, and vice versa.",
            )}
          >
            <Select
              value={hsaCoverageTier}
              onChange={(v) =>
                setAssumptions({
                  retirement: {
                    hsaCoverageTier: v as "selfOnly" | "family",
                  },
                })
              }
            >
              {(
                Object.keys(HSA_COVERAGE_LABEL) as ("selfOnly" | "family")[]
              ).map((tier) => (
                <option key={tier} value={tier}>
                  {hsaCoverageLabel(t, tier)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t(
              "contributionGauges.targets.hsaMonthlyField.label",
              "HSA contribution / month",
            )}
            hint={t(
              "contributionGauges.targets.hsaMonthlyField.hint",
              "Comes out pre-tax too, on top of any employer bonus, and lands in the retirement balance in this model.",
            )}
          >
            <MoneyInput
              value={assumptions.retirement.hsaMonthly}
              onChange={(v) =>
                setAssumptions({ retirement: { hsaMonthly: v } })
              }
            />
          </Field>
          <Field
            label={t(
              "contributionGauges.targets.hsaBonusField.label",
              "Employer HSA one-time bonus",
            )}
            hint={t(
              "contributionGauges.targets.hsaBonusField.hint",
              "A once-a-year employer seed into the HSA, if any. Counts toward the IRS limit alongside your own money, so it reduces -- not adds to -- your own room.",
            )}
          >
            <MoneyInput
              step={100}
              value={assumptions.retirement.employerHsaAnnualBonus}
              onChange={(v) =>
                setAssumptions({
                  retirement: { employerHsaAnnualBonus: v },
                })
              }
            />
          </Field>
        </>
      )}
      {hasIraPlan && (
        <Field
          label={t(
            "contributionGauges.targets.iraMonthlyField.label",
            "Roth IRA contribution / month",
          )}
          hint={t(
            "contributionGauges.targets.iraMonthlyField.hint",
            "Post-tax. 2026 limit is {{limit}}/yr, phased down to zero above the income threshold -- see the gauge above for your live room.",
            { limit: money(IRA_LIMITS.contribution2026) },
          )}
        >
          <MoneyInput
            value={assumptions.retirement.iraMonthly}
            onChange={(v) => setAssumptions({ retirement: { iraMonthly: v } })}
          />
        </Field>
      )}
    </div>
  );
}
