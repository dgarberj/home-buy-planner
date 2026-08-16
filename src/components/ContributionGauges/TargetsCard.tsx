import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  HSA_LIMITS,
  IRA_LIMITS,
  K401_LIMITS,
  RETIREMENT_TARGETS,
  employeeHsaRoom,
  rothIraRoom,
} from "../../data/contributionLimits";
import {
  STANDARD_DEDUCTION_2026,
  federalTaxOn,
  marginalRate,
  type FilingStatus,
} from "../../data/taxBrackets";
import { money, pct } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import {
  Callout,
  Card,
  Field,
  InfoTip,
  MoneyInput,
  PercentInputWithMonthly,
  SectionTitle,
  Select,
  Toggle,
} from "../ui";
import Gauge from "./Gauge";

const FILING_STATUS_LABEL: Record<FilingStatus, string> = {
  single: "Single",
  marriedJoint: "Married filing jointly",
};

const HSA_COVERAGE_LABEL: Record<"selfOnly" | "family", string> = {
  selfOnly: "Self-only",
  family: "Family",
};

function filingStatusLabel(t: TFunction, status: FilingStatus): string {
  return t(
    `contributionGauges.targets.filingStatus.${status}`,
    FILING_STATUS_LABEL[status],
  );
}

function hsaCoverageLabel(t: TFunction, tier: "selfOnly" | "family"): string {
  return t(
    `contributionGauges.targets.hsaCoverage.${tier}`,
    HSA_COVERAGE_LABEL[tier],
  );
}

function toneForLeftAfterTargets(
  leftAfterTargets: number,
): "bad" | "warn" | "good" {
  if (leftAfterTargets < 200) return "bad";
  if (leftAfterTargets < 600) return "warn";
  return "good";
}

function fundedTargetsLabel(
  t: TFunction,
  hasHsaPlan: boolean,
  hasK401Plan: boolean,
  hasIraPlan: boolean,
): string {
  const stages = [
    hasHsaPlan && t("contributionGauges.targets.stageHsa", "the HSA"),
    hasK401Plan &&
      t("contributionGauges.targets.stage401kMatch", "the 401(k) match"),
    hasIraPlan && t("contributionGauges.targets.stageRothIra", "the Roth IRA"),
  ].filter((s): s is string => Boolean(s));
  if (stages.length === 0) {
    return t("contributionGauges.targets.fundingNothing", "Funding nothing");
  }
  if (stages.length === 1) {
    return t("contributionGauges.targets.fundingOne", "Funding {{stage}}", {
      stage: stages[0],
    });
  }
  return t(
    "contributionGauges.targets.fundingMany",
    "Funding {{stages}} and {{last}}",
    { stages: stages.slice(0, -1).join(", "), last: stages.at(-1) },
  );
}

/**
 * Every number the card and its callout need, derived once so the component
 * body itself stays a render function rather than a second place doing math.
 */
