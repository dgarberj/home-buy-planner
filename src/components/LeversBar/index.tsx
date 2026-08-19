import { useMemo } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Assumptions, ScenarioConfig } from "../../model/types";
import { runAllScenarios } from "../../engine/projection";
import { money } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Toggle } from "../ui";

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

function leverShort(t: TFunction, lever: Lever): string {
  return t(`leversBar.levers.${lever.key}.short`, lever.short);
}

function leverHint(t: TFunction, lever: Lever): string {
  return t(`leversBar.levers.${lever.key}.hint`, lever.hint);
}

/**
Headline effects of one set of assumptions, for comparing against another.
*/
function measure(
  assumptions: Assumptions,
  scenarios: ScenarioConfig[],
  months: number,
  grossAnnualSalary: number,
  ages: number[],
) {
  const summaries = runAllScenarios(
    assumptions,
    scenarios,
    months,
    grossAnnualSalary,
    ages,
  );
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
  const { t } = useTranslation();
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
        settings.grossAnnualSalary,
        settings.milestoneAges,
      );
      const withOff = measure(
        { ...assumptions, ...lever.flip(assumptions, false) } as Assumptions,
        scenarios,
        settings.horizonMonths,
        settings.grossAnnualSalary,
        settings.milestoneAges,
      );
      return {
        lever,
        isOn,
        bufferDelta: withOn.buffer - withOff.buffer,
        netWorthDelta: withOn.netWorth - withOff.netWorth,
      };
    });
  }, [
    assumptions,
    scenarios,
    settings.horizonMonths,
    settings.grossAnnualSalary,
    settings.milestoneAges,
  ]);

  return (
    <div className="border-t border-slate-200 pt-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t("leversBar.title", "Levers")}
      </span>
      <div className="mt-3 flex flex-col gap-3">
        {impacts.map(({ lever, isOn, bufferDelta, netWorthDelta }) => (
          <div
            key={lever.key}
            title={t(
              "leversBar.tooltip",
              "{{hint}}\n\nHaving this ON versus off:\n  thinnest cash {{bufferSign}}{{buffer}}\n  net worth at the horizon {{netWorthSign}}{{netWorth}}",
              {
                hint: leverHint(t, lever),
                bufferSign: bufferDelta >= 0 ? "+" : "",
                buffer: Math.round(bufferDelta).toLocaleString(),
                netWorthSign: netWorthDelta >= 0 ? "+" : "",
                netWorth: Math.round(netWorthDelta).toLocaleString(),
              },
            )}
            className={`rounded-xl border px-3 py-2 text-xs transition ${
              isOn ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <Toggle
              checked={isOn}
              onChange={(isChecked) =>
                setAssumptions(lever.flip(assumptions, isChecked))
              }
              label={leverShort(t, lever)}
            />
            {/* Both numbers describe the lever being ON, so the sign never
                depends on where the switch currently sits. */}
            {(Math.abs(bufferDelta) >= 500 ||
              Math.abs(netWorthDelta) >= 5_000) && (
              <div className="mt-1.5 flex flex-col gap-0.5 pl-14">
                {Math.abs(bufferDelta) >= 500 && (
                  <span
                    className={`tabular-nums ${
                      bufferDelta > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                    title={t(
                      "leversBar.bufferDeltaTitle",
                      "Effect on your thinnest cash of having this ON",
                    )}
                  >
                    {bufferDelta > 0 ? "+" : ""}
                    {money(bufferDelta)} {t("leversBar.cash", "cash")}
                  </span>
                )}
                {Math.abs(netWorthDelta) >= 5_000 && (
                  <span
                    className={`tabular-nums ${
                      netWorthDelta > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                    title={t(
                      "leversBar.netWorthDeltaTitle",
                      "Effect on net worth at the horizon of having this ON",
                    )}
                  >
                    {netWorthDelta > 0 ? "+" : ""}
                    {money(netWorthDelta)} {t("leversBar.longRun", "long run")}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {t(
          "leversBar.footer.pre",
          "Every figure is the effect of that lever being",
        )}{" "}
        <strong>{t("leversBar.footer.on", "ON")}</strong>
        {t(
          "leversBar.footer.post",
          ", so the sign does not change when you flip the switch. Green helps, red costs. Several help one and cost the other — that is the trade, not a mistake.",
        )}
      </p>
    </div>
  );
}
