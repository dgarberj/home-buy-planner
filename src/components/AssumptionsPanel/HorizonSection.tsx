import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { Card, DateInput, Field, NumberInput, SectionTitle } from "../ui";

/**
Quick horizon presets. The long ones are what make the retirement view work.
*/
const HORIZON_PRESETS: {
  id: string;
  label: string;
  months: (age: number) => number;
}[] = [
  { id: "y5", label: "5 years", months: () => 60 },
  { id: "y10", label: "10 years", months: () => 120 },
  { id: "to60", label: "To 60", months: (age) => (60 - age) * 12 + 1 },
  { id: "to65", label: "To 65", months: (age) => (65 - age) * 12 + 1 },
  { id: "to67", label: "To 67", months: (age) => (67 - age) * 12 + 1 },
  { id: "to70", label: "To 70", months: (age) => (70 - age) * 12 + 1 },
];

const CANDIDATE_AGES = [50, 55, 60, 62, 65, 67, 70, 75, 80];

export default function HorizonSection() {
  const { t } = useTranslation();
  const { assumptions: a, setAssumptions, settings, setSettings } = useStore();

  return (
    <Card
      title={t("assumptions.horizon.title", "You, and how far ahead to look")}
      subtitle={t(
        "assumptions.horizon.subtitle",
        "Retirement milestones are measured from your age, so this is what makes the long view mean anything.",
      )}
      className="lg:col-span-2"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label={t("assumptions.horizon.yourAge.label", "Your age")}
          hint={t(
            "assumptions.horizon.yourAge.hint",
            "Placeholder until you set it. Every retirement milestone below is measured from this.",
          )}
        >
          <NumberInput
            value={a.household.primaryAge}
            min={18}
            max={90}
            onChange={(v) => setAssumptions({ household: { primaryAge: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.horizon.partnerAge.label", "Partner's age")}
          hint={t(
            "assumptions.horizon.partnerAge.hint",
            "Shown alongside the milestones for context. It does not change any of the maths.",
          )}
        >
          <NumberInput
            value={a.household.partnerAge}
            min={18}
            max={90}
            onChange={(v) => setAssumptions({ household: { partnerAge: v } })}
          />
        </Field>
        <Field
          label={t("assumptions.horizon.startingMonth.label", "Starting month")}
          hint={t(
            "assumptions.horizon.startingMonth.hint",
            "Month 1 of the projection. Used to label months with real dates.",
          )}
        >
          <DateInput
            type="month"
            value={settings.startDate}
            onChange={(v) => setSettings({ startDate: v })}
          />
        </Field>
        <Field
          label={t(
            "assumptions.horizon.projectAhead.label",
            "Project ahead (months)",
          )}
          hint={t(
            "assumptions.horizon.projectAhead.hint",
            "How far the model runs. Long enough to outlive the mortgage is what makes the buy-early comparison honest.",
          )}
        >
          <NumberInput
            value={settings.horizonMonths}
            min={12}
            max={720}
            step={12}
            onChange={(v) => setSettings({ horizonMonths: v })}
          />
        </Field>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <SectionTitle
          hint={t(
            "assumptions.horizon.howFarAhead.hint",
            "Quick presets. The short windows are for the house decision; the long ones are for the retirement question.",
          )}
        >
          {t("assumptions.horizon.howFarAhead.title", "How far ahead")}
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {HORIZON_PRESETS.map((preset) => {
            const months = preset.months(a.household.primaryAge);
            const isActivePreset = settings.horizonMonths === months;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={months <= 12}
                onClick={() => setSettings({ horizonMonths: months })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActivePreset
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t(`assumptions.horizon.presets.${preset.id}`, preset.label)}
                <span className="ml-1.5 text-slate-400">
                  {months > 12 ? `${Math.round(months / 12)}y` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <SectionTitle
          hint={t(
            "assumptions.horizon.milestoneAges.hint",
            "The ages the dashboard reports net worth, retirement and home equity at. Only ages inside the projection window can be shown.",
          )}
        >
          {t("assumptions.horizon.milestoneAges.title", "Milestone ages")}
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {CANDIDATE_AGES.map((age) => {
            const selected = settings.milestoneAges.includes(age);
            const isReachable =
              age > a.household.primaryAge &&
              (age - a.household.primaryAge) * 12 + 1 <= settings.horizonMonths;
            return (
              <button
                key={age}
                type="button"
                onClick={() =>
                  setSettings({
                    milestoneAges: selected
                      ? settings.milestoneAges.filter((x) => x !== age)
                      : [...settings.milestoneAges, age].toSorted(
                          (x, y) => x - y,
                        ),
                  })
                }
                title={
                  isReachable
                    ? undefined
                    : t(
                        "assumptions.horizon.outsideWindow",
                        "Outside the current projection window",
                      )
                }
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                } ${isReachable ? "" : "opacity-40"}`}
              >
                {age}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t(
            "assumptions.horizon.fadedNote",
            "Faded ages fall outside the projection window — stretch the window to include them.",
          )}
        </p>
      </div>
    </Card>
  );
}
