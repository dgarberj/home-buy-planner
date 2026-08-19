import { useTranslation } from "react-i18next";
import { IRA_LIMITS, RETIREMENT_TARGETS } from "../../data/contributionLimits";
import { money, pct } from "../../lib/format";
import { InfoTip, SectionTitle } from "../ui";
import { hsaCoverageLabel, type ContributionFigures } from "./TargetsCard.calc";

/**
 * "Where the target comes from" -- the right column of the targets card,
 * breaking the yearly target and employer money down line by line.
 */
export default function TargetsBreakdown({
  figures,
}: {
  figures: ContributionFigures;
}) {
  const { t } = useTranslation();
  const {
    gross,
    hasK401Plan,
    hasHsaPlan,
    hasIraPlan,
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    k401Ceiling,
    target401k,
    targetHsa,
    iraRoom,
    targetTotal,
    targetMatch,
    actualEmployerTotal,
    monthlyTarget,
  } = figures;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <SectionTitle>
        {t(
          "contributionGauges.targets.whereFrom.title",
          "Where the target comes from",
        )}
      </SectionTitle>
      <dl className="space-y-2 text-sm">
        {(hasK401Plan || hasHsaPlan || hasIraPlan) && (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("contributionGauges.targets.outOfYourPay", "Out of your pay")}
          </div>
        )}
        {hasHsaPlan && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t(
                "contributionGauges.targets.hsaRoomLeft.label",
                "HSA room left to you",
              )}
              <InfoTip
                text={t(
                  "contributionGauges.targets.hsaRoomLeft.hint",
                  "The {{limit}} {{tier}} limit counts employer and employee money together, so your employer's {{bonus}} bonus reduces your own room rather than adding to it. Putting in the full limit yourself on top of the bonus would be an excess contribution, and penalised.",
                  {
                    limit: money(hsaLimit),
                    tier: hsaCoverageLabel(t, hsaCoverageTier).toLowerCase(),
                    bonus: money(employerHsaAnnualBonus),
                  },
                )}
              />
            </dt>
            <dd className="whitespace-nowrap font-medium tabular-nums">
              {money(targetHsa)}
            </dd>
          </div>
        )}
        {hasK401Plan && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t(
                "contributionGauges.targets.k401Share.label",
                "401(k), your share of a {{targetPct}} combined target",
                {
                  targetPct: pct(RETIREMENT_TARGETS.combinedK401TargetPct, 0),
                },
              )}
              <InfoTip
                text={t(
                  "contributionGauges.targets.k401Share.hint",
                  "Netted against the recurring employer match you're actually getting, the same way the HSA line nets off the employer seed above.",
                )}
              />
            </dt>
            <dd className="whitespace-nowrap font-medium tabular-nums">
              {money(target401k)}
            </dd>
          </div>
        )}
        {hasIraPlan && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("contributionGauges.targets.iraRoom.label", "Roth IRA room")}
              <InfoTip
                text={t(
                  "contributionGauges.targets.iraRoom.hint",
                  "Phased down from the IRS limit once MAGI enters the phase-out range; zero above it.",
                )}
              />
            </dt>
            <dd className="whitespace-nowrap font-medium tabular-nums">
              {money(iraRoom)}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <dt className="font-medium text-slate-900">
            {t("contributionGauges.targets.yourTotal", "Your total a year")}
          </dt>
          <dd className="whitespace-nowrap font-semibold tabular-nums">
            {money(targetTotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            {t("contributionGauges.targets.perMonth", "Per month")}
          </dt>
          <dd className="whitespace-nowrap font-medium tabular-nums">
            {money(monthlyTarget)}
          </dd>
        </div>

        {(hasK401Plan || hasHsaPlan) && (
          <div className="pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t(
              "contributionGauges.targets.fromEmployer",
              "From your employer — a calculated number, not a target of its own",
            )}
          </div>
        )}
        {hasK401Plan && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                {t(
                  "contributionGauges.targets.k401MatchLine",
                  "401(k) match, {{pct}} monthly",
                  { pct: pct(RETIREMENT_TARGETS.employerMatchPct, 1) },
                )}
              </dt>
              <dd className="whitespace-nowrap font-medium tabular-nums">
                {money(targetMatch)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                {t(
                  "contributionGauges.targets.k401LumpLine",
                  "401(k) January lump, {{pct}}",
                  { pct: pct(RETIREMENT_TARGETS.employerAnnual401kPct, 1) },
                )}
              </dt>
              <dd className="whitespace-nowrap font-medium tabular-nums">
                {money(gross * RETIREMENT_TARGETS.employerAnnual401kPct)}
              </dd>
            </div>
          </>
        )}
        {hasHsaPlan && employerHsaAnnualBonus > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t("contributionGauges.targets.hsaBonus", "HSA one-time bonus")}
            </dt>
            <dd className="whitespace-nowrap font-medium tabular-nums">
              {money(employerHsaAnnualBonus)}
            </dd>
          </div>
        )}
        {(hasK401Plan || hasHsaPlan) && (
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
            <dt className="font-medium text-slate-900">
              {t(
                "contributionGauges.targets.employerTotal",
                "Employer total a year",
              )}
            </dt>
            <dd className="whitespace-nowrap font-semibold tabular-nums">
              {money(actualEmployerTotal)}
            </dd>
          </div>
        )}

        <div className="flex justify-between gap-4 border-t-2 border-slate-300 pt-2">
          <dt className="font-semibold text-slate-900">
            {t(
              "contributionGauges.targets.everythingGoingIn",
              "Everything going in",
            )}
          </dt>
          <dd className="whitespace-nowrap font-semibold tabular-nums">
            {money(targetTotal + actualEmployerTotal)}
            <span className="ml-1 text-xs font-normal text-slate-400">
              {t(
                "contributionGauges.targets.percentOfSalary",
                "{{pct}} of salary",
                {
                  pct: pct((targetTotal + actualEmployerTotal) / gross, 1),
                },
              )}
            </span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
        {t(
          "contributionGauges.targets.wellInsideCeilings",
          "Well inside the legal ceilings: {{items}} in 2026.",
          {
            items: [
              hasHsaPlan &&
                t(
                  "contributionGauges.targets.ceilingHsa",
                  "{{limit}} for a {{tier}} HSA",
                  {
                    limit: money(hsaLimit),
                    tier: hsaCoverageLabel(t, hsaCoverageTier).toLowerCase(),
                  },
                ),
              hasK401Plan &&
                t(
                  "contributionGauges.targets.ceiling401k",
                  "{{limit}} for a 401(k)",
                  { limit: money(k401Ceiling) },
                ),
              hasIraPlan &&
                t(
                  "contributionGauges.targets.ceilingIra",
                  "{{limit}} for a Roth IRA",
                  { limit: money(IRA_LIMITS.contribution2026) },
                ),
            ]
              .filter(Boolean)
              .join(", "),
          },
        )}
      </p>
    </div>
  );
}
