import { useTranslation } from "react-i18next";
import { NEIGHBOURING_COUNTIES } from "../../data/localMarket";
import { money, pct } from "../../lib/format";
import { Card } from "../ui";

function slug(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z]+/g, "");
}

export default function NeighbouringCountiesCard() {
  const { t } = useTranslation();
  return (
    <Card
      title={t(
        "marketPanel.neighbouringCounties.title",
        "Delaware County against its neighbours",
      )}
      subtitle={t(
        "marketPanel.neighbouringCounties.subtitle",
        "Median sale prices and typical all-in effective tax rates.",
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {NEIGHBOURING_COUNTIES.map((c) => (
          <div key={c.name} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between">
              <h4 className="font-semibold text-slate-900">
                {c.name}, {c.state}
              </h4>
              <span className="text-lg font-semibold tabular-nums">
                {money(c.medianPrice)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {t(
                `marketPanel.neighbouringCounties.${slug(c.name)}.priceNote`,
                c.priceNote,
              )}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                "marketPanel.neighbouringCounties.effectiveTax",
                "Typical effective tax {{rate}} — about",
                { rate: pct(c.effectiveTaxRate, 2) },
              )}{" "}
              <strong>
                {t(
                  "marketPanel.neighbouringCounties.perMonthOnMedian",
                  "{{amount}}/mo",
                  { amount: money((c.medianPrice * c.effectiveTaxRate) / 12) },
                )}
              </strong>{" "}
              {t(
                "marketPanel.neighbouringCounties.onMedianHouse",
                "on the median house.",
              )}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {t(
                `marketPanel.neighbouringCounties.${slug(c.name)}.note`,
                c.note,
              )}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
