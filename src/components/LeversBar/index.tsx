import { useMemo } from "react";
import type { Assumptions, ScenarioConfig } from "../../model/types";
import { runAllScenarios } from "../../engine/projection";
import { money } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";

/**
 * The handful of switches that actually change the answer, pinned to the top.
 *
 * The app has grown to fourteen sections and the decisions that matter are
 * scattered across them. These are the ones worth flipping repeatedly, so they
 * follow you down the page — and each shows what flipping it would do, so the
 * levers rank themselves by impact rather than by where I happened to put them.
 */

interface Lever {
  key: string;
  label: string;
  short: string;
  on: (a: Assumptions) => boolean;
  /**
  Produce the assumptions with this lever flipped.
  */
  flip: (a: Assumptions, isEnabled: boolean) => Partial<Assumptions>;
  hint: string;
}

const LEVERS: Lever[] = [
  {
    key: "second-income",
    label: "Wife returns to work",
    short: "Second income",
    on: (a) => a.secondIncome.enabled,
    flip: (a, isEnabled) => ({
      secondIncome: { ...a.secondIncome, enabled: isEnabled },
    }),
    hint: "Adds her take-home from the start month, less childcare until school age. The largest long-run lever here — and it rules out K-FIT, which is income-tested.",
  },
  {
    key: "co-resident",
    label: "Co-resident income",
    short: "Co-resident income",
    on: (a) => a.coResident.enabled,
    flip: (a, isEnabled) => ({
      coResident: { ...a.coResident, enabled: isEnabled },
    }),
    hint: "Her contribution starts only once you own somewhere with room for her, and adds a premium to the house price. Her income does not stop if you lose your job.",
  },
  {
    key: "hsa-medical",
    label: "Pay medical from the HSA",
    short: "HSA pays medical",
    on: (a) => a.retirement.hsaPayMedical,
    flip: (a, isEnabled) => ({
      retirement: { ...a.retirement, hsaPayMedical: isEnabled },
    }),
    hint: "Covers the monthly medical bill from the HSA instead of from cash. Tax-free either way — you are trading thirty years of compounding for liquidity now.",
  },
  {
    key: "hsa-reimbursement",
    label: "Reimburse from the HSA at closing",
    short: "HSA lump at closing",
    on: (a) => a.retirement.hsaTakeReimbursement,
    flip: (a, isEnabled) => ({
      retirement: { ...a.retirement, hsaTakeReimbursement: isEnabled },
    }),
    hint: "A one-off claim for past qualified expenses, landing in the month you buy. Only claim what your receipts actually support.",
  },
  {
    key: "pause-hsa",
    label: "Divert HSA to the deposit",
    short: "Divert HSA",
    on: (a) => a.retirement.pauseHsaMax,
    flip: (a, isEnabled) => ({
      retirement: { ...a.retirement, pauseHsaMax: isEnabled },
    }),
    hint: "Stop maxing the HSA and put the difference towards the deposit until you have closed. Fastest way to build the buffer, and it gives up the best tax treatment you have.",
  },
  {
    key: "assistance",
    label: "Take K-FIT assistance",
    short: "K-FIT",
    on: (a) => a.home.assistanceEnabled,
    flip: (a, isEnabled) => ({
      home: { ...a.home, assistanceEnabled: isEnabled },
    }),
    hint: "5% of the purchase price, forgiven over ten years. Income-tested against a household limit, so it is incompatible with her earning.",
  },
];

/**
Headline effects of one set of assumptions, for comparing against another.
*/
function measure(
  assumptions: Assumptions,
  scenarios: ScenarioConfig[],
  months: number,
  ages: number[],
) {
  const summaries = runAllScenarios(assumptions, scenarios, months, ages);
  if (summaries.length === 0) return { buffer: 0, netWorth: 0 };
  return {
    // The worst case across the scenarios you have switched on -- the buffer is
    // a risk measure, so the weakest one is what matters.
    buffer: Math.min(...summaries.map((s) => s.minCashBuffer)),
    netWorth:
      summaries.reduce((sum, s) => sum + s.endingNetWorth, 0) /
      summaries.length,
  };
}

export default function LeversBar() {
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const scenarios = useStore((s) => s.scenarios);
  const settings = useStore((s) => s.settings);

  /**
   * Always measured as the value of having the lever ON, whatever its current
   * state.
   *
   * An earlier version reported "what flipping it would do", which meant the
   * sign of every number depended on the switch position -- a lever that was
   * already on showed the gain from turning it OFF. That reads as the opposite
   * of what it is, and it misled me before it misled anyone else. On-minus-off
   * is unambiguous.
   */
  const impacts = useMemo(() => {
    return LEVERS.map((lever) => {
      const isOn = lever.on(assumptions);
      const withOn = measure(
        { ...assumptions, ...lever.flip(assumptions, true) } as Assumptions,
        scenarios,
        settings.horizonMonths,
        settings.milestoneAges,
      );
      const withOff = measure(
        { ...assumptions, ...lever.flip(assumptions, false) } as Assumptions,
        scenarios,
        settings.horizonMonths,
        settings.milestoneAges,
      );
      return {
        lever,
        isOn,
        bufferDelta: withOn.buffer - withOff.buffer,
        netWorthDelta: withOn.netWorth - withOff.netWorth,
      };
    });
  }, [assumptions, scenarios, settings.horizonMonths, settings.milestoneAges]);

  return (
    <div className="border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Levers
          </span>
          {impacts.map(({ lever, isOn, bufferDelta, netWorthDelta }) => (
            <button
              key={lever.key}
              type="button"
              onClick={() => setAssumptions(lever.flip(assumptions, !isOn))}
              title={`${lever.hint}\n\nHaving this ON versus off:\n  thinnest cash ${
                bufferDelta >= 0 ? "+" : ""
              }${Math.round(bufferDelta).toLocaleString()}\n  net worth at the horizon ${
                netWorthDelta >= 0 ? "+" : ""
              }${Math.round(netWorthDelta).toLocaleString()}`}
              className={`group flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 text-xs font-medium transition ${
                isOn
                  ? "border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {/* A small track and knob, anchored so it cannot drift. */}
              <span
                className={`relative h-4 w-7 shrink-0 overflow-hidden rounded-full transition-colors ${
                  isOn ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                    isOn ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="whitespace-nowrap">{lever.short}</span>
              {/* Both numbers describe the lever being ON, so the sign never
                  depends on where the switch currently sits. */}
              {Math.abs(bufferDelta) >= 500 && (
                <span
                  className={`whitespace-nowrap tabular-nums ${
                    bufferDelta > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                  title="Effect on your thinnest cash of having this ON"
                >
                  {bufferDelta > 0 ? "+" : ""}
                  {money(bufferDelta)} cash
                </span>
              )}
              {Math.abs(netWorthDelta) >= 5_000 && (
                <span
                  className={`whitespace-nowrap tabular-nums ${
                    netWorthDelta > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                  title="Effect on net worth at the horizon of having this ON"
                >
                  {netWorthDelta > 0 ? "+" : ""}
                  {money(netWorthDelta)} long run
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Every figure is the effect of that lever being <strong>ON</strong>, so
          the sign does not change when you flip the switch. Green helps, red
          costs. Several help one and cost the other — that is the trade, not a
          mistake.
        </p>
      </div>
    </div>
  );
}
