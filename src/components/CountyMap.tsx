import { useState } from 'react';
import {
  COUNTY_INFO,
  clrFactorFor,
  effectiveRate,
  estimatedMonthlyTax,
  municipalitiesIn,
  rankedByTax,
  type Municipality,
} from '../data/localMarket';
import { districtFor, ratingBand, ratingSummary, PA_AVERAGE } from '../data/schools';
import { monthlyNominal, monthlyPayment } from '../engine/finance';
import { money, moneyShort, pct } from '../lib/format';
import { useStore } from '../store/useStore';
import { Button, InfoTip, Modal } from './ui';

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

/** [column, row] roughly following county geography. West is left, south is down. */
const LAYOUT: Record<string, [number, number]> = {
  Radnor: [7, 0], Haverford: [8, 0], Millbourne: [9, 0],
  Newtown: [6, 1], Marple: [7, 1], 'Darby, Upper': [8, 1], 'East Lansdowne': [9, 1],
  Edgmont: [5, 2], 'Providence, Upper': [6, 2], Springfield: [7, 2], 'Clifton Heights': [8, 2], Lansdowne: [9, 2], Yeadon: [10, 2],
  Thornbury: [4, 3], Middletown: [5, 3], Media: [6, 3], Morton: [7, 3], Aldan: [8, 3], Colwyn: [9, 3], 'Darby Borough': [10, 3],
  'Chadds Ford': [3, 4], Concord: [4, 4], 'Rose Valley': [5, 4], 'Providence, Nether': [6, 4], Rutledge: [7, 4], Collingdale: [8, 4], 'Darby Township': [9, 4],
  Bethel: [3, 5], 'Chester Heights': [4, 5], Aston: [5, 5], Swarthmore: [6, 5], 'Ridley Township': [7, 5], Folcroft: [8, 5], 'Sharon Hill': [9, 5],
  'Chichester, Upper': [3, 6], Brookhaven: [4, 6], Parkside: [5, 6], 'Chester Township': [6, 6], Glenolden: [7, 6], Norwood: [8, 6], 'Prospect Park': [9, 6],
  'Chichester, Lower': [2, 7], 'Marcus Hook': [3, 7], Trainer: [4, 7], Upland: [5, 7], 'Chester City': [6, 7], Eddystone: [7, 7], 'Ridley Park': [8, 7], Tinicum: [9, 7],
};

const TILE = 78;
const GAP = 5;
const COLS = 11;
const ROWS = 8;

/** Green where tax is low, red where it is high. */
function tileColour(rate: number, min: number, max: number): string {
  const t = (rate - min) / (max - min || 1);
  // 140deg (green) down to 0deg (red).
  const hue = 140 - t * 140;
  return `hsl(${hue}, 62%, ${78 - t * 14}%)`;
}

/** Short enough to fit inside a tile. */
function shortName(name: string): string {
  return name
    .replace('Chichester, Lower', 'Lwr Chich')
    .replace('Chichester, Upper', 'Upr Chich')
    .replace('Providence, Nether', 'Nether Prov')
    .replace('Providence, Upper', 'Upper Prov')
    .replace('Darby, Upper', 'Upper Darby')
    .replace(' Township', ' Twp')
    .replace(' Borough', ' Boro')
    .replace('East Lansdowne', 'E Lansdowne');
}

/**
 * What the big number on each tile means.
 *
 * This used to vary per tile -- a median house price where one was sourced, a
 * monthly tax bill where one wasn't. Both render as "$241,515" and "$488" with
 * no label, so there was no way to tell which quantity you were looking at.
 * Now every tile shows the same metric and the legend says which.
 */
const METRICS = [
  {
    key: 'price' as const,
    label: 'Median home price',
    unit: 'median',
    hint: 'Typical home value in this town. Blank where no price could be sourced — which is an absence of data, not a cheap town.',
  },
  {
    key: 'taxMonthly' as const,
    label: 'Property tax per month',
    unit: 'tax/mo',
    hint: "Monthly property and school tax on this town's own median home, so the figures are comparable as lived costs rather than on a hypothetical house.",
  },
  {
    key: 'taxRate' as const,
    label: 'Tax rate',
    unit: 'of value',
    hint: 'Annual property and school tax as a share of market value. The only figure that compares directly across county lines.',
  },
];

