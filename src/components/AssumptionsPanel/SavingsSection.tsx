import { deriveBudgetTotals, deriveStartingBalances } from "../../lib/derive";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, NumberInput, PercentInput, SectionTitle } from "../ui";

export default function SavingsSection() {
  const { assumptions: a, setAssumptions, budget, balances, settings } =
    useStore();
  const fromBudget = settings.useBudgetTotals;
  const fromBalances = settings.useLatestBalances;
  const totals = deriveBudgetTotals(budget);
  const starting = deriveStartingBalances(balances);

  return (
    <Card title="Savings & investments">
      <SectionTitle hint="This is the pot the down payment comes out of. It is split in two because, over decades, where the surplus sits matters more than almost anything else.">
        Money outside retirement
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Cash today"
          hint="Checking plus high-yield savings. The money you could spend this week."
        >
          <MoneyInput
            value={
              fromBalances && starting.asOf
                ? starting.cash
                : a.savings.cashBalance
            }
            disabled={fromBalances && !!starting.asOf}
            step={1000}
            onChange={(v) => setAssumptions({ savings: { cashBalance: v } })}
          />
        </Field>
        <Field
          label="Invested today"
          hint="Taxable brokerage. Not retirement accounts — those are tracked separately."
        >
          <MoneyInput
            value={
              fromBalances && starting.asOf
                ? starting.investments
                : a.savings.investmentBalance
            }
            disabled={fromBalances && !!starting.asOf}
            step={1000}
            onChange={(v) =>
              setAssumptions({ savings: { investmentBalance: v } })
            }
          />
        </Field>
        <Field
          label="Return on cash"
          hint="What a high-yield savings account pays. Low, but the money is there when you need it."
        >
          <PercentInput
            value={a.savings.cashReturnAnnual}
            onChange={(v) => setAssumptions({ savings: { cashReturnAnnual: v } })}
          />
        </Field>
        <Field
          label="Return on investments"
          hint="Long-run average on the invested pool. Keep it below the retirement return if this money is less aggressively invested."
        >
          <PercentInput
            value={a.savings.investmentReturnAnnual}
            onChange={(v) =>
              setAssumptions({ savings: { investmentReturnAnnual: v } })
            }
          />
        </Field>
        <Field
          label="Emergency fund (months)"
          hint="How many months of total outgoings to keep in cash before investing the rest. Everything above this gets swept into investments each month; shortfalls sell investments to cover them."
        >
          <NumberInput
            value={a.savings.cashBufferMonths}
            min={0}
            max={36}
            onChange={(v) => setAssumptions({ savings: { cashBufferMonths: v } })}
          />
        </Field>
        <div className="flex items-end">
          <p className="text-xs text-slate-500">
            Today that buffer target is about{" "}
            <strong className="text-slate-700">
              {money(
                a.savings.cashBufferMonths *
                  ((fromBudget
                    ? totals.fixed + totals.variable
                    : a.expenses.fixedMonthly + a.expenses.variableMonthly) +
                    (fromBudget ? totals.rent : a.expenses.currentRentMonthly)),
              )}
            </strong>
            . It rises with inflation, and jumps when the mortgage replaces
            rent.
          </p>
        </div>
      </div>
      {fromBalances && starting.asOf && (
        <p className="mt-3 text-xs text-slate-500">
          From your snapshot dated {starting.asOf}: {money(starting.liquid)}{" "}
          available in total.
        </p>
      )}
    </Card>
  );
}
