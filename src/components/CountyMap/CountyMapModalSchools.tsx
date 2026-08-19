import { useTranslation } from "react-i18next";
import { type Municipality } from "../../data/localMarket";
import { PA_STATE_AVERAGE, type SchoolDistrict } from "../../data/schools";
import CountyMapStatRow from "./CountyMapStatRow";

/**
 * The district's proficiency/attendance/graduation figures against the PA
 * state average, or an explicit "not sourced" note when none of that is
 * available -- an absence of data should never read as a bad score.
 */
export default function CountyMapModalSchools({
  open,
  detail,
}: {
  open: Municipality;
  detail: SchoolDistrict | null;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t("countyMap.modal.districtSchools", "{{district}} schools", {
          district: open.schoolDistrict,
        })}
      </h3>
      {detail && detail.mathProficiency !== null ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          <CountyMapStatRow
            label={t("countyMap.modal.mathsProficient", "Maths proficient")}
            value={`${detail.mathProficiency}%`}
            sub={t("countyMap.modal.stateAverage", "state average {{pct}}%", {
              pct: PA_STATE_AVERAGE.math,
            })}
          />
          {detail.readingProficiency !== null && (
            <CountyMapStatRow
              label={t(
                "countyMap.modal.readingProficient",
                "Reading proficient",
              )}
              value={`${detail.readingProficiency}%`}
              sub={t("countyMap.modal.stateAverage", "state average {{pct}}%", {
                pct: PA_STATE_AVERAGE.reading,
              })}
            />
          )}
          {detail.graduationRate !== null && (
            <CountyMapStatRow
              label={t(
                "countyMap.modal.graduationRate",
                "4-year graduation rate",
              )}
              value={`${detail.graduationRate}%`}
              sub={t("countyMap.modal.stateAverage", "state average {{pct}}%", {
                pct: PA_STATE_AVERAGE.graduation,
              })}
            />
          )}
          {detail.persistentAttendance !== null && (
            <CountyMapStatRow
              label={t("countyMap.modal.attendance", "Attending 90%+ of days")}
              value={`${detail.persistentAttendance}%`}
              sub={t("countyMap.modal.stateAverage", "state average {{pct}}%", {
                pct: PA_STATE_AVERAGE.persistentAttendance,
              })}
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
  );
}
