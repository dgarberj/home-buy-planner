import { useMemo, useState } from "react";
import { ALL_MUNICIPALITIES, effectiveRate } from "../../data/localMarket";
import { ratingSummary } from "../../data/schools";
import {
  affordabilityTimeline,
  housingBudget,
  waitingVerdict,
} from "../../engine/affordability";
import { runProjection } from "../../engine/projection";
import { money, monthLabel } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import {
  Callout,
  Card,
  Field,
  InfoTip,
  MoneyInput,
  NumberInput,
  SectionTitle,
  Table,
  Td,
  Th,
} from "../ui";

/**
 * "Is it worth saving longer for a house that is out of reach today?"
 *
 * The answer turns on which constraint is actually binding, and people almost
 * always assume it is the deposit. Usually it is not.
 */
export default function WaitingPanel() {
  const { assumptions } = useProjections();
  const settings = useStore((s) => s.settings);

  const [reserve, setReserve] = useState(400);
  const [bufferMonths, setBufferMonths] = useState(3);
  const horizon = Math.min(settings.horizonMonths, 240);

  /**
  Cash if you carry on renting -- the money available to put down.
  */
  const cashTrack = useMemo(
    () =>
      runProjection(
        assumptions,
        {
          id: "rent",
          name: "rent",
          buyMonth: null,
          hasJobLoss: false,
          enabled: true,
          color: "#000",
        },
        horizon,
      ).map((r) => r.liquidSavings),
    [assumptions, horizon],
  );

  const budgetToday = housingBudget(assumptions, {
    atMonth: 1,
    reserveForSavings: reserve,
  });

  const verdicts = useMemo(
    () =>
      ALL_MUNICIPALITIES.filter((m) => m.medianPrice)
        .map((m) => {
          const timeline = affordabilityTimeline(assumptions, {
            medianPriceToday: m.medianPrice!,
            effectiveTaxRate: effectiveRate(m),
            insuranceMonthly: 150,
            months: horizon,
            reserveForSavings: reserve,
            cashTrack,
            bufferMonthsRequired: bufferMonths,
          });
          return { m, verdict: waitingVerdict(m.name, timeline) };
        })
        .toSorted((a, b) => {
          const av = a.verdict.affordableFrom ?? Infinity;
          const bv = b.verdict.affordableFrom ?? Infinity;
          return av - bv || (a.m.medianPrice ?? 0) - (b.m.medianPrice ?? 0);
        }),
    [assumptions, cashTrack, horizon, reserve, bufferMonths],
  );

  const soonest = verdicts.find((v) => v.verdict.affordableFrom !== null);

  const monthCell = (n: number | null) =>
    n === null ? (
      <span className="text-red-600">never</span>
    ) : (
      <>
        {monthLabel(settings.startDate, n)}
        <span className="ml-1.5 text-xs text-slate-400">m{n}</span>
      </>
    );

  return (
    <div className="space-y-5">
      <Card
        title="Is it worth waiting for a better house?"
        subtitle="Two things gate you, and they improve at completely different speeds."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Keep saving each month"
            hint="Held back from the housing budget so you carry on building a cushion after moving in."
          >
            <MoneyInput value={reserve} step={50} onChange={setReserve} />
          </Field>
          <Field
            label="Buffer left after closing (months)"
            hint="Months of total outgoings you want still in the bank the day after you complete."
          >
            <NumberInput
              value={bufferMonths}
              min={0}
              max={12}
              onChange={setBufferMonths}
            />
          </Field>
          <div>
            <SectionTitle>Housing budget today</SectionTitle>
            <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
              {money(budgetToday.monthlyBudget)}
            </p>
          </div>
        </div>

        <Callout tone="neutral">
          <strong>The deposit is rarely the problem.</strong> Saving longer
          fixes the <em>cash</em> constraint — deposit, closing costs, cushion —
          and that improves every month. It does almost nothing for the{" "}
          <em>monthly</em> constraint, which only moves when your pay rises or a
          commitment ends, and moves backwards as prices climb. A house that is
          out of reach on the payment stays out of reach however long you save.
        </Callout>
      </Card>

      <Card
        title="When each town comes within reach"
        subtitle="Both constraints have to clear. The later of the two is what actually gates you."
      >
        <Table minWidthClassName="min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              <Th sticky className="bg-white pb-2 pr-4">
                Town
              </Th>
              <Th align="right" className="pb-2 pr-4">
                Median today
              </Th>
              <Th className="pb-2 pr-4">
                <span className="inline-flex items-center">
                  Payment works from
                  <InfoTip
                    placement="bottom"
                    text="When your budget could carry the monthly cost. Driven by pay rises and commitments ending — not by saving."
                  />
                </span>
              </Th>
              <Th className="pb-2 pr-4">
                <span className="inline-flex items-center">
                  Cash ready
                  <InfoTip
                    placement="bottom"
                    text="When you would have the deposit, closing costs and your chosen buffer. This is the part saving actually fixes."
                  />
                </span>
              </Th>
              <Th className="pb-2 pr-4">Buyable</Th>
              <Th className="pb-2">Schools</Th>
            </tr>
          </thead>
          <tbody>
            {verdicts.map(({ m, verdict }) => {
              const isNever = verdict.affordableFrom === null;
              return (
                <tr
                  key={`${m.countyKey}-${m.name}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <Td sticky className="bg-white py-2 pr-4 font-medium text-slate-900">
                    {m.name}
                  </Td>
                  <Td align="right" className="py-2 pr-4 tabular-nums text-slate-600">
                    {money(m.medianPrice!)}
                  </Td>
                  <Td className="py-2 pr-4 text-slate-600">
                    {monthCell(verdict.monthlyGapClosesAt)}
                  </Td>
                  <Td className="py-2 pr-4 text-slate-600">
                    {monthCell(verdict.cashReadyAt)}
                  </Td>
                  <Td
                    className={`py-2 pr-4 font-semibold ${isNever ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {monthCell(verdict.affordableFrom)}
                  </Td>
                  <Td className="py-2 text-xs text-slate-500">
                    {ratingSummary(m.schoolDistrict) ?? (
                      <span className="text-slate-300">not sourced</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {soonest && (
          <Callout tone="good">
            <strong>
              Soonest in reach: {soonest.m.name}, from{" "}
              {monthLabel(settings.startDate, soonest.verdict.affordableFrom!)}.
            </strong>{" "}
            Anything further up the list costs you extra months of waiting AND a
            bigger payment for the rest of the mortgage. The dashboard shows
            what that does to net worth at 65 — in this model, every upgrade
            costs you, so the question is whether the schools and the space are
            worth the price rather than whether you come out ahead.
          </Callout>
        )}

        <Callout tone="warn">
          <strong>The clock your children are on.</strong> If waiting for a
          better school district means eleven more years of renting, they will
          have spent most of their schooling in the district you were trying to
          leave. Waiting for a house is not free even when the arithmetic says
          you can afford more later.
        </Callout>
      </Card>
    </div>
  );
}