function computeContributionFigures(
  assumptions: ReturnType<typeof useProjections>["assumptions"],
  settings: ReturnType<typeof useStore.getState>["settings"],
) {
  const gross = settings.grossAnnualSalary;
  const filingStatus = settings.filingStatus;
  const hasK401Plan = assumptions.retirement.hasK401Plan;
  const hasHsaPlan = assumptions.retirement.hasHsaPlan;
  const hasIraPlan = assumptions.retirement.hasIraPlan;
  const hsaCoverageTier = assumptions.retirement.hsaCoverageTier;
  const employerHsaAnnualBonus = hasHsaPlan
    ? assumptions.retirement.employerHsaAnnualBonus
    : 0;

  const hsaLimit =
    HSA_LIMITS[hsaCoverageTier === "selfOnly" ? "selfOnly2026" : "family2026"];
  const k401Ceiling = K401_LIMITS.employeeDeferral2026;

  // ---- Stage 1: HSA --------------------------------------------------------
  // The employer's HSA bonus eats into the employee's own room rather than
  // sitting on top of the limit, so the gauge target nets it out using the
  // actual bonus entered below, not a fixed assumption.
  const targetHsa = hasHsaPlan
    ? employeeHsaRoom(hsaCoverageTier, employerHsaAnnualBonus)
    : 0;
  const actualHsa = hasHsaPlan ? assumptions.retirement.hsaMonthly * 12 : 0;

  // ---- Stage 2: 401(k) match -----------------------------------------------
  // The priority isn't maxing the legal ceiling, it's capturing the
  // employer match: green means employee + employer RECURRING match
  // together reach 10% of gross. The January profit-share lump is
  // discretionary employer money, so it is excluded from this target on
  // purpose (it still counts in "everything going in" below).
  const actual401k = hasK401Plan
    ? assumptions.retirement.k401Pct * gross
    : 0;
  const actualMatchRecurring = hasK401Plan
    ? assumptions.retirement.employerMatchMonthly * 12
    : 0;
  const target401kCombined = hasK401Plan
    ? gross * RETIREMENT_TARGETS.combinedK401TargetPct
    : 0;
  const actual401kCombined = actual401k + actualMatchRecurring;
  // The employee's own share of that combined target, netting off the
  // match they are actually getting -- mirrors how the HSA target nets off
  // the employer seed above. Used for the "money out of your pay" total,
  // not for the gauge itself (which compares the combined figures).
  const target401k = hasK401Plan
    ? Math.max(0, target401kCombined - actualMatchRecurring)
    : 0;

  // ---- Stage 3: Roth IRA ----------------------------------------------------
  // MAGI is approximated as gross salary less pre-tax 401(k)/HSA
  // contributions -- pre-tax deductions reduce AGI, which approximates MAGI
  // for a household without foreign income or other add-backs. `gross` is
  // base salary before bonus (see Settings), so this tends to UNDERSTATE
  // true MAGI for a bonus-heavy household.
  const magi = Math.max(0, gross - actual401k - actualHsa);
  const iraRoom = hasIraPlan ? rothIraRoom(magi, filingStatus) : 0;
  const actualIra = hasIraPlan ? assumptions.retirement.iraMonthly * 12 : 0;

  const targetTotal = target401k + targetHsa + iraRoom;

  // ---- Employer money (informational only -- no gauge, it's a calculated
  // total from the match, the 401(k) lump, and the HSA bonus) -------------
  const targetMatch = hasK401Plan
    ? gross * RETIREMENT_TARGETS.employerMatchPct
    : 0;

  const actualMatch = hasK401Plan
    ? actualMatchRecurring + assumptions.retirement.employerAnnualLump
    : 0;
  const actualEmployerTotal = actualMatch + employerHsaAnnualBonus;
  const monthlyTarget = targetTotal / 12;

  // ---- Federal tax savings from pre-tax contributions -------------------
  // Display only: derived from gross salary + filing status, does not touch
  // income.monthlyTakeHome or any projection maths. Cumulative, not a flat
  // rate x contribution, so it stays correct when a contribution straddles
  // a bracket boundary.
  const taxableIncome = Math.max(
    0,
    gross - STANDARD_DEDUCTION_2026[filingStatus],
  );
  const taxableAfter401k = Math.max(0, taxableIncome - actual401k);
  const taxableAfterHsa = Math.max(0, taxableAfter401k - actualHsa);
  const savings401k =
    federalTaxOn(taxableIncome, filingStatus) -
    federalTaxOn(taxableAfter401k, filingStatus);
  const savingsHsa =
    federalTaxOn(taxableAfter401k, filingStatus) -
    federalTaxOn(taxableAfterHsa, filingStatus);
  const yourMarginalRate = marginalRate(gross, filingStatus);

  const obligationsNow = assumptions.obligations
    .filter(
      (o) => o.startMonth <= 1 && (o.endMonth === null || o.endMonth >= 1),
    )
    .reduce((sum, o) => sum + o.monthlyAmount, 0);

  const surplusBefore =
    assumptions.income.monthlyTakeHome -
    assumptions.expenses.fixedMonthly -
    assumptions.expenses.variableMonthly -
    assumptions.expenses.currentRentMonthly -
    obligationsNow;
  const leftAfterTargets = surplusBefore - monthlyTarget;

  return {
    gross,
    filingStatus,
    hasK401Plan,
    hasHsaPlan,
    hasIraPlan,
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    k401Ceiling,
    target401k,
    target401kCombined,
    actual401kCombined,
    targetHsa,
    magi,
    iraRoom,
    actualIra,
    targetTotal,
    targetMatch,
    actual401k,
    actualHsa,
    actualEmployerTotal,
    monthlyTarget,
    savings401k,
    savingsHsa,
    yourMarginalRate,
    surplusBefore,
    leftAfterTargets,
  };
}

