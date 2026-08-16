import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, settings } = useStore();

  return (
    <Card
      title={t("assumptions.secondIncome.title", "A second income")}
      subtitle={t(
        "assumptions.secondIncome.subtitle",
        "A partner returning to work — and the childcare that comes with it.",
      )}
      className="lg:col-span-2"
    >
      <Toggle
        checked={a.secondIncome.enabled}
        onChange={(v) => setAssumptions({ secondIncome: { enabled: v } })}
        label={
          <strong>
            {t(
              "assumptions.secondIncome.enable.label",
              "Include a second income in every calculation",
            )}
          </strong>
        }
        hint={t(
          "assumptions.secondIncome.enable.hint",
          "Flows through the dashboard, the affordability table and the waiting analysis. Off by default so the baseline stays honest.",
        )}
      />
      {a.secondIncome.enabled && (
        <>
          <div className="mt-4">
            <SectionTitle
              hint={t(
                "assumptions.secondIncome.presets.hint",
                "Real 2026 wage data for the Philadelphia metro. Take-home is at the marginal rate — a second income stacks on the first, so every dollar is taxed at the top of your bracket.",
              )}
            >
              {t(
                "assumptions.secondIncome.presets.title",
                "Start from a realistic option",
              )}
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
                      {t(
                        "assumptions.secondIncome.presets.summary",
                        "{{gross}} gross · {{net}}/mo net",
                        {
                          gross: money(o.grossAnnual),
                          net: money(netMonthlyFromGross(o.grossAnnual)),
                        },
                      )}
                      {o.costsMonthly > 0 &&
                        ` · ${t(
                          "assumptions.secondIncome.presets.childcare",
                          "{{amount}} childcare",
                          { amount: money(o.costsMonthly) },
                        )}`}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t("assumptions.secondIncome.who.label", "Who")}
              hint={t(
                "assumptions.secondIncome.who.hint",
                "Just a label for the month-by-month table.",
              )}
            >
              <TextInput
                value={a.secondIncome.label}
                onChange={(v) => setAssumptions({ secondIncome: { label: v } })}
              />
            </Field>
            <Field
              label={t(
                "assumptions.secondIncome.takeHome.label",
                "Take-home / month",
              )}
              hint={t(
                "assumptions.secondIncome.takeHome.hint",
                "After tax. This is what actually lands in the account, not the salary.",
              )}
            >
              <MoneyInput
                value={a.secondIncome.monthlyTakeHome}
                onChange={(v) =>
                  setAssumptions({ secondIncome: { monthlyTakeHome: v } })
                }
              />
            </Field>
            <Field
              label={t(
                "assumptions.secondIncome.costs.label",
                "Childcare & costs of working",
              )}
              hint={t(
                "assumptions.secondIncome.costs.hint",
                "Childcare, commuting, a second car. Charged only while the second income is running. This number decides whether the early years are worth it, so get real quotes.",
              )}
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
              label={t(
                "assumptions.secondIncome.costsEndMonth.label",
                "Costs stop after month",
              )}
              hint={t(
                "assumptions.secondIncome.costsEndMonth.hint",
                "Typically when the youngest reaches school age. Set 0 to run them for the whole projection.",
              )}
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
              label={t("assumptions.secondIncome.startsIn.label", "Starts in")}
              hint={t(
                "assumptions.secondIncome.startsIn.hint",
                "Drag it. Because childcare usually ends on a fixed date, going back earlier can buy more months of net loss rather than fewer.",
              )}
              value={a.secondIncome.startMonth}
              min={1}
              max={Math.min(settings.horizonMonths, 120)}
              onChange={(v) =>
                setAssumptions({ secondIncome: { startMonth: v } })
              }
              display={t(
                "assumptions.secondIncome.startsIn.display",
                "{{date}} · month {{month}}",
                {
                  date: monthLabel(
                    settings.startDate,
                    a.secondIncome.startMonth,
                  ),
                  month: a.secondIncome.startMonth,
                },
              )}
            />
          </div>

          <div className="mt-4 space-y-3">
            <Toggle
              checked={a.secondIncome.growsWithIncome}
              onChange={(v) =>
                setAssumptions({ secondIncome: { growsWithIncome: v } })
              }
              label={t(
                "assumptions.secondIncome.growsWithIncome.label",
                "Rises with pay rises",
              )}
            />
            <Toggle
              checked={a.secondIncome.affectedByJobLoss}
              onChange={(v) =>
                setAssumptions({ secondIncome: { affectedByJobLoss: v } })
              }
              label={t(
                "assumptions.secondIncome.affectedByJobLoss.label",
                "Also cut if the main earner loses their job",
              )}
              hint={t(
                "assumptions.secondIncome.affectedByJobLoss.hint",
                "Normally off — a different employer means a different risk. Turn it on only if both work somewhere the same shock would hit.",
              )}
            />
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-900">
              {t(
                "assumptions.secondIncome.ssCredits.title",
                "Social Security credits.",
              )}
            </strong>{" "}
            {t(
              "assumptions.secondIncome.ssCredits.body1",
              "In 2026 four credits — a full year — costs only {{amount}} of earnings, and forty credits (ten years) earns a benefit in her own right. Part-time work clears that threshold just as completely as full-time, so",
              { amount: money(SS_CREDIT_2026.fullYearEarnings) },
            )}{" "}
            <em>
              {t(
                "assumptions.secondIncome.ssCredits.emphasis",
                "building Social Security is not a reason to choose full-time over part-time",
              )}
            </em>
            {t(
              "assumptions.secondIncome.ssCredits.body2",
              ". The reasons to prefer full-time are the pay and the career progression, not the credits.",
            )}
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
                    ? t(
                        "assumptions.secondIncome.netEffect.costs",
                        "While childcare runs this costs you {{amount}} a month.",
                        { amount: money(Math.abs(net)) },
                      )
                    : t(
                        "assumptions.secondIncome.netEffect.adds",
                        "While childcare runs this adds {{amount}} a month.",
                        { amount: money(net) },
                      )}
                </strong>{" "}
                {t(
                  "assumptions.secondIncome.netEffect.detail",
                  "{{takeHome}} in, {{costs}} out. Once the costs stop, the full {{takeHome}} lands on the bottom line — a swing of {{costs}} in a single month.",
                  {
                    takeHome: money(a.secondIncome.monthlyTakeHome),
                    costs: money(a.secondIncome.additionalCostsMonthly),
                  },
                )}
                {net < 0 && (
                  <>
                    {" "}
                    {t(
                      "assumptions.secondIncome.netEffect.jobLossCaveatPre",
                      "And note it does",
                    )}{" "}
                    <em>
                      {t(
                        "assumptions.secondIncome.netEffect.jobLossCaveatEmphasis",
                        "not",
                      )}
                    </em>{" "}
                    {t(
                      "assumptions.secondIncome.netEffect.jobLossCaveatPost",
                      "protect you against a job loss while that is true: you would still be paying more for childcare than the second wage brings in.",
                    )}
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
