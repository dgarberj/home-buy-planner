import { NEIGHBOURING_COUNTIES } from "../../data/localMarket";
import { money, pct } from "../../lib/format";
import { Card } from "../ui";

export default function NeighbouringCountiesCard() {
  return (
    <Card
      title="Delaware County against its neighbours"
      subtitle="Median sale prices and typical all-in effective tax rates."
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
            <p className="mt-1 text-xs text-slate-400">{c.priceNote}</p>
            <p className="mt-2 text-sm text-slate-600">
              Typical effective tax {pct(c.effectiveTaxRate, 2)} — about{" "}
              <strong>
                {money((c.medianPrice * c.effectiveTaxRate) / 12)}/mo
              </strong>{" "}
              on the median house.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {c.note}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
