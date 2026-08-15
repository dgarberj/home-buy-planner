import {
  HSA_LIMITS,
  K401_LIMITS,
  RETIREMENT_TARGETS,
  employeeHsaRoom,
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

function fundedTargetsLabel(hasK401Plan: boolean, hasHsaPlan: boolean): string {
  if (hasK401Plan && hasHsaPlan) return "Funding both targets";
  if (hasHsaPlan) return "Funding the HSA target";
  return "Funding the 401(k) target";
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
  const hsaCoverageTier = assumptions.retirement.hsaCoverageTier;
  const employerHsaAnnualBonus = hasHsaPlan
    ? assumptions.retirement.employerHsaAnnualBonus
    : 0;

  const hsaLimit =
    HSA_LIMITS[hsaCoverageTier === "selfOnly" ? "selfOnly2026" : "family2026"];

  // ---- Your money --------------------------------------------------------
  // The 401(k) gauge is measured against the legal ceiling, not a savings
  // goal -- the goal below (`employeeSharePct` of salary) is a separate,
  // softer number used only for the trade-off narrative and side panel.
  const k401Ceiling = K401_LIMITS.employeeDeferral2026;
  const target401k = hasK401Plan
    ? gross * RETIREMENT_TARGETS.employeeSharePct
    : 0;
  // The employer's HSA bonus eats into the employee's own room rather than
  // sitting on top of the limit, so the gauge target nets it out using the
  // actual bonus entered below, not a fixed assumption.
  const targetHsa = hasHsaPlan
    ? employeeHsaRoom(hsaCoverageTier, employerHsaAnnualBonus)
    : 0;
  const targetTotal = target401k + targetHsa;

  // ---- Employer money (informational only -- no gauge, it's a calculated
  // total from the match, the 401(k) lump, and the HSA bonus) -------------
  const targetMatch = hasK401Plan
    ? gross * RETIREMENT_TARGETS.employerMatchPct
    : 0;

  const actual401k = hasK401Plan ? assumptions.retirement.k401Monthly * 12 : 0;
  const actualHsa = hasHsaPlan ? assumptions.retirement.hsaMonthly * 12 : 0;
  const actualMatch = hasK401Plan
    ? assumptions.retirement.employerMatchMonthly * 12 +
      assumptions.retirement.employerAnnualLump
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
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    k401Ceiling,
    target401k,
    targetHsa,
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
    hsaCoverageTier,
    employerHsaAnnualBonus,
    hsaLimit,
    k401Ceiling,
    target401k,
    targetHsa,
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
  } = computeContributionFigures(assumptions, settings);

  return (
    <>
      <Card
        title="Yearly contribution targets"
        subtitle={
          hasHsaPlan
            ? `A ${pct(RETIREMENT_TARGETS.employeeSharePct, 0)} 401(k) contribution plus a fully funded ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} HSA.`
            : `A ${pct(RETIREMENT_TARGETS.employeeSharePct, 0)} 401(k) contribution. No HSA plan.`
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:gap-8">
          <Toggle
            checked={hasK401Plan}
            onChange={(v) => setAssumptions({ retirement: { hasK401Plan: v } })}
            label="401(k) plan"
            hint="Off if your employer doesn't offer a 401(k). Zeroes the 401(k) target, gauge, match, and contribution everywhere in this model."
          />
          <Toggle
            checked={hasHsaPlan}
            onChange={(v) => setAssumptions({ retirement: { hasHsaPlan: v } })}
            label="HSA plan"
            hint="Off if your employer doesn't offer an HSA-eligible health plan. Zeroes the HSA target, gauge, and contribution everywhere in this model."
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {hasK401Plan && (
              <Gauge
                label="Your 401(k) contribution"
                hint={`What comes out of your own pay for the 401(k). The model deducts this from take-home before anything reaches savings. Measured against the 2026 IRS elective-deferral limit — fixed by law regardless of filing status. Pre-tax, so at your ${pct(yourMarginalRate, 0)} federal marginal rate (${FILING_STATUS_LABEL[filingStatus].toLowerCase()}) it saves about ${money(savings401k)}/yr in federal tax.`}
                actual={actual401k}
                target={k401Ceiling}
                redBelow={0.3}
                greenAbove={0.7}
              />
            )}
            {hasHsaPlan && (
              <Gauge
                label="Your HSA contribution"
                hint={`What comes out of your own pay for the HSA. Legal ceiling for 2026: ${money(hsaLimit)}/yr ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()}, counting employer money — set by HDHP coverage tier, not filing status. Your employer's ${money(employerHsaAnnualBonus)} one-time bonus reduces your own room to ${money(targetHsa)}, rather than adding on top of it. Also pre-tax, saving about ${money(savingsHsa)}/yr in federal tax at your ${pct(yourMarginalRate, 0)} marginal rate.`}
                actual={actualHsa}
                target={targetHsa}
                redBelow={0.5}
                greenAbove={0.9}
              />
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <SectionTitle>Where the target comes from</SectionTitle>
            <dl className="space-y-2 text-sm">
              {(hasK401Plan || hasHsaPlan) && (
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Out of your pay
                </div>
              )}
              {hasK401Plan && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    401(k), {pct(RETIREMENT_TARGETS.employeeSharePct, 0)} of{" "}
                    {money(gross)}
                  </dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(target401k)}
                  </dd>
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
              {hasK401Plan && `${money(k401Ceiling)} for a 401(k)`}
              {hasK401Plan && hasHsaPlan && " and "}
              {hasHsaPlan &&
                `${money(hsaLimit)} for a ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} HSA`}{" "}
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
                label="401(k) contribution / month"
                hint="Comes out pre-tax and lands in the retirement balance in this model."
              >
                <MoneyInput
                  value={assumptions.retirement.k401Monthly}
                  onChange={(v) =>
                    setAssumptions({ retirement: { k401Monthly: v } })
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
        </div>
      </Card>

      <Callout tone={toneForLeftAfterTargets(leftAfterTargets)}>
        <strong>The trade-off, stated plainly.</strong> Before any contributions
        there is {money(surplusBefore)} a month spare.{" "}
        {fundedTargetsLabel(hasK401Plan, hasHsaPlan)} takes{" "}
        {money(monthlyTarget)} of it, leaving{" "}
        <strong>{money(leftAfterTargets)} a month</strong> towards a deposit.
        {leftAfterTargets < 500 && (
          <>
            {" "}
            At that rate the house is a long way off. The order that usually
            makes sense:{" "}
            {hasK401Plan &&
              "capture the full employer match first, because nothing else returns as much; "}
            {hasHsaPlan &&
              "then fund the HSA to whatever the family will actually spend on healthcare that year; "}
            then put the rest towards the deposit.
            {hasHsaPlan &&
              " The HSA is excellent money, but it cannot be spent on a down payment."}
          </>
        )}
      </Callout>
    </>
  );
}
