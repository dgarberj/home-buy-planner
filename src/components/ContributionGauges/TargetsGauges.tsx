import { useTranslation } from "react-i18next";
import { IRA_LIMITS, RETIREMENT_TARGETS } from "../../data/contributionLimits";
import { money, pct } from "../../lib/format";
import Gauge from "./Gauge";
import {
  filingStatusLabel,
  hsaCoverageLabel,
  type ContributionFigures,
} from "./TargetsCard.calc";

/**
 * The stacked HSA / 401(k) / Roth IRA gauges -- the left column of the
 * targets card. Pure render, all numbers come in via `figures`.
 */
export default function TargetsGauges({
  figures,
  isHsaPaused,
}: {
  figures: ContributionFigures;
  isHsaPaused: boolean;
}) {
  const { t } = useTranslation();
  const {
    hasHsaPlan,
    hasK401Plan,
    hasIraPlan,
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    targetHsa,
    actualHsa,
    savingsHsa,
    yourMarginalRate,
    gross,
    filingStatus,
    savings401k,
    actual401kCombined,
    target401kCombined,
    iraRoom,
    magi,
    actualIra,
  } = figures;

  return (
    <div className="space-y-6">
      {hasHsaPlan && (
        <div>
          <Gauge
            label={t(
              "contributionGauges.targets.hsaGauge.label",
              "Stage 1 · HSA",
            )}
            hint={t(
              "contributionGauges.targets.hsaGauge.hint",
              "What comes out of your own pay for the HSA. Legal ceiling for 2026: {{limit}}/yr {{tier}}, counting employer money — set by HDHP coverage tier, not filing status. Your employer's {{bonus}} one-time bonus reduces your own room to {{room}}, rather than adding on top of it. Also pre-tax, saving about {{savings}}/yr in federal tax at your {{rate}} marginal rate. Max this first — it's the most tax-efficient dollar available, before the 401(k) match or a Roth IRA.",
              {
                limit: money(hsaLimit),
                tier: hsaCoverageLabel(t, hsaCoverageTier).toLowerCase(),
                bonus: money(employerHsaAnnualBonus),
                room: money(targetHsa),
                savings: money(savingsHsa),
                rate: pct(yourMarginalRate, 0),
              },
            )}
            actual={actualHsa}
            target={targetHsa}
            redBelow={0.5}
            greenAbove={1}
          />
          {isHsaPaused && (
            <p className="mt-1 text-xs font-medium text-amber-600">
              {t(
                "contributionGauges.targets.hsaPaused",
                "Paused — redirected to the deposit fund instead of the HSA.",
              )}
            </p>
          )}
        </div>
      )}
      {hasK401Plan && (
        <Gauge
          label={t(
            "contributionGauges.targets.k401Gauge.label",
            "Stage 2 · 401(k) match",
          )}
          hint={t(
            "contributionGauges.targets.k401Gauge.hint",
            "Your own 401(k) election plus your employer's recurring monthly match, combined, as a share of gross salary — green means the two together reach {{targetPct}} of {{gross}}. The January profit-share lump doesn't count toward this target; it's discretionary employer money, not something to plan an election around. Your own share is pre-tax, so at your {{rate}} federal marginal rate ({{status}}) it saves about {{savings}}/yr in federal tax.",
            {
              targetPct: pct(RETIREMENT_TARGETS.combinedK401TargetPct, 0),
              gross: money(gross),
              rate: pct(yourMarginalRate, 0),
              status: filingStatusLabel(t, filingStatus).toLowerCase(),
              savings: money(savings401k),
            },
          )}
          actual={actual401kCombined}
          target={target401kCombined}
          redBelow={0.5}
          greenAbove={1}
        />
      )}
      {hasIraPlan && (
        <Gauge
          label={t(
            "contributionGauges.targets.iraGauge.label",
            "Stage 3 · Roth IRA",
          )}
          hint={
            iraRoom <= 0
              ? t(
                  "contributionGauges.targets.iraGauge.hintPhaseOut",
                  "At an estimated MAGI of {{magi}} ({{status}}), you're above the 2026 phase-out ceiling, so a direct Roth contribution isn't available this year. A backdoor Roth is the usual workaround, but that's outside what this model tracks.",
                  {
                    magi: money(magi),
                    status: filingStatusLabel(t, filingStatus).toLowerCase(),
                  },
                )
              : t(
                  "contributionGauges.targets.iraGauge.hint",
                  "What you put into a Roth IRA each month, post-tax. 2026 limit is {{limit}}/yr, but at an estimated MAGI of {{magi}} ({{status}}) your room is phased down to {{room}}/yr. Fund this last — the HSA and the 401(k) match come first.",
                  {
                    limit: money(IRA_LIMITS.contribution2026),
                    magi: money(magi),
                    status: filingStatusLabel(t, filingStatus).toLowerCase(),
                    room: money(iraRoom),
                  },
                )
          }
          actual={actualIra}
          target={iraRoom}
          redBelow={0.5}
          greenAbove={1}
          unavailable={
            iraRoom <= 0
              ? t(
                  "contributionGauges.targets.iraGauge.unavailable",
                  "Not eligible this year — income is above the Roth phase-out ceiling.",
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
