import { ALL_MUNICIPALITIES, estimatedMonthlyOwnershipCost } from "../../data/localMarket";
import { pmiRateFor } from "../../data/mortgageInsurance";
import { districtFor } from "../../data/schools";
import { money, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Card } from "../ui";

export default function HeadToHeadCard({ price }: { price: number }) {
  const { assumptions, settings } = useStore();
  const home = assumptions.home;
  const pmiRate = pmiRateFor(home.downPaymentPct, settings.creditScore);

  if (settings.shortlist.length < 2) return null;

  return (
    <Card
      title="Head to head"
      subtitle={`Your shortlist on a ${money(price)} house, at ${pct(home.downPaymentPct, 0)} down.`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {settings.shortlist.map((name) => {
          const mu = ALL_MUNICIPALITIES.find((x) => x.name === name);
          if (!mu) return null;
          // Credit-score-aware PMI rate, not the flat home.pmiAnnualPct
          // baked into the shared cost helper, so it's added on top here
          // rather than taken from cost.pmi/cost.total.
          const cost = estimatedMonthlyOwnershipCost(mu, price, home);
          const loan = price * (1 - home.downPaymentPct);
          const pmi = (loan * pmiRate) / 12;
          const district = districtFor(mu.schoolDistrict);
          return (
            <div key={name} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-semibold text-slate-900">{name}</h4>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">
                  {money(cost.pi + cost.tax + cost.insurance + cost.upkeep + pmi)}/mo
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {mu.schoolDistrict} schools
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Loan payment</dt>
                  <dd className="tabular-nums">{money(cost.pi)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Property + school tax</dt>
                  <dd className="tabular-nums">{money(cost.tax)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Mortgage insurance</dt>
                  <dd className="tabular-nums">{pmi > 0 ? money(pmi) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Insurance + upkeep</dt>
                  <dd className="tabular-nums">
                    {money(cost.insurance + cost.upkeep)}
                  </dd>
                </div>
              </dl>
              {district &&
              (district.mathProficiency !== null ||
                district.paRank2025 !== null) ? (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                  {district.paRank2025 !== null && (
                    <>PA rank #{district.paRank2025}. </>
                  )}
                  {district.mathProficiency !== null && (
                    <>
                      Maths {district.mathProficiency}%, reading{" "}
                      {district.readingProficiency}% proficient.{" "}
                    </>
                  )}
                  {district.note}
                </p>
              ) : (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  School performance not sourced for {mu.schoolDistrict}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
