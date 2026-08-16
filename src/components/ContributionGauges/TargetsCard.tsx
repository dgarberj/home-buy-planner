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

function toneForLeftAfterTargets(
  leftAfterTargets: number,
): "bad" | "warn" | "good" {
  if (leftAfterTargets < 200) return "bad";
  if (leftAfterTargets < 600) return "warn";
  return "good";
}

function fundedTargetsLabel(
  hasHsaPlan: boolean,
  hasK401Plan: boolean,
  hasIraPlan: boolean,
): string {
  const stages = [
    hasHsaPlan && "the HSA",
    hasK401Plan && "the 401(k) match",
    hasIraPlan && "the Roth IRA",
  ].filter((s): s is string => Boolean(s));
  if (stages.length === 0) return "Funding nothing";
  if (stages.length === 1) return `Funding ${stages[0]}`;
  return `Funding ${stages.slice(0, -1).join(", ")} and ${stages.at(-1)}`;
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
        title="Yearly contribution targets"
        subtitle="The priority order: max the HSA first, then capture the full 401(k) match, then fill a Roth IRA if your income allows it."
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:gap-8">
          <Toggle
            checked={hasHsaPlan}
            onChange={(v) => setAssumptions({ retirement: { hasHsaPlan: v } })}
            label="HSA plan"
            hint="Off if your employer doesn't offer an HSA-eligible health plan. Zeroes the HSA target, gauge, and contribution everywhere in this model."
          />
          <Toggle
            checked={hasK401Plan}
            onChange={(v) => setAssumptions({ retirement: { hasK401Plan: v } })}
            label="401(k) plan"
            hint="Off if your employer doesn't offer a 401(k). Zeroes the 401(k) target, gauge, match, and contribution everywhere in this model."
          />
          <Toggle
            checked={hasIraPlan}
            onChange={(v) => setAssumptions({ retirement: { hasIraPlan: v } })}
            label="Roth IRA"
            hint="Off if you aren't funding an IRA. Zeroes the IRA target, gauge, and contribution everywhere in this model."
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {hasHsaPlan && (
              <div>
                <Gauge
                  label="Stage 1 · HSA"
                  hint={`What comes out of your own pay for the HSA. Legal ceiling for 2026: ${money(hsaLimit)}/yr ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()}, counting employer money — set by HDHP coverage tier, not filing status. Your employer's ${money(employerHsaAnnualBonus)} one-time bonus reduces your own room to ${money(targetHsa)}, rather than adding on top of it. Also pre-tax, saving about ${money(savingsHsa)}/yr in federal tax at your ${pct(yourMarginalRate, 0)} marginal rate. Max this first — it's the most tax-efficient dollar available, before the 401(k) match or a Roth IRA.`}
                  actual={actualHsa}
                  target={targetHsa}
                  redBelow={0.5}
                  greenAbove={1}
                />
                {isHsaPaused && (
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    Paused — redirected to the deposit fund instead of the
                    HSA.
                  </p>
                )}
              </div>
            )}
            {hasK401Plan && (
              <Gauge
                label="Stage 2 · 401(k) match"
                hint={`Your own 401(k) election plus your employer's recurring monthly match, combined, as a share of gross salary — green means the two together reach ${pct(RETIREMENT_TARGETS.combinedK401TargetPct, 0)} of ${money(gross)}. The January profit-share lump doesn't count toward this target; it's discretionary employer money, not something to plan an election around. Your own share is pre-tax, so at your ${pct(yourMarginalRate, 0)} federal marginal rate (${FILING_STATUS_LABEL[filingStatus].toLowerCase()}) it saves about ${money(savings401k)}/yr in federal tax.`}
                actual={actual401kCombined}
                target={target401kCombined}
                redBelow={0.5}
                greenAbove={1}
              />
            )}
            {hasIraPlan && (
              <Gauge
                label="Stage 3 · Roth IRA"
                hint={
                  iraRoom <= 0
                    ? `At an estimated MAGI of ${money(magi)} (${FILING_STATUS_LABEL[filingStatus].toLowerCase()}), you're above the 2026 phase-out ceiling, so a direct Roth contribution isn't available this year. A backdoor Roth is the usual workaround, but that's outside what this model tracks.`
                    : `What you put into a Roth IRA each month, post-tax. 2026 limit is ${money(IRA_LIMITS.contribution2026)}/yr, but at an estimated MAGI of ${money(magi)} (${FILING_STATUS_LABEL[filingStatus].toLowerCase()}) your room is phased down to ${money(iraRoom)}/yr. Fund this last — the HSA and the 401(k) match come first.`
                }
                actual={actualIra}
                target={iraRoom}
                redBelow={0.5}
                greenAbove={1}
                unavailable={
                  iraRoom <= 0
                    ? "Not eligible this year — income is above the Roth phase-out ceiling."
                    : undefined
                }
              />
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <SectionTitle>Where the target comes from</SectionTitle>
            <dl className="space-y-2 text-sm">
              {(hasK401Plan || hasHsaPlan || hasIraPlan) && (
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Out of your pay
                </div>
              )}
              {hasHsaPlan && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    HSA room left to you
                    <InfoTip
                      text={`The ${money(hsaLimit)} ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} limit counts employer and employee money together, so your employer's ${money(employerHsaAnnualBonus)} bonus reduces your own room rather than adding to it. Putting in the full limit yourself on top of the bonus would be an excess contribution, and penalised.`}
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
                    401(k), your share of a{" "}
                    {pct(RETIREMENT_TARGETS.combinedK401TargetPct, 0)} combined
                    target
                    <InfoTip text="Netted against the recurring employer match you're actually getting, the same way the HSA line nets off the employer seed above." />
                  </dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(target401k)}
                  </dd>
                </div>
              )}
              {hasIraPlan && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    Roth IRA room
                    <InfoTip text="Phased down from the IRS limit once MAGI enters the phase-out range; zero above it." />
                  </dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(iraRoom)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                <dt className="font-medium text-slate-900">
                  Your total a year
                </dt>
                <dd className="whitespace-nowrap font-semibold tabular-nums">
                  {money(targetTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Per month</dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">
                  {money(monthlyTarget)}
                </dd>
              </div>

              {(hasK401Plan || hasHsaPlan) && (
                <div className="pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  From your employer — a calculated number, not a target of its
                  own
                </div>
              )}
              {hasK401Plan && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">
                      401(k) match,{" "}
                      {pct(RETIREMENT_TARGETS.employerMatchPct, 1)} monthly
                    </dt>
                    <dd className="whitespace-nowrap font-medium tabular-nums">
                      {money(targetMatch)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">
                      401(k) January lump,{" "}
                      {pct(RETIREMENT_TARGETS.employerAnnual401kPct, 1)}
                    </dt>
                    <dd className="whitespace-nowrap font-medium tabular-nums">
                      {money(gross * RETIREMENT_TARGETS.employerAnnual401kPct)}
                    </dd>
                  </div>
                </>
              )}
              {hasHsaPlan && employerHsaAnnualBonus > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">HSA one-time bonus</dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(employerHsaAnnualBonus)}
                  </dd>
                </div>
              )}
              {(hasK401Plan || hasHsaPlan) && (
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                  <dt className="font-medium text-slate-900">
                    Employer total a year
                  </dt>
                  <dd className="whitespace-nowrap font-semibold tabular-nums">
                    {money(actualEmployerTotal)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-4 border-t-2 border-slate-300 pt-2">
                <dt className="font-semibold text-slate-900">
                  Everything going in
                </dt>
                <dd className="whitespace-nowrap font-semibold tabular-nums">
                  {money(targetTotal + actualEmployerTotal)}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {pct((targetTotal + actualEmployerTotal) / gross, 1)} of
                    salary
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
              Well inside the legal ceilings:{" "}
              {[
                hasHsaPlan &&
                  `${money(hsaLimit)} for a ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} HSA`,
                hasK401Plan && `${money(k401Ceiling)} for a 401(k)`,
                hasIraPlan && `${money(IRA_LIMITS.contribution2026)} for a Roth IRA`,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              in 2026.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <Field
            label="Gross salary"
            hint="Base salary before bonus. The 401(k) target is a share of this."
          >
            <MoneyInput
              value={gross}
              step={1000}
              onChange={(v) => setSettings({ grossAnnualSalary: v })}
            />
          </Field>
          <Field
            label="Filing status"
            hint="Single or married filing jointly. Used only to look up your federal marginal tax rate below — it does not change your take-home pay elsewhere in the app."
          >
            <Select
              value={filingStatus}
              onChange={(v) => setSettings({ filingStatus: v as FilingStatus })}
            >
              {(Object.keys(FILING_STATUS_LABEL) as FilingStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {FILING_STATUS_LABEL[status]}
                  </option>
                ),
              )}
            </Select>
          </Field>
          {hasK401Plan && (
            <>
              <Field
                label="401(k) contribution"
                hint="Share of gross salary. Comes out pre-tax and lands in the retirement balance in this model."
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
                label="Employer match / month"
                hint="The regular monthly match only. The January lump is separate."
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
                label="Employer January lump"
                hint="Once-a-year employer 401(k) money: a profit-share contribution. Free money that is easy to forget precisely because it arrives once."
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
                label="HSA coverage"
                hint="Self-only vs. family HDHP coverage sets the IRS contribution ceiling above -- not filing status. A married couple can carry self-only coverage, and vice versa."
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
                      {HSA_COVERAGE_LABEL[tier]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="HSA contribution / month"
                hint="Comes out pre-tax too, on top of any employer bonus, and lands in the retirement balance in this model."
              >
                <MoneyInput
                  value={assumptions.retirement.hsaMonthly}
                  onChange={(v) =>
                    setAssumptions({ retirement: { hsaMonthly: v } })
                  }
                />
              </Field>
              <Field
                label="Employer HSA one-time bonus"
                hint="A once-a-year employer seed into the HSA, if any. Counts toward the IRS limit alongside your own money, so it reduces -- not adds to -- your own room."
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
              label="Roth IRA contribution / month"
              hint={`Post-tax. 2026 limit is ${money(IRA_LIMITS.contribution2026)}/yr, phased down to zero above the income threshold -- see the gauge above for your live room.`}
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
        <strong>The trade-off, stated plainly.</strong> Before any contributions
        there is {money(surplusBefore)} a month spare.{" "}
        {fundedTargetsLabel(hasHsaPlan, hasK401Plan, hasIraPlan)} takes{" "}
        {money(monthlyTarget)} of it, leaving{" "}
        <strong>{money(leftAfterTargets)} a month</strong> towards a deposit.
        {leftAfterTargets < 500 && (
          <>
            {" "}
            At that rate the house is a long way off. The order that usually
            makes sense:{" "}
            {hasHsaPlan &&
              "max the HSA first, because nothing else is as tax-efficient; "}
            {hasK401Plan &&
              "then capture the full employer 401(k) match, because nothing else returns as much; "}
            {hasIraPlan &&
              (iraRoom > 0
                ? "then fill a Roth IRA if income allows it; "
                : "a Roth IRA would come next, but income is above this year's phase-out; ")}
            then put the rest towards the deposit.
            {hasHsaPlan &&
              " The HSA is excellent money, but it cannot be spent on a down payment."}
          </>
        )}
      </Callout>
    </>
  );
}
