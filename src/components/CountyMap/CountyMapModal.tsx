import { useTranslation } from "react-i18next";
import {
  clrFactorFor,
  countyInfoFor,
  effectiveRate,
  estimatedMonthlyOwnershipCost,
  type Municipality,
} from "../../data/localMarket";
import { climateRiskFor } from "../../data/climateRisk";
import { districtFor, PA_STATE_AVERAGE } from "../../data/schools";
import { money, ordinal, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Button, Modal } from "../ui";

const COUNTY_KEY_LABEL: Record<string, string> = {
  delaware: "marketPanel.townCard.county.delaware",
  montgomery: "marketPanel.townCard.county.montgomery",
};

/**
 * One label/value/sub-value line, shared by the schools and hazard-risk
 * sections below since both are "a handful of stats, each with an optional
 * state-average or rating annotation" -- factored out rather than repeating
 * the same `<div className="flex justify-between gap-4">...` block per stat.
 */
function StatRow({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${emphasize ? "border-t border-slate-200 pt-2" : ""}`}
    >
      <dt
        className={emphasize ? "font-medium text-slate-900" : "text-slate-600"}
      >
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasize ? "font-semibold" : "font-medium"}`}
      >
        {value}
        {sub && (
          <span className="ml-1 text-xs font-normal text-slate-400">{sub}</span>
        )}
      </dd>
    </div>
  );
}

