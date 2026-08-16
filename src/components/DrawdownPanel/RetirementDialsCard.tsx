import { useTranslation } from "react-i18next";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import {
  Card,
  Field,
  MoneyInput,
  NumberInput,
  PercentInput,
  Toggle,
} from "../ui";

export default function RetirementDialsCard() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const d = assumptions.drawdown;

  return (
    <Card
      title={t("drawdownPanel.dials.title", "Retirement plan")}
      subtitle={t(
        "drawdownPanel.dials.subtitle",
        "How retirement is expected to go. These are the dials behind every number below.",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label={t("drawdownPanel.dials.retirementAge.label", "Retire at age")}
          hint={t(
            "drawdownPanel.dials.retirementAge.hint",
            "When the paycheques stop. Has to fall inside the projection window to be modelled.",
          )}
        >
          <NumberInput
            value={d.retirementAge}
            min={40}
            max={80}
            onChange={(v) => setAssumptions({ drawdown: { retirementAge: v } })}
          />
        </Field>
        <Field
          label={t(
            "drawdownPanel.dials.desiredSpend.label",
            "Monthly spending in retirement",
          )}
          hint={t(
            "drawdownPanel.dials.desiredSpend.hint",
            "Total spending you want to support, in TODAY's money. The model inflates it to the retirement year for you. Include housing, healthcare and everything else.",
          )}
        >
          <MoneyInput
            value={d.desiredMonthlySpendToday}
            step={250}
            onChange={(v) =>
              setAssumptions({ drawdown: { desiredMonthlySpendToday: v } })
            }
          />
        </Field>
        <Field
          label={t("drawdownPanel.dials.withdrawalRate.label", "Withdrawal rate")}
          hint={t(
            "drawdownPanel.dials.withdrawalRate.hint",
            "The share of the pot you draw each year. 4% is the classic rule of thumb — the rate a portfolio has historically sustained over 30 years.",
          )}
        >
          <PercentInput
            value={d.withdrawalRate}
            step={0.25}
            onChange={(v) =>
              setAssumptions({ drawdown: { withdrawalRate: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "drawdownPanel.dials.taxRate.label",
            "Tax rate on retirement withdrawals",
          )}
          hint={t(
            "drawdownPanel.dials.taxRate.hint",
            "Applied only to money drawn from 401(k)/IRA balances — not your taxable savings and investments, which are already after-tax. A flat effective rate, not your marginal bracket.",
          )}
        >
          <PercentInput
            value={d.taxRateOnWithdrawal}
            step={0.25}
            onChange={(v) =>
              setAssumptions({ drawdown: { taxRateOnWithdrawal: v } })
            }
          />
        </Field>
        <Field
          label={t("drawdownPanel.dials.returnAnnual.label", "Return once retired")}
          hint={t(
            "drawdownPanel.dials.returnAnnual.hint",
            "Usually lower than while working, since portfolios get more conservative when you are living off them.",
          )}
        >
          <PercentInput
            value={d.returnAnnual}
            step={0.25}
            onChange={(v) => setAssumptions({ drawdown: { returnAnnual: v } })}
          />
        </Field>
        <Field
          label={t(
            "drawdownPanel.dials.inflationAnnual.label",
            "Inflation in retirement",
          )}
          hint={t(
            "drawdownPanel.dials.inflationAnnual.hint",
            "How fast your spending rises once retired. Over thirty years this is the single most punishing assumption in the model.",
          )}
        >
          <PercentInput
            value={d.inflationAnnual}
            onChange={(v) =>
              setAssumptions({ drawdown: { inflationAnnual: v } })
            }
          />
        </Field>
        <Field
          label={t("drawdownPanel.dials.planToAge.label", "Plan to age")}
          hint={t(
            "drawdownPanel.dials.planToAge.hint",
            "How long the money needs to last. Running out before this is the failure case.",
          )}
        >
          <NumberInput
            value={d.planToAge}
            min={70}
            max={110}
            onChange={(v) => setAssumptions({ drawdown: { planToAge: v } })}
          />
        </Field>
        <div className="sm:col-span-2 flex items-end">
          <Toggle
            checked={d.includeHomeEquity}
            onChange={(v) =>
              setAssumptions({ drawdown: { includeHomeEquity: v } })
            }
            label={t(
              "drawdownPanel.dials.includeHomeEquity.label",
              "Count home equity as spendable",
            )}
            hint={t(
              "drawdownPanel.dials.includeHomeEquity.hint",
              "Off by default: you have to live somewhere. Only turn this on if the plan really is to downsize or borrow against the house.",
            )}
          />
        </div>
      </div>
    </Card>
  );
}
