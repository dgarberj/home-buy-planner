import {
  SECOND_INCOME_OPTIONS,
  SS_CREDIT_2026,
  netMonthlyFromGross,
} from "../../data/secondIncomeOptions";
import { money, monthLabel } from "../../lib/format";
import { useStore } from "../../store/useStore";
import {
  Card,
  Field,
  MoneyInput,
  NumberInput,
  SectionTitle,
  Slider,
  TextInput,
  Toggle,
} from "../ui";

export default function SecondIncomeSection() {
  const { assumptions: a, setAssumptions, settings } = useStore();

  return (
    <Card
      title="A second income"
      subtitle="A partner returning to work — and the childcare that comes with it."
      className="lg:col-span-2"
    >
      <Toggle
        checked={a.secondIncome.enabled}
        onChange={(v) => setAssumptions({ secondIncome: { enabled: v } })}
        label={<strong>Include a second income in every calculation</strong>}
        hint="Flows through the dashboard, the affordability table and the waiting analysis. Off by default so the baseline stays honest."
      />
      {a.secondIncome.enabled && (
        <>
          <div className="mt-4">
            <SectionTitle hint="Real 2026 wage data for the Philadelphia metro. Take-home is at the marginal rate — a second income stacks on the first, so every dollar is taxed at the top of your bracket.">
              Start from a realistic option
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {SECOND_INCOME_OPTIONS.filter((o) => o.grossAnnual > 0).map(
                (o) => (
                  <button
                    key={o.key}
                    type="button"
                    title={`${o.hoursNote} — ${o.note}`}
                    onClick={() =>
                      setAssumptions({
                        secondIncome: {
                          monthlyTakeHome: Math.round(
                            netMonthlyFromGross(o.grossAnnual),
                          ),
                          additionalCostsMonthly: o.costsMonthly,
                        },
                      })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                  >
                    <span className="block font-medium text-slate-900">
                      {o.label}
                    </span>
                    <span className="block text-slate-500">
                      {money(o.grossAnnual)} gross ·{" "}
                      {money(netMonthlyFromGross(o.grossAnnual))}/mo net
                      {o.costsMonthly > 0 &&
                        ` · ${money(o.costsMonthly)} childcare`}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Who"
              hint="Just a label for the month-by-month table."
            >
              <TextInput
                value={a.secondIncome.label}
                onChange={(v) => setAssumptions({ secondIncome: { label: v } })}
              />
            </Field>
            <Field
              label="Take-home / month"
              hint="After tax. This is what actually lands in the account, not the salary."
            >
              <MoneyInput
                value={a.secondIncome.monthlyTakeHome}
                onChange={(v) =>
                  setAssumptions({ secondIncome: { monthlyTakeHome: v } })
                }
              />
            </Field>
            <Field
              label="Childcare & costs of working"
              hint="Childcare, commuting, a second car. Charged only while the second income is running. This number decides whether the early years are worth it, so get real quotes."
            >
              <MoneyInput
                value={a.secondIncome.additionalCostsMonthly}
                onChange={(v) =>
                  setAssumptions({
                    secondIncome: { additionalCostsMonthly: v },
                  })
                }
              />
            </Field>
            <Field
              label="Costs stop after month"
              hint="Typically when the youngest reaches school age. Set 0 to run them for the whole projection."
            >
              <NumberInput
                value={a.secondIncome.additionalCostsEndMonth ?? 0}
                min={0}
                max={settings.horizonMonths}
                onChange={(v) =>
                  setAssumptions({
                    secondIncome: {
                      additionalCostsEndMonth: v > 0 ? v : null,
                    },
                  })
                }
              />
            </Field>
          </div>

          <div className="mt-4">
            <Slider
              label="Starts in"
              hint="Drag it. Because childcare usually ends on a fixed date, going back earlier can buy more months of net loss rather than fewer."
              value={a.secondIncome.startMonth}
              min={1}
              max={Math.min(settings.horizonMonths, 120)}
              onChange={(v) =>
                setAssumptions({ secondIncome: { startMonth: v } })
              }
              display={`${monthLabel(settings.startDate, a.secondIncome.startMonth)} · month ${a.secondIncome.startMonth}`}
            />
          </div>

          <div className="mt-4 space-y-3">
            <Toggle
              checked={a.secondIncome.growsWithIncome}
              onChange={(v) =>
                setAssumptions({ secondIncome: { growsWithIncome: v } })
              }
              label="Rises with pay rises"
            />
            <Toggle
              checked={a.secondIncome.affectedByJobLoss}
              onChange={(v) =>
                setAssumptions({ secondIncome: { affectedByJobLoss: v } })
              }
              label="Also cut if the main earner loses their job"
              hint="Normally off — a different employer means a different risk. Turn it on only if both work somewhere the same shock would hit."
            />
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-900">Social Security credits.</strong>{" "}
            In 2026 four credits — a full year — costs only{" "}
            {money(SS_CREDIT_2026.fullYearEarnings)} of earnings, and forty
            credits (ten years) earns a benefit in her own right. Part-time work
            clears that threshold just as completely as full-time, so{" "}
            <em>
              building Social Security is not a reason to choose full-time over
              part-time
            </em>
            . The reasons to prefer full-time are the pay and the career
            progression, not the credits.
          </div>

          {(() => {
            const net =
              a.secondIncome.monthlyTakeHome -
              a.secondIncome.additionalCostsMonthly;
            return (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  net < 0
                    ? "bg-amber-50 text-amber-900"
                    : "bg-emerald-50 text-emerald-900"
                }`}
              >
                <strong>
                  {net < 0
                    ? `While childcare runs this costs you ${money(Math.abs(net))} a month.`
                    : `While childcare runs this adds ${money(net)} a month.`}
                </strong>{" "}
                {money(a.secondIncome.monthlyTakeHome)} in,{" "}
                {money(a.secondIncome.additionalCostsMonthly)} out. Once the
                costs stop, the full {money(a.secondIncome.monthlyTakeHome)}{" "}
                lands on the bottom line — a swing of{" "}
                {money(a.secondIncome.additionalCostsMonthly)} in a single
                month.
                {net < 0 && (
                  <>
                    {" "}
                    And note it does <em>not</em> protect you against a job loss
                    while that is true: you would still be paying more for
                    childcare than the second wage brings in.
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}
    </Card>
  );
}
