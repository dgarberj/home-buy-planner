import {
  HSA_LIMITS,
  K401_LIMITS,
  employeeHsaRoom,
} from "../../data/contributionLimits";
import { money } from "../../lib/format";
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
          label="401(k) contribution / month"
          hint={`What you put into your 401(k) each month. Comes out of take-home cash. Elective-deferral limit for 2026 is ${money(K401_LIMITS.employeeDeferral2026)}/yr.`}
        >
          <MoneyInput
            value={a.retirement.k401Monthly}
            onChange={(v) => setAssumptions({ retirement: { k401Monthly: v } })}
          />
        </Field>
        <Field
          label="HSA contribution / month"
          hint={`What you put into the HSA each month, on top of any employer seed. ${a.retirement.hsaCoverageTier === "selfOnly" ? "Self-only" : "Family"} limit for 2026 is ${money(a.retirement.hsaCoverageTier === "selfOnly" ? HSA_LIMITS.selfOnly2026 : HSA_LIMITS.family2026)}/yr; your own room after the employer seed is ${money(employeeHsaRoom(a.retirement.hsaCoverageTier, a.retirement.employerHsaAnnualBonus))}/yr.`}
        >
          <MoneyInput
            value={a.retirement.hsaMonthly}
            onChange={(v) => setAssumptions({ retirement: { hsaMonthly: v } })}
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
