import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, NumberInput, TextInput, Toggle } from "../ui";

export default function CoResidentSection() {
  const { assumptions: a, setAssumptions, settings } = useStore();

  return (
    <Card
      title="Someone moving in"
      subtitle="A relative contributing to household costs, if you buy somewhere with room for them."
      className="lg:col-span-2"
    >
      <Toggle
        checked={a.coResident.enabled}
        onChange={(v) => setAssumptions({ coResident: { enabled: v } })}
        label="Include a co-resident's contribution"
        hint="Their income is treated differently from a pay rise: it does not stop if you lose your job, but it only starts once you own a house with space for them."
      />
      {a.coResident.enabled && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Who"
              hint="Just a label, so you can tell it apart on the month-by-month table."
            >
              <TextInput
                value={a.coResident.label}
                onChange={(v) => setAssumptions({ coResident: { label: v } })}
              />
            </Field>
            <Field
              label="Contribution / month"
              hint="What they would put towards household costs each month."
            >
              <MoneyInput
                value={a.coResident.monthlyAmount}
                onChange={(v) =>
                  setAssumptions({ coResident: { monthlyAmount: v } })
                }
              />
            </Field>
            <Field
              label="Extra house price for the space"
              hint="What a house with a separate living space — in-law suite, finished basement, first-floor bedroom — costs above your target price. This is the real cost of the arrangement, and the model charges it in full."
            >
              <MoneyInput
                value={a.coResident.homePricePremium}
                step={5000}
                onChange={(v) =>
                  setAssumptions({ coResident: { homePricePremium: v } })
                }
              />
            </Field>
            <Field
              label="Stops after month (blank = never)"
              hint="Leave at 0 to run for the whole projection."
            >
              <NumberInput
                value={a.coResident.endMonth ?? 0}
                min={0}
                max={settings.horizonMonths}
                onChange={(v) =>
                  setAssumptions({
                    coResident: { endMonth: v > 0 ? v : null },
                  })
                }
              />
            </Field>
          </div>
          <div className="mt-4 space-y-3">
            <Toggle
              checked={a.coResident.requiresHomePurchase}
              onChange={(v) =>
                setAssumptions({ coResident: { requiresHomePurchase: v } })
              }
              label="Only once we own a suitable house"
              hint="On means nothing arrives while renting — which is exactly why this changes the buy-early calculation."
            />
            <Toggle
              checked={a.coResident.growsWithInflation}
              onChange={(v) =>
                setAssumptions({ coResident: { growsWithInflation: v } })
              }
              label="Rises with inflation"
              hint="Fixed, non-wage income often carries a cost-of-living adjustment."
            />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-900">
              The trade-off in one line.
            </strong>{" "}
            The contribution is worth {money(a.coResident.monthlyAmount)} a
            month, but only after you buy — and the extra{" "}
            {money(a.coResident.homePricePremium)} of house costs you{" "}
            {money(
              a.coResident.homePricePremium *
                (a.home.downPaymentPct + a.home.closingCostPct),
            )}{" "}
            more at closing, which pushes the purchase further out. Long run
            it usually pays for itself; short run it makes the deposit
            harder.
          </div>
        </>
      )}
    </Card>
  );
}
