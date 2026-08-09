import { useMemo, useState } from "react";
import {
  ALL_MUNICIPALITIES,
  DELCO_CLR_FACTOR,
  NEIGHBOURING_COUNTIES,
  effectiveRate,
  estimatedMonthlyTax,
  type Municipality,
} from "../data/localMarket";
import { monthlyPayment, monthlyNominal } from "../engine/finance";
import { money, pct } from "../lib/format";
import { useStore } from "../store/useStore";
import { pmiRateFor, CONVENTIONAL_97 } from "../data/mortgageInsurance";
import { districtFor, ratingSummary } from "../data/schools";
import {
  cashToClose,
  classifyReach,
  housingBudget,
  maxAffordablePrice,
  monthlyCostOfHouse,
  type Reach,
} from "../engine/affordability";
import CountyMap from "./CountyMap";
import {
  Button,
  Callout,
  Card,
  Field,
  InfoTip,
  MoneyInput,
  NumberInput,
  SectionTitle,
  Toggle,
} from "./ui";

/**
 * Where to buy, costed properly.
 *
 * In Delaware County the same house carries wildly different tax bills
 * depending on which side of a township line it sits on. On a median-priced
 * house that gap is several hundred dollars a month -- bigger than most of the
 * levers elsewhere in this app. This panel makes it pickable.
 */
const REACH_LABEL: Record<Reach, string> = {
  comfortable: "Comfortable",
  stretch: "A stretch",
  "out-of-reach": "Out of reach",
  unknown: "Unknown",
};

const REACH_STYLE: Record<Reach, string> = {
  comfortable: "bg-emerald-100 text-emerald-800",
  stretch: "bg-amber-100 text-amber-800",
  "out-of-reach": "bg-red-100 text-red-700",
  unknown: "bg-slate-100 text-slate-500",
};

