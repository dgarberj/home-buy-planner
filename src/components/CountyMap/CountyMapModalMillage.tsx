import { useTranslation } from "react-i18next";
import { effectiveRate, type Municipality } from "../../data/localMarket";
import { pct } from "../../lib/format";

/**
 * Where the tax comes from: the raw millage split by county / local /
 * school, plus the effective rate on market value and any local wage tax.
 */
export default function CountyMapModalMillage({
  open,
}: {
  open: Municipality;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t("countyMap.modal.millageBreakdown", "Millage breakdown")}
      </h3>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            {t("countyMap.modal.county", "County")}
          </dt>
          <dd className="tabular-nums">{open.county.toFixed(4)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            {t("countyMap.modal.townshipBorough", "Township / borough")}
          </dt>
          <dd className="tabular-nums">{open.local.toFixed(4)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            {t("countyMap.modal.schoolDistrict", "School district")}
          </dt>
          <dd className="tabular-nums font-medium">{open.school.toFixed(4)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <dt className="font-medium text-slate-900">
            {t("countyMap.modal.total", "Total")}
          </dt>
          <dd className="tabular-nums font-semibold">
            {t("countyMap.modal.mills", "{{value}} mills", {
              value: open.total.toFixed(4),
            })}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            {t(
              "countyMap.modal.effectiveRateOnMarketValue",
              "Effective rate on market value",
            )}
          </dt>
          <dd className="tabular-nums">{pct(effectiveRate(open), 2)}</dd>
        </div>
        {open.wageTax > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t(
                "countyMap.modal.localWageTaxOnEarnings",
                "Local wage tax on earnings",
              )}
            </dt>
            <dd className="tabular-nums text-amber-700">
              {pct(open.wageTax, 2)}
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {t(
          "countyMap.modal.schoolSliceNote",
          "The school slice is usually the biggest, and it is the one that varies most across the county.",
        )}
      </p>
    </section>
  );
}
