import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  COUNTY_INFO,
  countyInfoFor,
  effectiveRate,
  estimatedMonthlyTax,
  municipalitiesIn,
  qualityPerDollar,
  rankedByTax,
  type Municipality,
} from "../../data/localMarket";
import { climateRiskFor } from "../../data/climateRisk";
import { ratingBand } from "../../data/schools";
import { money, moneyShort, ordinal, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { InfoTip } from "../ui";
import CountyMapModal from "./CountyMapModal";
import CountyMapTooltip from "./CountyMapTooltip";
import {
  BAND_COLOUR,
  COLS,
  GAP,
  LAYOUT,
  METRICS,
  ROWS,
  TILE,
  shortName,
  tileColour,
  tileStroke,
  tileStrokeWidth,
  type MetricKey,
} from "./countyMapLayout";

/**
 * A tile map of Delaware County.
 *
 * These are NOT real boundaries. Each municipality gets one square, laid out to
 * approximate where it actually sits -- the dense boroughs along the eastern
 * Philadelphia edge, the townships spreading west, the river towns along the
 * bottom. A true boundary map would need Census TIGER shapefiles; for
 * comparing 49 places at a glance, equal-sized tiles are arguably clearer
 * anyway, since a big rural township doesn't visually shout over a small
 * borough.
 *
 * Colour is the tax rate. Hover for the detail.
 */
export default function CountyMap({
  price,
  highlighted = [],
  onPick,
}: {
  price: number;
  /**
  Municipalities to ring, e.g. the ones you are actually considering.
  */
  highlighted?: string[];
  onPick?: (name: string) => void;
}) {
  const { t } = useTranslation();
  const METRIC_LABEL_KEY: Record<MetricKey, string> = {
    price: "countyMap.metrics.price.label",
    taxMonthly: "countyMap.metrics.taxMonthly.label",
    taxRate: "countyMap.metrics.taxRate.label",
    valueScore: "countyMap.metrics.valueScore.label",
  };
  const METRIC_HINT_KEY: Record<MetricKey, string> = {
    price: "countyMap.metrics.price.hint",
    taxMonthly: "countyMap.metrics.taxMonthly.hint",
    taxRate: "countyMap.metrics.taxRate.hint",
    valueScore: "countyMap.metrics.valueScore.hint",
  };
  const METRIC_UNIT_KEY: Record<MetricKey, string> = {
    price: "countyMap.metrics.price.unit",
    taxMonthly: "countyMap.metrics.taxMonthly.unit",
    taxRate: "countyMap.metrics.taxRate.unit",
    valueScore: "countyMap.metrics.valueScore.unit",
  };
  const [hover, setHover] = useState<Municipality | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [open, setOpen] = useState<Municipality | null>(null);
  const [countyKey, setCountyKey] = useState("delaware");
  const home = useStore((s) => s.assumptions.home);
  // Tax rate is the only metric sourced for all 112 municipalities, so it is
  // the default -- picking a price metric first showed a mostly empty map.
  const [metricKey, setMetricKey] = useState<MetricKey>("taxRate");
  const metric = METRICS.find((x) => x.key === metricKey)!;

  /**
   * The tile's headline number, and whether there is one at all.
   * Tax figures use the town's OWN median where known, so a tile never mixes a
   * real local price with a hypothetical one.
   */
  const tileValue = (m: Municipality): { text: string; known: boolean } => {
    if (metricKey === "taxRate")
      return { text: pct(effectiveRate(m), 2), known: true };
    if (metricKey === "valueScore") {
      const q = qualityPerDollar(m, home);
      return q === null
        ? { text: "—", known: false }
        : { text: q.toFixed(1), known: true };
    }
    const basis = m.medianPrice ?? null;
    if (basis === null) return { text: "—", known: false };
    if (metricKey === "price") return { text: moneyShort(basis), known: true };
    return { text: money(estimatedMonthlyTax(basis, m)), known: true };
  };

  const county = countyInfoFor(countyKey);
  const municipalities = municipalitiesIn(countyKey);
  const risk = climateRiskFor(countyKey);

  /**
   * Delaware County has a hand-built geographic layout. The others do not, so
   * their tiles are simply laid out in rows sorted by effective tax rate --
   * honest about what it is rather than pretending to be a map.
   */
  const positionOf = (m: Municipality, index: number): [number, number] => {
    if (county.geographicLayout) return LAYOUT[m.name] ?? [0, 0];
    const perRow = 7;
    return [index % perRow, Math.floor(index / perRow)];
  };
  const ordered = county.geographicLayout
    ? municipalities
    : rankedByTax(countyKey);
  const rows = county.geographicLayout ? ROWS : Math.ceil(ordered.length / 7);
  const cols = county.geographicLayout ? COLS : 7;

  /**
   * Every tile's value, computed once per municipality instead of up to
   * three times (fill known-check, label text, unit known-check) during the
   * SVG render, and shared with the coverage-count banner above the map so
   * that also stops re-scanning the whole county on its own.
   */
  const tileValues = useMemo(() => {
    const map = new Map<string, { text: string; known: boolean }>();
    for (const m of ordered) map.set(m.name, tileValue(m));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tileValue closes over metricKey/home, both already deps
  }, [ordered, metricKey, home]);
  const knownCount = tileValues
    .values()
    .filter((v) => v.known)
    .toArray().length;

  // Scale on EFFECTIVE rate so colours mean the same thing in every county.
  const rates = ordered.map((m) => effectiveRate(m));
  const min = Math.min(...rates);
  const max = Math.max(...rates);

  return (
    <div className="relative">
      {/* --- County switcher --------------------------------------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {COUNTY_INFO.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCountyKey(c.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                c.key === countyKey
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          {t(
            "countyMap.assessmentsDivided",
            "assessments ÷ {{clrFactor}} to reach market value",
            { clrFactor: county.clrFactor },
          )}
        </span>
      </div>

      {/* --- What the tiles are showing -------------------------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">
          {t("countyMap.tilesShow", "Tiles show")}
        </span>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {METRICS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setMetricKey(x.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                x.key === metricKey
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t(METRIC_LABEL_KEY[x.key], x.label)}
            </button>
          ))}
        </div>
        <InfoTip text={t(METRIC_HINT_KEY[metric.key], metric.hint)} />
        {metricKey !== "taxRate" && (
          <span className="text-xs text-amber-700">
            {t(
              "countyMap.coverage",
              "{{known}} of {{total}} towns in this county have {{whatIsSourced}} — the rest show “{{blankLabel}}”",
              {
                known: knownCount,
                total: municipalities.length,
                whatIsSourced:
                  metricKey === "valueScore"
                    ? t(
                        "countyMap.sourcedSchoolDistrict",
                        "a sourced school district",
                      )
                    : t("countyMap.sourcedPrice", "a sourced price"),
                blankLabel:
                  metricKey === "valueScore"
                    ? "—"
                    : t("countyMap.noPrice", "no price"),
              },
            )}
          </span>
        )}
      </div>
      <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
        {county.note}
      </p>
      {risk && (
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-600">
            {t(
              "countyMap.femaHazard",
              "FEMA hazard risk ({{rating}}, {{percentile}} percentile nationally):",
              {
                rating: risk.riskRating.toLowerCase(),
                percentile: ordinal(risk.riskScore, t),
              },
            )}
          </span>{" "}
          {t(
            "countyMap.hazardBreakdown",
            "flooding {{flood}} pctl, heat {{heat}} pctl, wildfire {{wildfire}} pctl.",
            {
              flood: ordinal(risk.floodRiskScore, t),
              heat: ordinal(risk.heatWaveRiskScore, t),
              wildfire: ordinal(risk.wildfireRiskScore, t),
            },
          )}{" "}
          {risk.note}{" "}
          {t(
            "countyMap.hazardCountyLevel",
            "County-level only — every town in {{county}} shares this figure.",
            { county: county.name },
          )}
        </p>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${cols * (TILE + GAP)} ${rows * (TILE + GAP)}`}
          className="w-full min-w-[680px]"
          role="img"
          aria-label={t(
            "countyMap.svgAriaLabel",
            "Tile map of Delaware County municipalities coloured by property tax rate",
          )}
        >
          {ordered.map((m, index) => {
            const pos = positionOf(m, index);
            if (!pos) return null;
            const [col, row] = pos;
            const x = col * (TILE + GAP);
            const y = row * (TILE + GAP);
            const isHighlighted = highlighted.includes(m.name);
            const isHovered = hover?.name === m.name;
            const value = tileValues.get(m.name)!;
            return (
              <g
                key={m.name}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHover(m)}
                onMouseMove={(event_) =>
                  setCursor({ x: event_.clientX, y: event_.clientY })
                }
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  setOpen(m);
                  onPick?.(m.name);
                }}
                className="cursor-pointer"
                role="button"
                aria-label={t(
                  "countyMap.tileAriaLabel",
                  "{{name}}, {{district}} schools",
                  { name: m.name, district: m.schoolDistrict },
                )}
              >
                <rect
                  width={TILE}
                  height={TILE}
                  rx={9}
                  fill={tileColour(effectiveRate(m), min, max)}
                  stroke={tileStroke(isHighlighted, isHovered)}
                  strokeWidth={tileStrokeWidth(isHighlighted, isHovered)}
                />
                <text
                  x={TILE / 2}
                  y={TILE / 2 - 6}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{ fontSize: 10, fontWeight: 600, fill: "#0f172a" }}
                >
                  {shortName(m.name).length > 12
                    ? `${shortName(m.name).slice(0, 11)}…`
                    : shortName(m.name)}
                </text>
                <text
                  x={TILE / 2}
                  y={TILE / 2 + 10}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fill: value.known ? "#0f172a" : "rgba(15,23,42,0.3)",
                  }}
                >
                  {value.text}
                </text>
                {/* Always labelled, so the number can never be misread as a
                    different quantity. */}
                <text
                  x={TILE / 2}
                  y={TILE / 2 + 24}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{ fontSize: 9, fill: "rgba(15,23,42,0.55)" }}
                >
                  {value.known
                    ? t(METRIC_UNIT_KEY[metric.key], metric.unit)
                    : t("countyMap.noPrice", "no price")}
                </text>
                {/* School standing, where it is sourced. */}
                <circle
                  cx={TILE - 11}
                  cy={11}
                  r={4}
                  className="pointer-events-none"
                  fill={BAND_COLOUR[ratingBand(m.schoolDistrict)]}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* --- Legend ------------------------------------------------------ */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: "hsl(140,62%,78%)" }}
          />
          {t("countyMap.legend.lowTax", "low tax ({{pct}} of value)", {
            pct: pct(min, 2),
          })}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: "hsl(0,62%,64%)" }}
          />
          {t("countyMap.legend.highTax", "high tax ({{pct}})", {
            pct: pct(max, 2),
          })}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: BAND_COLOUR.strong }}
          />
          {t("countyMap.legend.wellAbove", "well above state average")}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: BAND_COLOUR.above }}
          />
          {t("countyMap.legend.above", "above state average")}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: BAND_COLOUR.below }}
          />
          {t("countyMap.legend.below", "below")}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: BAND_COLOUR.unknown }}
          />
          {t("countyMap.legend.notSourced", "not sourced")}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-2 border-blue-700" />
          {t("countyMap.legend.shortlisted", "shortlisted")}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        <Trans
          i18nKey="countyMap.footerCaption"
          components={{ b: <strong /> }}
          values={{
            metricLabel: t(
              METRIC_LABEL_KEY[metric.key],
              metric.label,
            ).toLowerCase(),
            unit: t(METRIC_UNIT_KEY[metric.key], metric.unit),
          }}
        >
          Every tile shows <b>{"{{metricLabel}}"}</b>, labelled “{"{{unit}}"}”.
          Colour is always the tax rate. Tax figures use each town's own median
          home, so nothing here is a hypothetical house. Click any township for
          the full breakdown.
        </Trans>{" "}
        {county.geographicLayout
          ? t(
              "countyMap.footerGeographic",
              "Tiles are arranged roughly geographically, but they are schematic, not real boundaries.",
            )
          : t(
              "countyMap.footerRanked",
              "Tiles are ordered by tax rate, cheapest first — no geography implied.",
            )}
      </p>

      {/* --- Hover tooltip, following the cursor -------------------------- */}
      {hover && (
        <CountyMapTooltip hover={hover} cursor={cursor} price={price} />
      )}

      {/* --- Detail modal ------------------------------------------------- */}
      <CountyMapModal open={open} onClose={() => setOpen(null)} price={price} />
    </div>
  );
}