/**
Full detail on one municipality: cost breakdown, millage, and schools.
*/
export default function CountyMapModal({
  open,
  onClose,
  price,
}: {
  open: Municipality | null;
  onClose: () => void;
  price: number;
}) {
  const { t } = useTranslation();
  const assumptions = useStore((s) => s.assumptions);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const detail = open ? districtFor(open.schoolDistrict) : null;
  const risk = open ? climateRiskFor(open.countyKey) : null;
  const onShortlist = open ? settings.shortlist.includes(open.name) : false;

  return (
    <Modal
      open={open !== null}
      onClose={onClose}
      title={open?.name ?? ""}
      subtitle={
        open
          ? t("countyMap.modal.schoolDistrictSubtitle", "{{district}} school district", {
              district: open.schoolDistrict,
            })
          : undefined
      }
      footer={
        open && (
          <>
            <Button
              onClick={() =>
                setSettings({
                  shortlist: onShortlist
                    ? settings.shortlist.filter((n) => n !== open.name)
                    : [...settings.shortlist, open.name],
                })
              }
            >
              {onShortlist
                ? t("countyMap.modal.removeFromShortlist", "Remove from shortlist")
                : t("countyMap.modal.addToShortlist", "Add to shortlist")}
            </Button>
            <Button variant="primary" onClick={onClose}>
              {t("countyMap.modal.done", "Done")}
            </Button>
          </>
        )
      }
    >
      {open && (
        <div className="space-y-6">
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
              {(() => {
                const c = estimatedMonthlyOwnershipCost(
                  open,
                  open.medianPrice ?? price,
                  assumptions.home,
                );
                return (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        {t(
                          "countyMap.modal.principalInterest",
                          "Principal & interest",
                        )}
                      </dt>
                      <dd className="tabular-nums">{money(c.pi)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        {t(
                          "countyMap.modal.propertySchoolTax",
                          "Property + school tax",
                        )}
                      </dt>
                      <dd className="tabular-nums font-medium">
                        {money(c.tax)}
                      </dd>
                    </div>
                    {c.pmi > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">
                          {t(
                            "countyMap.modal.mortgageInsurance",
                            "Mortgage insurance",
                          )}
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
                  </>
                );
              })()}
            </dl>
          </section>

          {/* --- Where the tax comes from ------------------------------ */}
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
                  {t(
                    "countyMap.modal.townshipBorough",
                    "Township / borough",
                  )}
                </dt>
                <dd className="tabular-nums">{open.local.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  {t("countyMap.modal.schoolDistrict", "School district")}
                </dt>
                <dd className="tabular-nums font-medium">
                  {open.school.toFixed(4)}
                </dd>
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

          {/* --- Schools ----------------------------------------------- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("countyMap.modal.districtSchools", "{{district}} schools", {
                district: open.schoolDistrict,
              })}
            </h3>
            {detail && detail.mathProficiency !== null ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <StatRow
                  label={t("countyMap.modal.mathsProficient", "Maths proficient")}
                  value={`${detail.mathProficiency}%`}
                  sub={t(
                    "countyMap.modal.stateAverage",
                    "state average {{pct}}%",
                    { pct: PA_STATE_AVERAGE.math },
                  )}
                />
                {detail.readingProficiency !== null && (
                  <StatRow
                    label={t(
                      "countyMap.modal.readingProficient",
                      "Reading proficient",
                    )}
                    value={`${detail.readingProficiency}%`}
                    sub={t(
                      "countyMap.modal.stateAverage",
                      "state average {{pct}}%",
                      { pct: PA_STATE_AVERAGE.reading },
                    )}
                  />
                )}
                {detail.graduationRate !== null && (
                  <StatRow
                    label={t(
                      "countyMap.modal.graduationRate",
                      "4-year graduation rate",
                    )}
                    value={`${detail.graduationRate}%`}
                    sub={t(
                      "countyMap.modal.stateAverage",
                      "state average {{pct}}%",
                      { pct: PA_STATE_AVERAGE.graduation },
                    )}
                  />
                )}
                {detail.persistentAttendance !== null && (
                  <StatRow
                    label={t(
                      "countyMap.modal.attendance",
                      "Attending 90%+ of days",
                    )}
                    value={`${detail.persistentAttendance}%`}
                    sub={t(
                      "countyMap.modal.stateAverage",
                      "state average {{pct}}%",
                      { pct: PA_STATE_AVERAGE.persistentAttendance },
                    )}
                  />
                )}
                {detail.sourceSchoolCount !== null && (
                  <p className="pt-1 text-xs text-slate-400">
                    {t(
                      "countyMap.modal.averagedAcross",
                      `Averaged across {{count}} school${detail.sourceSchoolCount === 1 ? "" : "s"} in this district.`,
                      { count: detail.sourceSchoolCount },
                    )}
                  </p>
                )}
              </dl>
            ) : (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                {t(
                  "countyMap.modal.noPerformanceFigures",
                  "No performance figures sourced for this district. That is an absence of data, not a bad score — look it up before it sways a decision.",
                )}
              </p>
            )}
            {detail?.note && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {detail.note}
              </p>
            )}
          </section>

          {/* --- Natural hazard risk ------------------------------------ */}
          {risk && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("countyMap.modal.countyHazardRisk", "{{county}} hazard risk", {
                  county: countyInfoFor(open.countyKey).name,
                })}
              </h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <StatRow
                  label={t("countyMap.modal.inlandFlooding", "Inland flooding")}
                  value={t("countyMap.modal.pctl", "{{n}} pctl", {
                    n: ordinal(risk.floodRiskScore, t),
                  })}
                  sub={risk.floodRiskRating}
                />
                <StatRow
                  label={t("countyMap.modal.heatWave", "Heat wave")}
                  value={t("countyMap.modal.pctl", "{{n}} pctl", {
                    n: ordinal(risk.heatWaveRiskScore, t),
                  })}
                  sub={risk.heatWaveRiskRating}
                />
                <StatRow
                  label={t("countyMap.modal.wildfire", "Wildfire")}
                  value={t("countyMap.modal.pctl", "{{n}} pctl", {
                    n: ordinal(risk.wildfireRiskScore, t),
                  })}
                  sub={risk.wildfireRiskRating}
                />
                <StatRow
                  label={t(
                    "countyMap.modal.compositeRisk",
                    "Composite risk (all 18 hazards)",
                  )}
                  value={t("countyMap.modal.pctl", "{{n}} pctl", {
                    n: ordinal(risk.riskScore, t),
                  })}
                  emphasize
                />
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t(
                  "countyMap.modal.hazardFooter",
                  "National percentiles from FEMA's National Risk Index — how this county compares to the rest of the US, not a probability. County-level only: every town in this county shares these figures.",
                )}{" "}
                {risk.note}
              </p>
            </section>
          )}

          <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            {t(
              "countyMap.modal.assessmentFooter",
              "Pennsylvania taxes assessed value, and buying does not trigger a reassessment. This converts a sale price using {{county}}'s county-wide drift factor of {{clrFactor}}, so it is reliable for ranking places and not for budgeting a specific house. Raw millage is NOT comparable across county lines — only the effective rate is. Check the actual assessment before making an offer.",
              {
                county: t(COUNTY_KEY_LABEL[open.countyKey] ?? "", open.countyKey),
                clrFactor: clrFactorFor(open),
              },
            )}
          </p>
        </div>
      )}
    </Modal>
  );
}
