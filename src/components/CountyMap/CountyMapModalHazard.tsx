import { useTranslation } from "react-i18next";
import { countyInfoFor, type Municipality } from "../../data/localMarket";
import type { CountyClimateRisk } from "../../data/climateRisk";
import { ordinal } from "../../lib/format";
import CountyMapStatRow from "./CountyMapStatRow";

/**
 * FEMA National Risk Index percentiles for this county -- flooding, heat,
 * wildfire, and the composite across all 18 hazards. County-level only, so
 * every town in the county shares these figures.
 */
export default function CountyMapModalHazard({
  open,
  risk,
}: {
  open: Municipality;
  risk: CountyClimateRisk;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t("countyMap.modal.countyHazardRisk", "{{county}} hazard risk", {
          county: countyInfoFor(open.countyKey).name,
        })}
      </h3>
      <dl className="mt-3 space-y-1.5 text-sm">
        <CountyMapStatRow
          label={t("countyMap.modal.inlandFlooding", "Inland flooding")}
          value={t("countyMap.modal.pctl", "{{n}} pctl", {
            n: ordinal(risk.floodRiskScore, t),
          })}
          sub={risk.floodRiskRating}
        />
        <CountyMapStatRow
          label={t("countyMap.modal.heatWave", "Heat wave")}
          value={t("countyMap.modal.pctl", "{{n}} pctl", {
            n: ordinal(risk.heatWaveRiskScore, t),
          })}
          sub={risk.heatWaveRiskRating}
        />
        <CountyMapStatRow
          label={t("countyMap.modal.wildfire", "Wildfire")}
          value={t("countyMap.modal.pctl", "{{n}} pctl", {
            n: ordinal(risk.wildfireRiskScore, t),
          })}
          sub={risk.wildfireRiskRating}
        />
        <CountyMapStatRow
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
  );
}
