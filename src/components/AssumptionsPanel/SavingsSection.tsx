import { useTranslation } from "react-i18next";
import { deriveBudgetTotals, deriveStartingBalances } from "../../lib/derive";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import {
  Card,
  Field,
  MoneyInput,
  NumberInput,
  PercentInput,
  SectionTitle,
} from "../ui";

export default function SavingsSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, budget, balances } = useStore();
  const totals = deriveBudgetTotals(budget);
  const starting = deriveStartingBalances(balances);
  // Not a user choice -- always derive from the newest Balances snapshot,
  // if one exists yet. `starting.asOf` is null before any snapshot is
  // logged, which is the only remaining reason to fall back to the typed
  // value below.
  const hasSnapshot = !!starting.asOf;

  return (
    <Card title={t("assumptions.savings.title", "Savings & investments")}>
      <SectionTitle
        hint={t(
          "assumptions.savings.subtitle.hint",
          "This is the pot the down payment comes out of. It is split in two because, over decades, where the surplus sits matters more than almost anything else.",
        )}
      >
        {t("assumptions.savings.subtitle.title", "Money outside retirement")}
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("assumptions.savings.cashToday.label", "Cash today")}
          hint={t(
            "assumptions.savings.cashToday.hint",
            "Checking plus high-yield savings. The money you could spend this week.",
          )}
        >
          <MoneyInput
            value={hasSnapshot ? starting.cash : a.savings.cashBalance}
            disabled={hasSnapshot}
            step={1000}
            onChange={(v) => setAssumptions({ savings: { cashBalance: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.savings.investedToday.label", "Invested today")}
          hint={t(
            "assumptions.savings.investedToday.hint",
            "Taxable brokerage. Not retirement accounts — those are tracked separately.",
          )}
        >
          <MoneyInput
            value={
              hasSnapshot ? starting.investments : a.savings.investmentBalance
            }
            disabled={hasSnapshot}
            step={1000}
            onChange={(v) =>
              setAssumptions({ savings: { investmentBalance: v } })
            }
          />
        </Field>
        <Field
          label={t("assumptions.savings.cashReturn.label", "Return on cash")}
          hint={t(
            "assumptions.savings.cashReturn.hint",
            "What a high-yield savings account pays. Low, but the money is there when you need it.",
          )}
        >
          <PercentInput
            value={a.savings.cashReturnAnnual}
            onChange={(v) =>
              setAssumptions({ savings: { cashReturnAnnual: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "assumptions.savings.investmentReturn.label",
            "Return on investments",
          )}
          hint={t(
            "assumptions.savings.investmentReturn.hint",
            "Long-run average on the invested pool. Keep it below the retirement return if this money is less aggressively invested.",
          )}
        >
          <PercentInput
            value={a.savings.investmentReturnAnnual}
            onChange={(v) =>
              setAssumptions({ savings: { investmentReturnAnnual: v } })
            }
          />
        </Field>
        <Field
          label={t(
            "assumptions.savings.emergencyFund.label",
            "Emergency fund (months)",
          )}
          hint={t(
            "assumptions.savings.emergencyFund.hint",
            "How many months of total outgoings to keep in cash before investing the rest. Everything above this gets swept into investments each month; shortfalls sell investments to cover them.",
          )}
        >
          <NumberInput
            value={a.savings.cashBufferMonths}
            min={0}
            max={36}
            onChange={(v) =>
              setAssumptions({ savings: { cashBufferMonths: v } })
            }
          />
        </Field>
        <div className="flex items-end">
          <p className="text-xs text-slate-500">
            {t(
              "assumptions.savings.bufferTarget.pre",
              "Today that buffer target is about",
            )}{" "}
            <strong className="text-slate-700">
              {money(
                a.savings.cashBufferMonths *
                  (totals.fixed + totals.variable + totals.rent),
              )}
            </strong>
            {t(
              "assumptions.savings.bufferTarget.post",
              ". It rises with inflation, and jumps when the mortgage replaces rent.",
            )}
          </p>
        </div>
      </div>
      {hasSnapshot && (
        <p className="mt-3 text-xs text-slate-500">
          {t(
            "assumptions.savings.snapshotNote",
            "From your snapshot dated {{date}}: {{amount}} available in total.",
            { date: starting.asOf, amount: money(starting.liquid) },
          )}
        </p>
      )}
    </Card>
  );
}
