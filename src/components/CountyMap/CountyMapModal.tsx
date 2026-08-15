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
      subtitle={open ? `${open.schoolDistrict} school district` : undefined}
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
              {onShortlist ? "Remove from shortlist" : "Add to shortlist"}
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
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
                What houses cost here
              </h3>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {money(open.medianPrice)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{open.priceSource}</p>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly cost of{" "}
              {open.medianPrice
                ? "the median house here"
                : `a ${money(price)} house`}
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
                        Principal &amp; interest
                      </dt>
                      <dd className="tabular-nums">{money(c.pi)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Property + school tax</dt>
                      <dd className="tabular-nums font-medium">
                        {money(c.tax)}
                      </dd>
                    </div>
                    {c.pmi > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Mortgage insurance</dt>
                        <dd className="tabular-nums">{money(c.pmi)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Insurance (est.)</dt>
                      <dd className="tabular-nums">{money(c.insurance)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Upkeep accrual</dt>
                      <dd className="tabular-nums">{money(c.upkeep)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                      <dt className="font-medium text-slate-900">All in</dt>
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
              Millage breakdown
            </h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">County</dt>
                <dd className="tabular-nums">{open.county.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Township / borough</dt>
                <dd className="tabular-nums">{open.local.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">School district</dt>
                <dd className="tabular-nums font-medium">
                  {open.school.toFixed(4)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                <dt className="font-medium text-slate-900">Total</dt>
                <dd className="tabular-nums font-semibold">
                  {open.total.toFixed(4)} mills
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  Effective rate on market value
                </dt>
                <dd className="tabular-nums">{pct(effectiveRate(open), 2)}</dd>
              </div>
              {open.wageTax > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Local wage tax on earnings</dt>
                  <dd className="tabular-nums text-amber-700">
                    {pct(open.wageTax, 2)}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              The school slice is usually the biggest, and it is the one that
              varies most across the county.
            </p>
          </section>

          {/* --- Schools ----------------------------------------------- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {open.schoolDistrict} schools
            </h3>
            {detail && detail.mathProficiency !== null ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <StatRow
                  label="Maths proficient"
                  value={`${detail.mathProficiency}%`}
                  sub={`state average ${PA_STATE_AVERAGE.math}%`}
                />
                {detail.readingProficiency !== null && (
                  <StatRow
                    label="Reading proficient"
                    value={`${detail.readingProficiency}%`}
                    sub={`state average ${PA_STATE_AVERAGE.reading}%`}
                  />
                )}
                {detail.graduationRate !== null && (
                  <StatRow
                    label="4-year graduation rate"
                    value={`${detail.graduationRate}%`}
                    sub={`state average ${PA_STATE_AVERAGE.graduation}%`}
                  />
                )}
                {detail.persistentAttendance !== null && (
                  <StatRow
                    label="Attending 90%+ of days"
                    value={`${detail.persistentAttendance}%`}
                    sub={`state average ${PA_STATE_AVERAGE.persistentAttendance}%`}
                  />
                )}
                {detail.sourceSchoolCount !== null && (
                  <p className="pt-1 text-xs text-slate-400">
                    Averaged across {detail.sourceSchoolCount} school
                    {detail.sourceSchoolCount === 1 ? "" : "s"} in this
                    district.
                  </p>
                )}
              </dl>
            ) : (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                No performance figures sourced for this district. That is an
                absence of data, not a bad score — look it up before it sways a
                decision.
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
                {countyInfoFor(open.countyKey).name} hazard risk
              </h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <StatRow
                  label="Inland flooding"
                  value={`${ordinal(risk.floodRiskScore)} pctl`}
                  sub={risk.floodRiskRating}
                />
                <StatRow
                  label="Heat wave"
                  value={`${ordinal(risk.heatWaveRiskScore)} pctl`}
                  sub={risk.heatWaveRiskRating}
                />
                <StatRow
                  label="Wildfire"
                  value={`${ordinal(risk.wildfireRiskScore)} pctl`}
                  sub={risk.wildfireRiskRating}
                />
                <StatRow
                  label="Composite risk (all 18 hazards)"
                  value={`${ordinal(risk.riskScore)} pctl`}
                  emphasize
                />
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                National percentiles from FEMA&rsquo;s National Risk Index — how
                this county compares to the rest of the US, not a probability.
                County-level only: every town in this county shares these
                figures. {risk.note}
              </p>
            </section>
          )}

          <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Pennsylvania taxes assessed value, and buying does not trigger a
            reassessment. This converts a sale price using {open.countyKey}
            &rsquo;s county-wide drift factor of {clrFactorFor(open)}, so it is
            reliable for ranking places and not for budgeting a specific house.
            Raw millage is NOT comparable across county lines — only the
            effective rate is. Check the actual assessment before making an
            offer.
          </p>
        </div>
      )}
    </Modal>
  );
}
