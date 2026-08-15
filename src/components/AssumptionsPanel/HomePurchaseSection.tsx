import { money, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, NumberInput, PercentInput } from "../ui";

export default function HomePurchaseSection() {
  const { assumptions: a, setAssumptions } = useStore();

  return (
    <Card title="Home purchase" className="lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Target price (today)"
          hint="What the kind of house you want costs right now. The model grows this by the appreciation rate while you save, so waiting means a bigger down payment."
        >
          <MoneyInput
            value={a.home.targetPrice}
            step={5000}
            onChange={(v) => setAssumptions({ home: { targetPrice: v } })}
          />
        </Field>
        <Field
          label="Down payment"
          hint="Percent of the purchase price you put down. 20% avoids mortgage insurance."
        >
          <PercentInput
            value={a.home.downPaymentPct}
            step={0.5}
            onChange={(v) => setAssumptions({ home: { downPaymentPct: v } })}
          />
        </Field>
        <Field
          label="Closing costs"
          hint="Fees due at closing, on top of the down payment. Usually 2-5% of the price."
        >
          <PercentInput
            value={a.home.closingCostPct}
            step={0.25}
            onChange={(v) => setAssumptions({ home: { closingCostPct: v } })}
          />
        </Field>
        <Field
          label="Mortgage rate"
          hint="The quoted annual rate on the loan. Fixed for the life of the loan in this model."
        >
          <PercentInput
            value={a.home.mortgageRateAnnual}
            step={0.125}
            onChange={(v) =>
              setAssumptions({ home: { mortgageRateAnnual: v } })
            }
          />
        </Field>
        <Field
          label="Mortgage term (years)"
          hint="30 is standard. A 15-year loan costs more each month but builds equity much faster."
        >
          <NumberInput
            value={a.home.mortgageTermYears}
            min={5}
            max={40}
            onChange={(v) => setAssumptions({ home: { mortgageTermYears: v } })}
          />
        </Field>
        <Field
          label="Tax + insurance + HOA / month"
          hint="Everything in the monthly housing payment that isn't loan principal and interest. Held flat over time, since it's an estimate anyway."
        >
          <MoneyInput
            value={a.home.taxInsuranceHoaMonthly}
            onChange={(v) =>
              setAssumptions({ home: { taxInsuranceHoaMonthly: v } })
            }
          />
        </Field>
        <Field
          label="Home appreciation / year"
          hint="How fast house prices rise. This cuts both ways: it grows your equity after you buy, but raises the price while you're still saving."
        >
          <PercentInput
            value={a.home.appreciationAnnual}
            onChange={(v) =>
              setAssumptions({ home: { appreciationAnnual: v } })
            }
          />
        </Field>
        <Field
          label="Upkeep / year"
          hint="Maintenance and repairs, as a percent of what the house is worth. 1% a year is the usual rule of thumb. You never get a bill for this, which is exactly why leaving it out makes buying look better than it is."
        >
          <PercentInput
            value={a.home.maintenanceAnnualPct}
            step={0.25}
            onChange={(v) =>
              setAssumptions({ home: { maintenanceAnnualPct: v } })
            }
          />
        </Field>
        <Field
          label="Mortgage insurance / year"
          hint="PMI, as a percent of the original loan. Charged only while you owe more than the threshold below, so a 20% down payment never pays any."
        >
          <PercentInput
            value={a.home.pmiAnnualPct}
            step={0.05}
            onChange={(v) => setAssumptions({ home: { pmiAnnualPct: v } })}
          />
        </Field>
        <Field
          label="Mortgage insurance drops at"
          hint="Loan-to-value ratio at which PMI falls away. Conventionally 80% — reached by paying down the loan, by the house appreciating, or both."
        >
          <PercentInput
            value={a.home.pmiRemovedAtLtv}
            step={1}
            onChange={(v) => setAssumptions({ home: { pmiRemovedAtLtv: v } })}
          />
        </Field>
      </div>
      {1 - a.home.downPaymentPct > a.home.pmiRemovedAtLtv &&
        (a.home.pmiAnnualPct > 0 || a.home.pmiUpfrontPct > 0) &&
        (() => {
          const loan = a.home.targetPrice * (1 - a.home.downPaymentPct);
          const monthly = (loan * a.home.pmiAnnualPct) / 12;
          const upfront = loan * a.home.pmiUpfrontPct;
          const cashNeeded =
            a.home.targetPrice *
              (a.home.downPaymentPct + a.home.closingCostPct) +
            upfront;
          return (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              <strong>
                {pct(a.home.downPaymentPct, 0)} down triggers mortgage
                insurance.
              </strong>{" "}
              On today&rsquo;s target price that is {money(monthly)} a month
              {upfront > 0 && <> plus {money(upfront)} upfront at closing</>},
              on top of a {money(loan)} loan. All in, you would need{" "}
              <strong>{money(cashNeeded)}</strong> on the day. The monthly
              premium falls away once you owe less than{" "}
              {pct(a.home.pmiRemovedAtLtv, 0)} of what the house is worth —
              sooner if it appreciates.
            </div>
          );
        })()}
    </Card>
  );
}
