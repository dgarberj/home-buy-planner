import { useTranslation } from "react-i18next";
import {
  HSA_LIMITS,
  IRA_LIMITS,
  K401_LIMITS,
  employeeHsaRoom,
} from "../../data/contributionLimits";
import { money } from "../../lib/format";
import { deriveStartingBalances } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import {
  Card,
  Field,
  MoneyInput,
  PercentInput,
  PercentInputWithMonthly,
  Toggle,
} from "../ui";

export default function RetirementSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, balances, settings } = useStore();
  const starting = deriveStartingBalances(balances);
  const gross = settings.grossAnnualSalary;
  // Not a user choice -- always derive from the newest Balances snapshot,
  // if one exists yet (starting.asOf is null before any snapshot is logged).
  const hasSnapshot = !!starting.asOf;

  return (
    <Card title={t("assumptions.retirement.title", "Retirement")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("assumptions.retirement.currentBalance.label", "Current balance")}
          hint={t(
            "assumptions.retirement.currentBalance.hint",
            "Total across all retirement accounts today: 401(k)s, IRAs, and so on.",
          )}
        >
          <MoneyInput
            value={
              hasSnapshot ? starting.retirement : a.retirement.currentBalance
            }
            disabled={hasSnapshot}
            step={1000}
            onChange={(v) =>
              setAssumptions({ retirement: { currentBalance: v } })
            }
          />
        </Field>
        <Field
          label={t("assumptions.retirement.annualReturn.label", "Annual return")}
          hint={t(
            "assumptions.retirement.annualReturn.hint",
            "Long-run average growth. 7% is a common stock-heavy assumption; drop it to 5% for a more cautious view.",
          )}
        >
          <PercentInput
            value={a.retirement.returnAnnual}
            onChange={(v) =>
              setAssumptions({ retirement: { returnAnnual: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "assumptions.retirement.k401.label",
            "401(k) contribution",
          )}
          hint={t(
            "assumptions.retirement.k401.hint",
            "Share of gross salary you elect into the 401(k) -- most plans run the election as a percentage of pay, not a flat dollar amount. Comes out of take-home cash. Elective-deferral limit for 2026 is {{limit}}/yr.",
            { limit: money(K401_LIMITS.employeeDeferral2026) },
          )}
        >
          <PercentInputWithMonthly
            value={a.retirement.k401Pct}
            annualBasis={gross}
            onChange={(v) => setAssumptions({ retirement: { k401Pct: v } })}
          />
        </Field>
        <Field
          label={t(
            "assumptions.retirement.hsa.label",
            "HSA contribution / month",
          )}
          hint={
            a.retirement.hsaCoverageTier === "selfOnly"
              ? t(
                  "assumptions.retirement.hsa.hintSelfOnly",
                  "What you put into the HSA each month, on top of any employer seed. Self-only limit for 2026 is {{limit}}/yr; your own room after the employer seed is {{room}}/yr.",
                  {
                    limit: money(HSA_LIMITS.selfOnly2026),
                    room: money(
                      employeeHsaRoom(
                        a.retirement.hsaCoverageTier,
                        a.retirement.employerHsaAnnualBonus,
                      ),
                    ),
                  },
                )
              : t(
                  "assumptions.retirement.hsa.hintFamily",
                  "What you put into the HSA each month, on top of any employer seed. Family limit for 2026 is {{limit}}/yr; your own room after the employer seed is {{room}}/yr.",
                  {
                    limit: money(HSA_LIMITS.family2026),
                    room: money(
                      employeeHsaRoom(
                        a.retirement.hsaCoverageTier,
                        a.retirement.employerHsaAnnualBonus,
                      ),
                    ),
                  },
                )
          }
        >
          <MoneyInput
            value={a.retirement.hsaMonthly}
            onChange={(v) => setAssumptions({ retirement: { hsaMonthly: v } })}
          />
        </Field>
        <Field
          label={t(
            "assumptions.retirement.employerMatch.label",
            "Employer match / month",
          )}
          hint={t(
            "assumptions.retirement.employerMatch.hint",
            "Free money from your employer. It grows the retirement balance but does not reduce your take-home pay.",
          )}
        >
          <MoneyInput
            value={a.retirement.employerMatchMonthly}
            onChange={(v) =>
              setAssumptions({ retirement: { employerMatchMonthly: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "assumptions.retirement.iraMonthly.label",
            "Roth IRA contribution / month",
          )}
          hint={t(
            "assumptions.retirement.iraMonthly.hint",
            "What you put into a Roth IRA each month. 2026 limit is {{limit}}/yr, phased down to zero above an income threshold -- see the contribution gauges for your live room.",
            { limit: money(IRA_LIMITS.contribution2026) },
          )}
        >
          <MoneyInput
            value={a.retirement.iraMonthly}
            onChange={(v) => setAssumptions({ retirement: { iraMonthly: v } })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Toggle
          checked={a.retirement.contributionsGrowWithIncome}
          onChange={(v) =>
            setAssumptions({
              retirement: { contributionsGrowWithIncome: v },
            })
          }
          label={t(
            "assumptions.retirement.growWithIncome.label",
            "Contributions grow with pay rises",
          )}
          hint={t(
            "assumptions.retirement.growWithIncome.hint",
            "Over five years this barely matters. Over thirty it matters enormously — a flat contribution becomes trivially small after decades of raises.",
          )}
        />
      </div>
    </Card>
  );
}