export default function TargetsCard() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const setSettings = useStore((s) => s.setSettings);
  const settings = useStore((s) => s.settings);

  const {
    gross,
    filingStatus,
    hasK401Plan,
    hasHsaPlan,
    hasIraPlan,
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    k401Ceiling,
    target401k,
    target401kCombined,
    actual401kCombined,
    targetHsa,
    magi,
    iraRoom,
    actualIra,
    targetTotal,
    targetMatch,
    actualHsa,
    actualEmployerTotal,
    monthlyTarget,
    savings401k,
    savingsHsa,
    yourMarginalRate,
    surplusBefore,
    leftAfterTargets,
  } = computeContributionFigures(assumptions, settings);

  const isHsaPaused = assumptions.retirement.pauseHsaMax;

  return (
    <>
      <Card
        title={t(
          "contributionGauges.targets.title",
          "Yearly contribution targets",
        )}
        subtitle={t(
          "contributionGauges.targets.subtitle",
          "The priority order: max the HSA first, then capture the full 401(k) match, then fill a Roth IRA if your income allows it.",
        )}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:gap-8">
          <Toggle
            checked={hasHsaPlan}
            onChange={(v) => setAssumptions({ retirement: { hasHsaPlan: v } })}
            label={t("contributionGauges.targets.hsaPlan.label", "HSA plan")}
            hint={t(
              "contributionGauges.targets.hsaPlan.hint",
              "Off if your employer doesn't offer an HSA-eligible health plan. Zeroes the HSA target, gauge, and contribution everywhere in this model.",
            )}
          />
          <Toggle
            checked={hasK401Plan}
            onChange={(v) => setAssumptions({ retirement: { hasK401Plan: v } })}
            label={t(
              "contributionGauges.targets.k401Plan.label",
              "401(k) plan",
            )}
            hint={t(
              "contributionGauges.targets.k401Plan.hint",
              "Off if your employer doesn't offer a 401(k). Zeroes the 401(k) target, gauge, match, and contribution everywhere in this model.",
            )}
          />
          <Toggle
            checked={hasIraPlan}
            onChange={(v) => setAssumptions({ retirement: { hasIraPlan: v } })}
            label={t("contributionGauges.targets.iraPlan.label", "Roth IRA")}
            hint={t(
              "contributionGauges.targets.iraPlan.hint",
              "Off if you aren't funding an IRA. Zeroes the IRA target, gauge, and contribution everywhere in this model.",
            )}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
                          status: filingStatusLabel(
                            t,
                            filingStatus,
                          ).toLowerCase(),
                        },
                      )
                    : t(
                        "contributionGauges.targets.iraGauge.hint",
                        "What you put into a Roth IRA each month, post-tax. 2026 limit is {{limit}}/yr, but at an estimated MAGI of {{magi}} ({{status}}) your room is phased down to {{room}}/yr. Fund this last — the HSA and the 401(k) match come first.",
                        {
                          limit: money(IRA_LIMITS.contribution2026),
                          magi: money(magi),
                          status: filingStatusLabel(
                            t,
                            filingStatus,
                          ).toLowerCase(),
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
                  {t(
                    "contributionGauges.targets.outOfYourPay",
                    "Out of your pay",
                  )}
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
                          tier: hsaCoverageLabel(
                            t,
                            hsaCoverageTier,
                          ).toLowerCase(),
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
                        targetPct: pct(
                          RETIREMENT_TARGETS.combinedK401TargetPct,
                          0,
                        ),
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
                    {t(
                      "contributionGauges.targets.iraRoom.label",
                      "Roth IRA room",
                    )}
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
                  {t(
                    "contributionGauges.targets.yourTotal",
                    "Your total a year",
                  )}
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
                        {
                          pct: pct(
                            RETIREMENT_TARGETS.employerAnnual401kPct,
                            1,
                          ),
                        },
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
                    {t(
                      "contributionGauges.targets.hsaBonus",
                      "HSA one-time bonus",
                    )}
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
                        pct: pct(
                          (targetTotal + actualEmployerTotal) / gross,
                          1,
                        ),
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
                          tier: hsaCoverageLabel(
                            t,
                            hsaCoverageTier,
                          ).toLowerCase(),
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
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <Field
            label={t("contributionGauges.targets.grossSalary.label", "Gross salary")}
            hint={t(
              "contributionGauges.targets.grossSalary.hint",
              "Base salary before bonus. The 401(k) target is a share of this.",
            )}
          >
            <MoneyInput
              value={gross}
              step={1000}
              onChange={(v) => setSettings({ grossAnnualSalary: v })}
            />
          </Field>
          <Field
            label={t(
              "contributionGauges.targets.filingStatusField.label",
              "Filing status",
            )}
            hint={t(
              "contributionGauges.targets.filingStatusField.hint",
              "Single or married filing jointly. Used only to look up your federal marginal tax rate below — it does not change your take-home pay elsewhere in the app.",
            )}
          >
            <Select
              value={filingStatus}
              onChange={(v) => setSettings({ filingStatus: v as FilingStatus })}
            >
              {(Object.keys(FILING_STATUS_LABEL) as FilingStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {filingStatusLabel(t, status)}
                  </option>
                ),
              )}
            </Select>
          </Field>
          {hasK401Plan && (
            <>
              <Field
                label={t(
                  "contributionGauges.targets.k401Field.label",
                  "401(k) contribution",
                )}
                hint={t(
                  "contributionGauges.targets.k401Field.hint",
                  "Share of gross salary. Comes out pre-tax and lands in the retirement balance in this model.",
                )}
              >
                <PercentInputWithMonthly
                  value={assumptions.retirement.k401Pct}
                  annualBasis={gross}
                  onChange={(v) =>
                    setAssumptions({ retirement: { k401Pct: v } })
                  }
                />
              </Field>
              <Field
                label={t(
                  "contributionGauges.targets.employerMatchField.label",
                  "Employer match / month",
                )}
                hint={t(
                  "contributionGauges.targets.employerMatchField.hint",
                  "The regular monthly match only. The January lump is separate.",
                )}
              >
                <MoneyInput
                  value={assumptions.retirement.employerMatchMonthly}
                  onChange={(v) =>
                    setAssumptions({
                      retirement: { employerMatchMonthly: v },
                    })
                  }
                />
              </Field>
              <Field
                label={t(
                  "contributionGauges.targets.employerLumpField.label",
                  "Employer January lump",
                )}
                hint={t(
                  "contributionGauges.targets.employerLumpField.hint",
                  "Once-a-year employer 401(k) money: a profit-share contribution. Free money that is easy to forget precisely because it arrives once.",
                )}
              >
                <MoneyInput
                  step={100}
                  value={assumptions.retirement.employerAnnualLump}
                  onChange={(v) =>
                    setAssumptions({ retirement: { employerAnnualLump: v } })
                  }
                />
              </Field>
            </>
          )}
          {hasHsaPlan && (
            <>
              <Field
                label={t(
                  "contributionGauges.targets.hsaCoverageField.label",
                  "HSA coverage",
                )}
                hint={t(
                  "contributionGauges.targets.hsaCoverageField.hint",
                  "Self-only vs. family HDHP coverage sets the IRS contribution ceiling above -- not filing status. A married couple can carry self-only coverage, and vice versa.",
                )}
              >
                <Select
                  value={hsaCoverageTier}
                  onChange={(v) =>
                    setAssumptions({
                      retirement: {
                        hsaCoverageTier: v as "selfOnly" | "family",
                      },
                    })
                  }
                >
                  {(
                    Object.keys(HSA_COVERAGE_LABEL) as ("selfOnly" | "family")[]
                  ).map((tier) => (
                    <option key={tier} value={tier}>
                      {hsaCoverageLabel(t, tier)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t(
                  "contributionGauges.targets.hsaMonthlyField.label",
                  "HSA contribution / month",
                )}
                hint={t(
                  "contributionGauges.targets.hsaMonthlyField.hint",
                  "Comes out pre-tax too, on top of any employer bonus, and lands in the retirement balance in this model.",
                )}
              >
                <MoneyInput
                  value={assumptions.retirement.hsaMonthly}
                  onChange={(v) =>
                    setAssumptions({ retirement: { hsaMonthly: v } })
                  }
                />
              </Field>
              <Field
                label={t(
                  "contributionGauges.targets.hsaBonusField.label",
                  "Employer HSA one-time bonus",
                )}
                hint={t(
                  "contributionGauges.targets.hsaBonusField.hint",
                  "A once-a-year employer seed into the HSA, if any. Counts toward the IRS limit alongside your own money, so it reduces -- not adds to -- your own room.",
                )}
              >
                <MoneyInput
                  step={100}
                  value={assumptions.retirement.employerHsaAnnualBonus}
                  onChange={(v) =>
                    setAssumptions({
                      retirement: { employerHsaAnnualBonus: v },
                    })
                  }
                />
              </Field>
            </>
          )}
          {hasIraPlan && (
            <Field
              label={t(
                "contributionGauges.targets.iraMonthlyField.label",
                "Roth IRA contribution / month",
              )}
              hint={t(
                "contributionGauges.targets.iraMonthlyField.hint",
                "Post-tax. 2026 limit is {{limit}}/yr, phased down to zero above the income threshold -- see the gauge above for your live room.",
                { limit: money(IRA_LIMITS.contribution2026) },
              )}
            >
              <MoneyInput
                value={assumptions.retirement.iraMonthly}
                onChange={(v) =>
                  setAssumptions({ retirement: { iraMonthly: v } })
                }
              />
            </Field>
          )}
        </div>
      </Card>

      <Callout tone={toneForLeftAfterTargets(leftAfterTargets)}>
        <strong>
          {t(
            "contributionGauges.targets.tradeoff.title",
            "The trade-off, stated plainly.",
          )}
        </strong>{" "}
        {t(
          "contributionGauges.targets.tradeoff.body1",
          "Before any contributions there is {{surplus}} a month spare.",
          { surplus: money(surplusBefore) },
        )}{" "}
        {fundedTargetsLabel(t, hasHsaPlan, hasK401Plan, hasIraPlan)}{" "}
        {t("contributionGauges.targets.tradeoff.body2", "takes {{amount}} of it, leaving", {
          amount: money(monthlyTarget),
        })}{" "}
        <strong>
          {t(
            "contributionGauges.targets.tradeoff.leftPerMonth",
            "{{amount}} a month",
            { amount: money(leftAfterTargets) },
          )}
        </strong>{" "}
        {t(
          "contributionGauges.targets.tradeoff.body3",
          "towards a deposit.",
        )}
        {leftAfterTargets < 500 && (
          <>
            {" "}
            {t(
              "contributionGauges.targets.tradeoff.longWayOff",
              "At that rate the house is a long way off. The order that usually makes sense:",
            )}{" "}
            {hasHsaPlan &&
              t(
                "contributionGauges.targets.tradeoff.orderHsa",
                "max the HSA first, because nothing else is as tax-efficient; ",
              )}
            {hasK401Plan &&
              t(
                "contributionGauges.targets.tradeoff.order401k",
                "then capture the full employer 401(k) match, because nothing else returns as much; ",
              )}
            {hasIraPlan &&
              (iraRoom > 0
                ? t(
                    "contributionGauges.targets.tradeoff.orderIraAvailable",
                    "then fill a Roth IRA if income allows it; ",
                  )
                : t(
                    "contributionGauges.targets.tradeoff.orderIraPhasedOut",
                    "a Roth IRA would come next, but income is above this year's phase-out; ",
                  ))}
            {t(
              "contributionGauges.targets.tradeoff.restToDeposit",
              "then put the rest towards the deposit.",
            )}
            {hasHsaPlan &&
              ` ${t(
                "contributionGauges.targets.tradeoff.hsaNote",
                "The HSA is excellent money, but it cannot be spent on a down payment.",
              )}`}
          </>
        )}
      </Callout>
    </>
  );
}
