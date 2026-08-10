import { useMemo, useState } from "react";
import { ALL_MUNICIPALITIES, effectiveRate } from "../../data/localMarket";
import { ratingSummary } from "../../data/schools";
import {
  cashToClose,
  classifyReach,
  housingBudget,
  maxAffordablePrice,
  monthlyCostOfHouse,
  type Reach,
} from "../../engine/affordability";
import { money, pct } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Button, Callout, Card, Field, InfoTip, MoneyInput, SectionTitle, Toggle } from "../ui";

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

export default function AffordabilityTable() {
  const { assumptions, settings, setSettings } = useStore();

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

  return (
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
            <span className="ml-1 text-sm font-normal text-slate-400">/mo</span>
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
                  settings.shortlist.includes(row.m.name) ? "bg-blue-50/50" : ""
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
          Showing {visible.length} of {ALL_MUNICIPALITIES.length} municipalities
          across three counties. {pricedCount} have a sourced median price; the
          rest are sorted by tax rate and show{" "}
          <span className="text-slate-400">&mdash;</span> where a price would
          go.
        </p>
      </div>
    </Card>
  );
}
