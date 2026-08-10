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

export default function TargetsCard() {
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const setSettings = useStore((s) => s.setSettings);
  const settings = useStore((s) => s.settings);

  const gross = settings.grossAnnualSalary;
  const hasHsaPlan = assumptions.retirement.hasHsaPlan;
  const hsaCoverageTier = assumptions.retirement.hsaCoverageTier;

  // ---- Your money ------------------------------------------------------
  const target401k = gross * RETIREMENT_TARGETS.employeeSharePct;
  const targetHsa = hasHsaPlan ? employeeHsaRoom(hsaCoverageTier) : 0;
  const targetTotal = target401k + targetHsa;

  // ---- Employer money --------------------------------------------------
  const targetMatch = gross * RETIREMENT_TARGETS.employerMatchPct;
  const targetEmployerLump =
    gross * RETIREMENT_TARGETS.employerAnnual401kPct +
    (hasHsaPlan ? RETIREMENT_TARGETS.employerAnnualHsaSeed : 0);
  const targetEmployerTotal = targetMatch + targetEmployerLump;

  const actual401k = assumptions.retirement.k401Monthly * 12;
  const actualHsa = hasHsaPlan ? assumptions.retirement.hsaMonthly * 12 : 0;
  const actualMatch =
    assumptions.retirement.employerMatchMonthly * 12 +
    assumptions.retirement.employerAnnualLump;
  const monthlyTarget = targetTotal / 12;

  // ---- Federal tax savings from pre-tax contributions -------------------
  // Display only: derived from gross salary + filing status, does not touch
  // income.monthlyTakeHome or any projection maths. Cumulative, not a flat
  // rate x contribution, so it stays correct when a contribution straddles
  // a bracket boundary.
  const filingStatus = settings.filingStatus;
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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Gauge
              label="Your 401(k) contribution"
              hint={`What comes out of your own pay for the 401(k). The model deducts this from take-home before anything reaches savings. Legal ceiling for 2026: ${money(K401_LIMITS.employeeDeferral2026)}/yr — fixed by law regardless of filing status. Pre-tax, so at your ${pct(yourMarginalRate, 0)} federal marginal rate (${FILING_STATUS_LABEL[filingStatus].toLowerCase()}) it saves about ${money(savings401k)}/yr in federal tax.`}
              actual={actual401k}
              target={target401k}
              redBelow={0.3}
              greenAbove={0.7}
            />
            {hasHsaPlan && (
              <Gauge
                label="Your HSA contribution"
                hint={`What comes out of your own pay for the HSA, on top of any employer seed. Legal ceiling for 2026: ${money(HSA_LIMITS[hsaCoverageTier === "selfOnly" ? "selfOnly2026" : "family2026"])}/yr ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()}, counting employer money — set by HDHP coverage tier, not filing status. Also pre-tax, saving about ${money(savingsHsa)}/yr in federal tax at your ${pct(yourMarginalRate, 0)} marginal rate.`}
                actual={actualHsa}
                target={targetHsa}
                redBelow={0.5}
                greenAbove={0.9}
              />
            )}
            <Gauge
              label="Employer money (match + January lump)"
              hint="Free money, and it arrives in two shapes: a monthly match on your salary, and a lump every January. Never leave any of it unclaimed — nothing else in this plan returns as much."
              actual={actualMatch}
              target={targetEmployerTotal}
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <SectionTitle>Where the target comes from</SectionTitle>
            <dl className="space-y-2 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Out of your pay
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  401(k), {pct(RETIREMENT_TARGETS.employeeSharePct, 0)} of{" "}
                  {money(gross)}
                </dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">
                  {money(target401k)}
                </dd>
              </div>
              {hasHsaPlan && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    HSA room left to you
                    <InfoTip
                      text={`The ${money(HSA_LIMITS[hsaCoverageTier === "selfOnly" ? "selfOnly2026" : "family2026"])} ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} limit counts employer and employee money together, so your employer's ${money(RETIREMENT_TARGETS.employerAnnualHsaSeed)} seed reduces your own room rather than adding to it. Putting in the full limit yourself on top of the seed would be an excess contribution, and penalised.`}
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

              <div className="pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                From your employer
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  401(k) match, {pct(RETIREMENT_TARGETS.employerMatchPct, 1)}{" "}
                  monthly
                </dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">
                  {money(targetMatch)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  January lump —{" "}
                  {pct(RETIREMENT_TARGETS.employerAnnual401kPct, 1)} 401(k)
                  {hasHsaPlan &&
                    ` + ${money(RETIREMENT_TARGETS.employerAnnualHsaSeed)} HSA`}
                </dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">
                  {money(targetEmployerLump)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                <dt className="font-medium text-slate-900">
                  Employer total a year
                </dt>
                <dd className="whitespace-nowrap font-semibold tabular-nums">
                  {money(targetEmployerTotal)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-t-2 border-slate-300 pt-2">
                <dt className="font-semibold text-slate-900">
                  Everything going in
                </dt>
                <dd className="whitespace-nowrap font-semibold tabular-nums">
                  {money(targetTotal + targetEmployerTotal)}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {pct((targetTotal + targetEmployerTotal) / gross, 1)} of
                    salary
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
              Well inside the legal ceilings:{" "}
              {money(K401_LIMITS.employeeDeferral2026)} for a 401(k)
              {hasHsaPlan &&
                ` and ${money(HSA_LIMITS[hsaCoverageTier === "selfOnly" ? "selfOnly2026" : "family2026"])} for a ${HSA_COVERAGE_LABEL[hsaCoverageTier].toLowerCase()} HSA`}{" "}
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
              onChange={(v) =>
                setSettings({ filingStatus: v as FilingStatus })
              }
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
                hint="Comes out pre-tax too, on top of any employer seed, and lands in the retirement balance in this model."
              >
                <MoneyInput
                  value={assumptions.retirement.hsaMonthly}
                  onChange={(v) =>
                    setAssumptions({ retirement: { hsaMonthly: v } })
                  }
                />
              </Field>
            </>
          )}
          <Field
            label="Employer match / month"
            hint="The regular monthly match only. The January lump is separate."
          >
            <MoneyInput
              value={assumptions.retirement.employerMatchMonthly}
              onChange={(v) =>
                setAssumptions({ retirement: { employerMatchMonthly: v } })
              }
            />
          </Field>
          <Field
            label="Employer January lump"
            hint="Once-a-year employer money: a profit-share 401(k) contribution plus any HSA seed. Free money that is easy to forget precisely because it arrives once."
          >
            <MoneyInput
              step={100}
              value={assumptions.retirement.employerAnnualLump}
              onChange={(v) =>
                setAssumptions({ retirement: { employerAnnualLump: v } })
              }
            />
          </Field>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Toggle
            checked={hasHsaPlan}
            onChange={(v) =>
              setAssumptions({ retirement: { hasHsaPlan: v } })
            }
            label="HSA plan"
            hint="Off if your employer doesn't offer an HSA-eligible health plan. Zeroes the HSA target, gauge, and contribution everywhere in this model."
          />
        </div>
      </Card>

      <Callout tone={toneForLeftAfterTargets(leftAfterTargets)}>
        <strong>The trade-off, stated plainly.</strong> Before any contributions
        there is {money(surplusBefore)} a month spare.{" "}
        {hasHsaPlan ? "Funding both targets" : "Funding the 401(k) target"}{" "}
        takes {money(monthlyTarget)} of it, leaving{" "}
        <strong>{money(leftAfterTargets)} a month</strong> towards a deposit.
        {leftAfterTargets < 500 && (
          <>
            {" "}
            At that rate the house is a long way off. The order that usually
            makes sense: capture the full employer match first, because nothing
            else returns as much;{" "}
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
