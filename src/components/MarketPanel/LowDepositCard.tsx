import { CONVENTIONAL_97, pmiRateFor } from "../../data/mortgageInsurance";
import { money, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Button, Card, Field, NumberInput, SectionTitle } from "../ui";

export default function LowDepositCard({ price }: { price: number }) {
  const { assumptions, setAssumptions, settings, setSettings } = useStore();
  const home = assumptions.home;
  const creditScore = settings.creditScore;
  const pmiRate = pmiRateFor(home.downPaymentPct, creditScore);

  return (
    <Card
      title="Low deposit, strong credit"
      subtitle="A Conventional 97 needs 3% down. What that costs depends almost entirely on your credit score."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Credit score"
          hint="Sets the mortgage-insurance rate. The gap between 760+ and 680 is enormous on a small deposit."
        >
          <NumberInput
            value={creditScore}
            min={580}
            max={850}
            step={10}
            onChange={(v) => setSettings({ creditScore: v })}
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
            {pmiRate > 0
              ? `${money((price * (1 - home.downPaymentPct) * pmiRate) / 12)}/mo`
              : "None"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {pmiRate > 0
              ? `${pct(pmiRate, 2)} of the loan a year`
              : "Deposit is 20% or more"}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={() =>
            setAssumptions({
              home: { pmiAnnualPct: pmiRate, pmiUpfrontPct: 0 },
            })
          }
        >
          Apply this mortgage-insurance rate
        </Button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {CONVENTIONAL_97.note} Rates here are indicative published tables —
        insurers price individually on credit, debt-to-income and property
        type, so get a real quote before committing.
      </p>
    </Card>
  );
}
