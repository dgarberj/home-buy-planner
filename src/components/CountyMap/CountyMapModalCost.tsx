import { useTranslation } from "react-i18next";
import {
  estimatedMonthlyOwnershipCost,
  type Municipality,
} from "../../data/localMarket";
import type { HomePurchaseAssumptions } from "../../model/types";
import { money } from "../../lib/format";

/**
 * What houses cost here (if a median price is sourced), plus the monthly
 * ownership cost breakdown for either that median or the price the user is
 * evaluating.
 */
export default function CountyMapModalCost({
  open,
  price,
  home,
}: {
  open: Municipality;
  price: number;
  home: Pick<
    HomePurchaseAssumptions,
    | "downPaymentPct"
    | "mortgageRateAnnual"
    | "mortgageTermYears"
    | "pmiAnnualPct"
    | "pmiRemovedAtLtv"
    | "maintenanceAnnualPct"
  >;
}) {
  const { t } = useTranslation();
  const c = estimatedMonthlyOwnershipCost(
    open,
    open.medianPrice ?? price,
    home,
  );

  return (
    <>
      {/* --- What it costs each month ------------------------------ */}
      {open.medianPrice && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("countyMap.modal.whatHousesCost", "What houses cost here")}
          </h3>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {money(open.medianPrice)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{open.priceSource}</p>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {open.medianPrice
            ? t(
                "countyMap.modal.monthlyCostOfMedian",
                "Monthly cost of the median house here",
              )
            : t(
                "countyMap.modal.monthlyCostOfPrice",
                "Monthly cost of a {{price}} house",
                { price: money(price) },
              )}
        </h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("countyMap.modal.principalInterest", "Principal & interest")}
            </dt>
            <dd className="tabular-nums">{money(c.pi)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("countyMap.modal.propertySchoolTax", "Property + school tax")}
            </dt>
            <dd className="tabular-nums font-medium">{money(c.tax)}</dd>
          </div>
          {c.pmi > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                {t("countyMap.modal.mortgageInsurance", "Mortgage insurance")}
              </dt>
              <dd className="tabular-nums">{money(c.pmi)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("countyMap.modal.insuranceEst", "Insurance (est.)")}
            </dt>
            <dd className="tabular-nums">{money(c.insurance)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("countyMap.modal.upkeepAccrual", "Upkeep accrual")}
            </dt>
            <dd className="tabular-nums">{money(c.upkeep)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
            <dt className="font-medium text-slate-900">
              {t("countyMap.modal.allIn", "All in")}
            </dt>
            <dd className="tabular-nums text-lg font-semibold">
              {money(c.total)}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