export default function MarketPanel() {
  const { assumptions, setAssumptions, settings, setSettings } = useStore();
  const home = assumptions.home;

  const [price, setPrice] = useState(home.targetPrice);
  const [selected, setSelected] = useState<string>(
    settings.shortlist[0] ?? "Marple",
  );

  const creditScore = settings.creditScore;
  const pmiRate = pmiRateFor(home.downPaymentPct, creditScore);

  // ---- Affordability ---------------------------------------------------
  const [reserve, setReserve] = useState(400);
  // Measured after the car loan clears, since that is when the real budget
  // arrives and it is well before any plausible purchase.
  const budget = useMemo(
    () =>
      housingBudget(assumptions, { atMonth: 12, reserveForSavings: reserve }),
    [assumptions, reserve],
  );
  const ceilingPrice = useMemo(
    () =>
      maxAffordablePrice(assumptions, {
        monthlyBudget: budget.monthlyBudget,
        effectiveTaxRate: 0.018,
        insuranceMonthly: 150,
      }),
    [assumptions, budget.monthlyBudget],
  );

  /**
   * EVERY municipality, not just the ones with a sourced price.
   *
   * An earlier version filtered to towns with a median price and quietly
   * dropped 94 of 112 -- all of which have complete tax and school data. A
   * missing price is a gap in what I could source, not a reason to hide a town.
   * Priced towns sort first by monthly cost; the rest follow by tax rate.
   */
  const affordability = useMemo(() => {
    const rows = ALL_MUNICIPALITIES.map((m) => {
      const rate = effectiveRate(m);
      const max = maxAffordablePrice(assumptions, {
        monthlyBudget: budget.monthlyBudget,
        effectiveTaxRate: rate,
        insuranceMonthly: 150,
      });
      const cost = m.medianPrice
        ? monthlyCostOfHouse(assumptions, {
            price: m.medianPrice,
            effectiveTaxRate: rate,
            insuranceMonthly: 150,
          })
        : null;
      return { m, rate, max, cost, reach: classifyReach(m.medianPrice, max) };
    });

    return rows.toSorted((a, b) => {
      if (a.cost && b.cost) return a.cost.total - b.cost.total;
      if (a.cost) return -1;
      if (b.cost) return 1;
      return a.rate - b.rate;
    });
  }, [assumptions, budget.monthlyBudget]);

  const pricedCount = affordability.filter((r) => r.cost).length;
  const [pricedOnly, setPricedOnly] = useState(false);
  const visible = pricedOnly
    ? affordability.filter((r) => r.cost)
    : affordability;

  /**
  Full monthly cost of owning here: loan + tax + insurance + upkeep.
  */
  const monthlyCost = (m: Municipality, p: number) => {
    const loan = p * (1 - home.downPaymentPct);
    const pi = monthlyPayment(
      loan,
      monthlyNominal(home.mortgageRateAnnual),
      home.mortgageTermYears * 12,
    );
    const tax = estimatedMonthlyTax(p, m);
    const insurance = 150; // rough homeowner's premium; excluded from the tax figures
    const upkeep = (p * home.maintenanceAnnualPct) / 12;
    return { pi, tax, insurance, upkeep, total: pi + tax + insurance + upkeep };
  };

  return (
    <div className="space-y-5">
      <Card
        title="Delaware County at a glance"
        subtitle="Every municipality, coloured by tax. Hover for millage, school performance and the monthly cost. Click to select."
      >
        <CountyMap
          price={price}
          highlighted={settings.shortlist}
          onPick={(name) => setSelected(name)}
        />
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-44">
            <SectionTitle>Price to test</SectionTitle>
            <MoneyInput value={price} step={5000} onChange={setPrice} />
          </div>
          <div className="w-44">
            <SectionTitle>Shortlist</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {settings.shortlist.length === 0 && (
                <span className="text-xs text-slate-400">None yet</span>
              )}
              {settings.shortlist.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    setSettings({
                      shortlist: settings.shortlist.filter((n) => n !== name),
                    })
                  }
                  className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                  title="Remove from shortlist"
                >
                  {name} ✕
                </button>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() =>
              !settings.shortlist.includes(selected) &&
              setSettings({ shortlist: [...settings.shortlist, selected] })
            }
          >
            Add {selected} to shortlist
          </Button>
        </div>
      </Card>

      {settings.shortlist.length >= 2 && (
        <Card
          title="Head to head"
          subtitle={`Your shortlist on a ${money(price)} house, at ${pct(home.downPaymentPct, 0)} down.`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {settings.shortlist.map((name) => {
              const mu = ALL_MUNICIPALITIES.find((x) => x.name === name);
              if (!mu) return null;
              const cost = monthlyCost(mu, price);
              const loan = price * (1 - home.downPaymentPct);
              const pmi = (loan * pmiRate) / 12;
              const district = districtFor(mu.schoolDistrict);
              return (
                <div
                  key={name}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">{name}</h4>
                    <span className="whitespace-nowrap text-lg font-semibold tabular-nums">
                      {money(cost.total + pmi)}/mo
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
                      <dd className="tabular-nums">
                        {pmi > 0 ? money(pmi) : "—"}
                      </dd>
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
      )}

      <Card
        title="Low deposit, strong credit"
        subtitle="A Conventional 97 needs 3% down. What that costs depends almost entirely on your credit score."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Credit score"
            hint="Sets the mortgage-insurance rate. The gap between 760+ and 680 is enormous on a small deposit."
          >
            <NumberInput
              value={creditScore}
              min={580}
              max={850}
              step={10}
              onChange={(v) => setSettings({ creditScore: v })}
            />
          </Field>
          <Field
            label="Down payment"
            hint="3% is the Conventional 97 minimum. 20% avoids mortgage insurance entirely."
          >
            <div className="flex flex-wrap gap-1.5">
              {[0.03, 0.05, 0.1, 0.2].map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() =>
                    setAssumptions({ home: { downPaymentPct: dp } })
                  }
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    Math.abs(home.downPaymentPct - dp) < 0.001
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pct(dp, 0)}
                </button>
              ))}
            </div>
          </Field>
          <div>
            <SectionTitle>Mortgage insurance</SectionTitle>
            <p className="whitespace-nowrap text-xl font-semibold tabular-nums">
              {pmiRate > 0
                ? `${money((price * (1 - home.downPaymentPct) * pmiRate) / 12)}/mo`
                : "None"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pmiRate > 0
                ? `${pct(pmiRate, 2)} of the loan a year`
                : "Deposit is 20% or more"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() =>
              setAssumptions({
                home: { pmiAnnualPct: pmiRate, pmiUpfrontPct: 0 },
              })
            }
          >
            Apply this mortgage-insurance rate
          </Button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {CONVENTIONAL_97.note} Rates here are indicative published tables —
          insurers price individually on credit, debt-to-income and property
          type, so get a real quote before committing.
        </p>
      </Card>

      <Card
        title="What you can actually afford, and where"
        subtitle="Each town judged against its OWN median house price, not a hypothetical one. Ranking by tax rate alone points you at places you cannot buy."
      >
        <div className="mb-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          <Field
            label="Reserve for saving"
            hint="Held back from the housing budget each month so you keep building a buffer after moving in."
          >
            <MoneyInput value={reserve} step={50} onChange={setReserve} />
          </Field>
          <div>
            <SectionTitle>Available for housing</SectionTitle>
            <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
              {money(budget.monthlyBudget)}
              <span className="ml-1 text-sm font-normal text-slate-400">
                /mo
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              all-in: loan, tax, insurance, mortgage insurance and upkeep
            </p>
          </div>
          <div>
            <SectionTitle>Rough ceiling</SectionTitle>
            <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
              {money(ceilingPrice)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              at a typical {pct(0.018, 1)} effective tax rate — higher-tax towns
              buy less
            </p>
          </div>
        </div>

        <Callout tone="warn">
          <strong>The trap in the tax table.</strong> The lowest rates sit under
          the best schools, and those are exactly the places you cannot buy.
          Radnor is 1.26% with a {money(1_206_000)} median. Marple is 1.09% with
          a {money(651_500)} median. A cheap rate on a house out of reach is
          worth nothing.
        </Callout>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Town
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  County
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span className="inline-flex items-center">
                    Median price
                    <InfoTip
                      placement="bottom"
                      text="Typical home value from Zillow or Redfin, 2026. Towns with no sourced price are listed at the bottom rather than guessed at."
                    />
                  </span>
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tax rate
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span className="inline-flex items-center">
                    All-in / month
                    <InfoTip
                      placement="bottom"
                      text="What the typical house here would cost you monthly: loan, property and school tax, insurance, mortgage insurance and upkeep."
                    />
                  </span>
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cash to close
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reach
                </th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Schools
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={`${row.m.countyKey}-${row.m.name}`}
                  className={`border-b border-slate-100 last:border-0 ${
                    settings.shortlist.includes(row.m.name)
                      ? "bg-blue-50/50"
                      : ""
                  }`}
                >
                  <td className="py-2 pr-4 font-medium text-slate-900">
                    {row.m.name}
                    {row.m.wageTax >= 0.02 && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {pct(row.m.wageTax, 2)} wage tax
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 capitalize text-slate-500">
                    {row.m.countyKey}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right tabular-nums ${
                      row.m.medianPrice ? "text-slate-900" : "text-slate-300"
                    }`}
                  >
                    {row.m.medianPrice ? money(row.m.medianPrice) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                    {pct(row.rate, 2)}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right font-semibold tabular-nums ${
                      row.cost ? "text-slate-900" : "text-slate-300"
                    }`}
                  >
                    {row.cost ? money(row.cost.total) : "—"}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right tabular-nums ${
                      row.m.medianPrice ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {row.m.medianPrice
                      ? money(cashToClose(assumptions, row.m.medianPrice))
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${REACH_STYLE[row.reach]}`}
                    >
                      {REACH_LABEL[row.reach]}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-slate-500">
                    {ratingSummary(row.m.schoolDistrict) ?? (
                      <span className="text-slate-300">not sourced</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      size="sm"
                      onClick={() =>
                        setSettings({
                          shortlist: settings.shortlist.includes(row.m.name)
                            ? settings.shortlist.filter((n) => n !== row.m.name)
                            : [...settings.shortlist, row.m.name],
                        })
                      }
                    >
                      {settings.shortlist.includes(row.m.name)
                        ? "Listed"
                        : "Shortlist"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Toggle
            checked={pricedOnly}
            onChange={setPricedOnly}
            label="Only show towns with a sourced price"
            hint="Off by default. The other towns still have complete tax and school data — a missing price is a gap in what I could source, not a reason to hide them."
          />
          <p className="text-xs text-slate-500">
            Showing {visible.length} of {ALL_MUNICIPALITIES.length}{" "}
            municipalities across three counties. {pricedCount} have a sourced
            median price; the rest are sorted by tax rate and show{" "}
            <span className="text-slate-400">&mdash;</span> where a price would
            go.
          </p>
        </div>
      </Card>

      <Card
        title="Delaware County against its neighbours"
        subtitle="Median sale prices and typical all-in effective tax rates."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {NEIGHBOURING_COUNTIES.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-slate-200 p-4"
            >
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

      <Callout tone="bad">
        <strong>Read this before trusting any number above.</strong>{" "}
        Pennsylvania taxes the <em>assessed</em> value, not what you pay.
        Delaware County last reassessed for 2021 using 2020 values, and{" "}
        <strong>buying does not trigger a reassessment</strong> — so two
        identical houses next door to each other can carry very different bills,
        permanently. These estimates divide the sale price by the state&rsquo;s
        common level ratio factor ({DELCO_CLR_FACTOR}), which is a county-wide
        average. Use this table to rank places; look up the actual assessment
        before making an offer on an actual house.
      </Callout>
    </div>
  );
}