type MetricKey = (typeof METRICS)[number]['key'];

/** Colour for the little school dot on each tile. */
const BAND_COLOUR: Record<string, string> = {
  strong: '#15803d',
  above: '#65a30d',
  below: '#b45309',
  unknown: 'rgba(15,23,42,0.18)',
};

export default function CountyMap({
  price,
  highlighted = [],
  onPick,
}: {
  price: number;
  /** Municipalities to ring, e.g. the ones you are actually considering. */
  highlighted?: string[];
  onPick?: (name: string) => void;
}) {
  const [hover, setHover] = useState<Municipality | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [open, setOpen] = useState<Municipality | null>(null);
  const [countyKey, setCountyKey] = useState('delaware');
  // Tax rate is the only metric sourced for all 112 municipalities, so it is
  // the default -- picking a price metric first showed a mostly empty map.
  const [metricKey, setMetricKey] = useState<MetricKey>('taxRate');
  const metric = METRICS.find((x) => x.key === metricKey)!;

  /**
   * The tile's headline number, and whether there is one at all.
   * Tax figures use the town's OWN median where known, so a tile never mixes a
   * real local price with a hypothetical one.
   */
  const tileValue = (m: Municipality): { text: string; known: boolean } => {
    const basis = m.medianPrice ?? null;
    if (metricKey === 'taxRate') return { text: pct(effectiveRate(m), 2), known: true };
    if (basis === null) return { text: '—', known: false };
    if (metricKey === 'price') return { text: moneyShort(basis), known: true };
    return { text: money(estimatedMonthlyTax(basis, m)), known: true };
  };

  const county = COUNTY_INFO.find((c) => c.key === countyKey) ?? COUNTY_INFO[0]!;
  const municipalities = municipalitiesIn(countyKey);

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
  const ordered = county.geographicLayout ? municipalities : rankedByTax(countyKey);
  const rows = county.geographicLayout ? ROWS : Math.ceil(ordered.length / 7);
  const cols = county.geographicLayout ? COLS : 7;

  const assumptions = useStore((s) => s.assumptions);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  // Scale on EFFECTIVE rate so colours mean the same thing in every county.
  const rates = ordered.map((m) => effectiveRate(m));
  const min = Math.min(...rates);
  const max = Math.max(...rates);

  const detail = open ? districtFor(open.schoolDistrict) : null;
  const onShortlist = open ? settings.shortlist.includes(open.name) : false;

  /** Full monthly cost of owning here, for the modal. */
  const costOf = (m: Municipality, atPrice: number) => {
    const home = assumptions.home;
    const loan = atPrice * (1 - home.downPaymentPct);
    const pi = monthlyPayment(
      loan,
      monthlyNominal(home.mortgageRateAnnual),
      home.mortgageTermYears * 12,
    );
    const tax = estimatedMonthlyTax(atPrice, m);
    const pmi = home.downPaymentPct < 0.2 ? (loan * home.pmiAnnualPct) / 12 : 0;
    const upkeep = (atPrice * home.maintenanceAnnualPct) / 12;
    return { pi, tax, pmi, upkeep, insurance: 150, total: pi + tax + pmi + upkeep + 150 };
  };

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
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          assessments ÷ {county.clrFactor} to reach market value
        </span>
      </div>

      {/* --- What the tiles are showing -------------------------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Tiles show</span>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {METRICS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setMetricKey(x.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                x.key === metricKey
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <InfoTip text={metric.hint} />
        {metricKey !== 'taxRate' && (
          <span className="text-xs text-amber-700">
            {municipalities.filter((m) => m.medianPrice).length} of {municipalities.length} towns in
            this county have a sourced price — the rest show &ldquo;no price&rdquo;
          </span>
        )}
      </div>
      <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">{county.note}</p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${cols * (TILE + GAP)} ${rows * (TILE + GAP)}`}
          className="w-full min-w-[680px]"
          role="img"
          aria-label="Tile map of Delaware County municipalities coloured by property tax rate"
        >
          {ordered.map((m, index) => {
            const pos = positionOf(m, index);
            if (!pos) return null;
            const [col, row] = pos;
            const x = col * (TILE + GAP);
            const y = row * (TILE + GAP);
            const isHighlighted = highlighted.includes(m.name);
            const isHovered = hover?.name === m.name;
            return (
              <g
                key={m.name}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHover(m)}
                onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  setOpen(m);
                  onPick?.(m.name);
                }}
                className="cursor-pointer"
                role="button"
                aria-label={`${m.name}, ${m.schoolDistrict} schools`}
              >
                <rect
                  width={TILE}
                  height={TILE}
                  rx={9}
                  fill={tileColour(effectiveRate(m), min, max)}
                  stroke={isHighlighted ? '#1d4ed8' : isHovered ? '#0f172a' : 'rgba(15,23,42,0.10)'}
                  strokeWidth={isHighlighted ? 3 : isHovered ? 2 : 1}
                />
                <text
                  x={TILE / 2}
                  y={TILE / 2 - 6}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{ fontSize: 10, fontWeight: 600, fill: '#0f172a' }}
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
                    fill: tileValue(m).known ? '#0f172a' : 'rgba(15,23,42,0.3)',
                  }}
                >
                  {tileValue(m).text}
                </text>
                {/* Always labelled, so the number can never be misread as a
                    different quantity. */}
                <text
                  x={TILE / 2}
                  y={TILE / 2 + 24}
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{ fontSize: 9, fill: 'rgba(15,23,42,0.55)' }}
                >
                  {tileValue(m).known ? metric.unit : 'no price'}
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
          <span className="h-3 w-3 rounded-sm" style={{ background: 'hsl(140,62%,78%)' }} />
          low tax ({pct(min, 2)} of value)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: 'hsl(0,62%,64%)' }} />
          high tax ({pct(max, 2)})
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOUR.strong }} />
          top-100 PA district
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOUR.above }} />
          above state average
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOUR.below }} />
          below
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOUR.unknown }} />
          not sourced
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-2 border-blue-700" />
          shortlisted
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Every tile shows <strong>{metric.label.toLowerCase()}</strong>, labelled &ldquo;
        {metric.unit}&rdquo;. Colour is always the tax rate. Tax figures use each town&rsquo;s own
        median home, so nothing here is a hypothetical house. Click any township for the full
        breakdown.{' '}
        {county.geographicLayout
          ? 'Tiles are arranged roughly geographically, but they are schematic, not real boundaries.'
          : 'Tiles are ordered by tax rate, cheapest first — no geography implied.'}
      </p>

      {/* --- Hover tooltip, following the cursor -------------------------- */}
      {hover && (
        <div
          className="pointer-events-none fixed z-40 w-64 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white shadow-xl"
          style={{
            // Nudge away from the cursor, and flip near the right/bottom edge.
            left: Math.min(cursor.x + 16, window.innerWidth - 272),
            top: Math.min(cursor.y + 16, window.innerHeight - 150),
          }}
        >
          <div className="text-sm font-semibold">{hover.name}</div>
          <div className="mt-0.5 text-xs text-slate-300">{hover.schoolDistrict} schools</div>

          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Median home price</dt>
              <dd className="font-semibold tabular-nums">
                {hover.medianPrice ? money(hover.medianPrice) : <span className="text-slate-500">not sourced</span>}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">
                Property tax {hover.medianPrice ? 'on that' : `on ${money(price)}`}
              </dt>
              <dd className="font-semibold tabular-nums">
                {money(estimatedMonthlyTax(hover.medianPrice ?? price, hover))} / month
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Tax rate</dt>
              <dd className="tabular-nums">{pct(effectiveRate(hover), 2)} of value</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Total millage</dt>
              <dd className="tabular-nums">{hover.total.toFixed(2)} mills</dd>
            </div>
          </dl>

          <div className="mt-2 border-t border-slate-700 pt-2 text-xs">
            {ratingSummary(hover.schoolDistrict) ? (
              <span className="flex items-start gap-1.5">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: BAND_COLOUR[ratingBand(hover.schoolDistrict)] }}
                />
                <span className="text-slate-200">{ratingSummary(hover.schoolDistrict)}</span>
              </span>
            ) : (
              <span className="text-slate-400">School performance not sourced</span>
            )}
          </div>

          {hover.wageTax > 0 && (
            <div className="mt-1.5 text-xs text-amber-300">
              {pct(hover.wageTax, 2)} local wage tax
            </div>
          )}
          <div className="mt-2 text-[11px] text-slate-500">Click for the full breakdown</div>
        </div>
      )}

      {/* --- Detail modal ------------------------------------------------- */}
      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.name ?? ''}
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
                {onShortlist ? 'Remove from shortlist' : 'Add to shortlist'}
              </Button>
              <Button variant="primary" onClick={() => setOpen(null)}>
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
                Monthly cost of {open.medianPrice ? 'the median house here' : `a ${money(price)} house`}
              </h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                {(() => {
                  const c = costOf(open, open.medianPrice ?? price);
                  return (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Principal &amp; interest</dt>
                        <dd className="tabular-nums">{money(c.pi)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Property + school tax</dt>
                        <dd className="tabular-nums font-medium">{money(c.tax)}</dd>
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
                        <dd className="tabular-nums text-lg font-semibold">{money(c.total)}</dd>
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
                  <dd className="tabular-nums font-medium">{open.school.toFixed(4)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                  <dt className="font-medium text-slate-900">Total</dt>
                  <dd className="tabular-nums font-semibold">{open.total.toFixed(4)} mills</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Effective rate on market value</dt>
                  <dd className="tabular-nums">{pct(effectiveRate(open), 2)}</dd>
                </div>
                {open.wageTax > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">Local wage tax on earnings</dt>
                    <dd className="tabular-nums text-amber-700">{pct(open.wageTax, 2)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                The school slice is usually the biggest, and it is the one that varies most across
                the county.
              </p>
            </section>

            {/* --- Schools ----------------------------------------------- */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {open.schoolDistrict} schools
              </h3>
              {detail && (detail.mathProficiency !== null || detail.paRank2025 !== null) ? (
                <dl className="mt-3 space-y-1.5 text-sm">
                  {detail.paRank2025 !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Pennsylvania rank (2025)</dt>
                      <dd className="tabular-nums font-medium">#{detail.paRank2025}</dd>
                    </div>
                  )}
                  {detail.nationalRank !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">National rank (Niche)</dt>
                      <dd className="tabular-nums">#{detail.nationalRank}</dd>
                    </div>
                  )}
                  {detail.mathProficiency !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Maths proficient</dt>
                      <dd className="tabular-nums font-medium">
                        {detail.mathProficiency}%
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          state average {PA_AVERAGE.math}%
                        </span>
                      </dd>
                    </div>
                  )}
                  {detail.readingProficiency !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Reading proficient</dt>
                      <dd className="tabular-nums font-medium">
                        {detail.readingProficiency}%
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          state average {PA_AVERAGE.reading}%
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                  No performance figures sourced for this district. That is an absence of data, not
                  a bad score — look it up before it sways a decision.
                </p>
              )}
              {detail?.note && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{detail.note}</p>
              )}
            </section>

            <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Pennsylvania taxes assessed value, and buying does not trigger a reassessment. This
              converts a sale price using {open.countyKey}&rsquo;s county-wide drift factor of{' '}
              {clrFactorFor(open)}, so it is reliable for ranking places and not for budgeting a
              specific house. Raw millage is NOT comparable across county lines — only the
              effective rate is. Check the actual assessment before making an offer.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
