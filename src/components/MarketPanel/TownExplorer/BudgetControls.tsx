import { CONVENTIONAL_97, pmiRateFor } from "../../../data/mortgageInsurance";
import type { HousingBudget } from "../../../engine/affordability";
import { money, pct } from "../../../lib/format";
import type {
  Assumptions,
  HomePurchaseAssumptions,
} from "../../../model/types";
import { Button, Field, MoneyInput, NumberInput, SectionTitle } from "../../ui";

export default function BudgetControls({
  assumptions,
  setAssumptions,
  reserve,
  setReserve,
  creditScore,
  setCreditScore,
  budget,
  ceilingPrice,
  typicalEffectiveTaxRate,
}: {
  assumptions: Assumptions;
  setAssumptions: (patch: { home: Partial<HomePurchaseAssumptions> }) => void;
  reserve: number;
  setReserve: (v: number) => void;
  creditScore: number;
  setCreditScore: (v: number) => void;
  budget: HousingBudget;
  ceilingPrice: number;
  typicalEffectiveTaxRate: number;
}) {
  const home = assumptions.home;
  const pmiRate = pmiRateFor(home.downPaymentPct, creditScore);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Reserve for saving"
          hint="Held back from the housing budget each month so you keep building a buffer after moving in."
        >
          <MoneyInput value={reserve} step={50} onChange={setReserve} />
        </Field>
        <div>
          <SectionTitle>Available for housing</SectionTitle>
          <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
            {money(budget.monthlyBudget)}
            <span className="ml-1 text-sm font-normal text-slate-400">/mo</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            all-in: loan, tax, insurance, mortgage insurance and upkeep
          </p>
        </div>
        <div>
          <SectionTitle>Rough ceiling</SectionTitle>
          <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
            {money(ceilingPrice)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            at a typical {pct(typicalEffectiveTaxRate, 1)} effective tax rate —
            higher-tax towns buy less
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
        <Field
          label="Credit score"
          hint="Sets the mortgage-insurance rate. The gap between 760+ and 680 is enormous on a small deposit."
        >
          <NumberInput
            value={creditScore}
            min={580}
            max={850}
            step={10}
            onChange={setCreditScore}
          />
        </Field>
        <Field
          label="Down payment"
          hint="3% is the Conventional 97 minimum. 20% avoids mortgage insurance entirely."
        >
          <div className="flex flex-wrap gap-1.5">
            {[0.03, 0.05, 0.1, 0.2].map((dp) => (
              <button
                key={dp}
                type="button"
                onClick={() => setAssumptions({ home: { downPaymentPct: dp } })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  Math.abs(home.downPaymentPct - dp) < 0.001
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pct(dp, 0)}
              </button>
            ))}
          </div>
        </Field>
        <div>
          <SectionTitle>Mortgage insurance</SectionTitle>
          <p className="whitespace-nowrap text-xl font-semibold tabular-nums">
            {pmiRate > 0 ? `${pct(pmiRate, 2)} of the loan a year` : "None"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {pmiRate > 0
              ? "Applied automatically below"
              : "Deposit is 20% or more"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() =>
            setAssumptions({
              home: { pmiAnnualPct: pmiRate, pmiUpfrontPct: 0 },
            })
          }
        >
          Save this mortgage-insurance rate to assumptions
        </Button>
        <p className="text-xs text-slate-500">
          {CONVENTIONAL_97.note} Rates here are indicative published tables —
          insurers price individually on credit, debt-to-income and property
          type, so get a real quote before committing.
        </p>
      </div>
    </div>
  );
}
