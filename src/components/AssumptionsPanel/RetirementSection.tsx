import { deriveStartingBalances } from "../../lib/derive";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, PercentInput, Toggle } from "../ui";

export default function RetirementSection() {
  const { assumptions: a, setAssumptions, balances, settings } = useStore();
  const fromBalances = settings.useLatestBalances;
  const starting = deriveStartingBalances(balances);

  return (
    <Card title="Retirement">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Current balance"
          hint="Total across all retirement accounts today: 401(k)s, IRAs, and so on."
        >
          <MoneyInput
            value={
              fromBalances && starting.asOf
                ? starting.retirement
                : a.retirement.currentBalance
            }
            disabled={fromBalances && !!starting.asOf}
            step={1000}
            onChange={(v) =>
              setAssumptions({ retirement: { currentBalance: v } })
            }
          />
        </Field>
        <Field
          label="Annual return"
          hint="Long-run average growth. 7% is a common stock-heavy assumption; drop it to 5% for a more cautious view."
        >
          <PercentInput
            value={a.retirement.returnAnnual}
            onChange={(v) => setAssumptions({ retirement: { returnAnnual: v } })}
          />
        </Field>
        <Field
          label="Your contribution / month"
          hint="What you put in each month. This comes out of your take-home cash, so it reduces what's left to save for the house."
        >
          <MoneyInput
            value={a.retirement.employeeMonthly}
            onChange={(v) =>
              setAssumptions({ retirement: { employeeMonthly: v } })
            }
          />
        </Field>
        <Field
          label="Employer match / month"
          hint="Free money from your employer. It grows the retirement balance but does not reduce your take-home pay."
        >
          <MoneyInput
            value={a.retirement.employerMatchMonthly}
            onChange={(v) =>
              setAssumptions({ retirement: { employerMatchMonthly: v } })
            }
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
          label="Contributions grow with pay rises"
          hint="Over five years this barely matters. Over thirty it matters enormously — a flat contribution becomes trivially small after decades of raises."
        />
      </div>
    </Card>
  );
}
