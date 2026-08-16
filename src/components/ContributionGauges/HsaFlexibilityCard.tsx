import { useTranslation } from "react-i18next";
import { pct } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card, Field, MoneyInput } from "../ui";

export default function HsaFlexibilityCard() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);

  return (
    <Card
      title={t(
        "contributionGauges.hsaFlex.title",
        "The HSA does not have to sit untouched until 65",
      )}
      subtitle={t(
        "contributionGauges.hsaFlex.subtitle",
        "It is a retirement account by default, but it is also the most flexible pot you have.",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t(
            "contributionGauges.hsaFlex.payMedical.label",
            "Pay medical from the HSA / month",
          )}
          hint={t(
            "contributionGauges.hsaFlex.payMedical.hint",
            "Set this to your monthly medical spend to cover it from the HSA instead of from cash. Tax-free either way — you are choosing liquidity over thirty years of compounding.",
          )}
        >
          <MoneyInput
            value={assumptions.retirement.hsaMedicalMonthly}
            onChange={(v) =>
              setAssumptions({ retirement: { hsaMedicalMonthly: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "contributionGauges.hsaFlex.reimbursement.label",
            "One-off reimbursement from the HSA",
          )}
          hint={t(
            "contributionGauges.hsaFlex.reimbursement.hint",
            "The IRS sets no deadline for reimbursing yourself. Any qualified expense since the account was opened can be claimed years later, provided you kept the receipts — so a stack of old medical bills is effectively a tax-free credit line against your own HSA.",
          )}
        >
          <MoneyInput
            step={250}
            value={assumptions.retirement.hsaReimbursement}
            onChange={(v) =>
              setAssumptions({ retirement: { hsaReimbursement: v } })
            }
          />
        </Field>
      </div>
      <Callout tone="neutral">
        <strong>
          {t(
            "contributionGauges.hsaFlex.transfer.title",
            "This is a transfer, not income.",
          )}
        </strong>{" "}
        {t(
          "contributionGauges.hsaFlex.transfer.body",
          "Net worth does not change the month you do it — money moves from a pot compounding at {{retirementReturn}} into one compounding at {{cashReturn}}. That is a real long-run cost, and worth paying when the thing actually blocking you is cash rather than retirement.",
          {
            retirementReturn: pct(assumptions.retirement.returnAnnual, 0),
            cashReturn: pct(assumptions.savings.cashReturnAnnual, 0),
          },
        )}
      </Callout>
    </Card>
  );
}
