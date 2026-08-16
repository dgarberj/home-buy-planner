import { useTranslation } from "react-i18next";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card, Field, MoneyInput, NumberInput, TextInput, Toggle } from "../ui";

export default function CoResidentSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, settings } = useStore();

  return (
    <Card
      title={t("assumptions.coResident.title", "Someone moving in")}
      subtitle={t(
        "assumptions.coResident.subtitle",
        "A relative contributing to household costs, if you buy somewhere with room for them.",
      )}
      className="lg:col-span-2"
    >
      <Toggle
        checked={a.coResident.enabled}
        onChange={(v) => setAssumptions({ coResident: { enabled: v } })}
        label={t(
          "assumptions.coResident.enable.label",
          "Include a co-resident's contribution",
        )}
        hint={t(
          "assumptions.coResident.enable.hint",
          "Their income is treated differently from a pay rise: it does not stop if you lose your job, but it only starts once you own a house with space for them.",
        )}
      />
      {a.coResident.enabled && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t("assumptions.coResident.who.label", "Who")}
              hint={t(
                "assumptions.coResident.who.hint",
                "Just a label, so you can tell it apart on the month-by-month table.",
              )}
            >
              <TextInput
                value={a.coResident.label}
                onChange={(v) => setAssumptions({ coResident: { label: v } })}
              />
            </Field>
            <Field
              label={t(
                "assumptions.coResident.contribution.label",
                "Contribution / month",
              )}
              hint={t(
                "assumptions.coResident.contribution.hint",
                "What they would put towards household costs each month.",
              )}
            >
              <MoneyInput
                value={a.coResident.monthlyAmount}
                onChange={(v) =>
                  setAssumptions({ coResident: { monthlyAmount: v } })
                }
              />
            </Field>
            <Field
              label={t(
                "assumptions.coResident.premium.label",
                "Extra house price for the space",
              )}
              hint={t(
                "assumptions.coResident.premium.hint",
                "What a house with a separate living space — in-law suite, finished basement, first-floor bedroom — costs above your target price. This is the real cost of the arrangement, and the model charges it in full.",
              )}
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
              label={t(
                "assumptions.coResident.endMonth.label",
                "Stops after month (blank = never)",
              )}
              hint={t(
                "assumptions.coResident.endMonth.hint",
                "Leave at 0 to run for the whole projection.",
              )}
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
              label={t(
                "assumptions.coResident.requiresHomePurchase.label",
                "Only once we own a suitable house",
              )}
              hint={t(
                "assumptions.coResident.requiresHomePurchase.hint",
                "On means nothing arrives while renting — which is exactly why this changes the buy-early calculation.",
              )}
            />
            <Toggle
              checked={a.coResident.growsWithInflation}
              onChange={(v) =>
                setAssumptions({ coResident: { growsWithInflation: v } })
              }
              label={t(
                "assumptions.coResident.growsWithInflation.label",
                "Rises with inflation",
              )}
              hint={t(
                "assumptions.coResident.growsWithInflation.hint",
                "Fixed, non-wage income often carries a cost-of-living adjustment.",
              )}
            />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-900">
              {t(
                "assumptions.coResident.tradeoff.title",
                "The trade-off in one line.",
              )}
            </strong>{" "}
            {t(
              "assumptions.coResident.tradeoff.body",
              "The contribution is worth {{contribution}} a month, but only after you buy — and the extra {{premium}} of house costs you {{closingImpact}} more at closing, which pushes the purchase further out. Long run it usually pays for itself; short run it makes the deposit harder.",
              {
                contribution: money(a.coResident.monthlyAmount),
                premium: money(a.coResident.homePricePremium),
                closingImpact: money(
                  a.coResident.homePricePremium *
                    (a.home.downPaymentPct + a.home.closingCostPct),
                ),
              },
            )}
          </div>
        </>
      )}
    </Card>
  );
}
