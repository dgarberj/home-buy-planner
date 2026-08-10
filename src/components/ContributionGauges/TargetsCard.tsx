import {
  HSA_LIMITS,
  K401_LIMITS,
  RETIREMENT_TARGETS,
  employeeHsaRoom,
} from "../../data/contributionLimits";
import { money, pct } from "../../lib/format";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Callout, Card, Field, InfoTip, MoneyInput, SectionTitle } from "../ui";
import Gauge from "./Gauge";

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

  // ---- Your money ------------------------------------------------------
  const target401k = gross * RETIREMENT_TARGETS.employeeSharePct;
  const targetHsa = employeeHsaRoom(); // family limit LESS the employer seed
  const targetTotal = target401k + targetHsa;

  // ---- Employer money --------------------------------------------------
  const targetMatch = gross * RETIREMENT_TARGETS.employerMatchPct;
  const targetEmployerLump =
    gross * RETIREMENT_TARGETS.employerAnnual401kPct +
    RETIREMENT_TARGETS.employerAnnualHsaSeed;
  const targetEmployerTotal = targetMatch + targetEmployerLump;

  const actualAnnual = assumptions.retirement.employeeMonthly * 12;
  const actualMatch =
    assumptions.retirement.employerMatchMonthly * 12 +
    assumptions.retirement.employerAnnualLump;
  const monthlyTarget = targetTotal / 12;

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
        subtitle={`A ${pct(RETIREMENT_TARGETS.employeeSharePct, 0)} 401(k) contribution plus a fully funded family HSA.`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Gauge
              label="Your contribution (401k + HSA)"
              hint="What comes out of your own pay. The model deducts this from take-home before anything reaches savings, so it competes directly with the deposit."
              actual={actualAnnual}
              target={targetTotal}
            />
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
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  HSA room left to you
                  <InfoTip
                    text={`The ${money(HSA_LIMITS.family2026)} family limit counts employer and employee money together, so your employer's ${money(RETIREMENT_TARGETS.employerAnnualHsaSeed)} seed reduces your own room rather than adding to it. Putting in the full limit yourself on top of the seed would be an excess contribution, and penalised.`}
                  />
                </dt>
                <dd className="whitespace-nowrap font-medium tabular-nums">
                  {money(targetHsa)}
                </dd>
              </div>
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
                  {pct(RETIREMENT_TARGETS.employerAnnual401kPct, 1)} 401(k) +{" "}
                  {money(RETIREMENT_TARGETS.employerAnnualHsaSeed)} HSA
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
              {money(K401_LIMITS.employeeDeferral2026)} for a 401(k) and{" "}
              {money(HSA_LIMITS.family2026)} for a family HSA in 2026.
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
            label="Your contribution / month"
            hint="401(k) and HSA combined, since both come out pre-tax and both land in the retirement balance in this model."
          >
            <MoneyInput
              value={assumptions.retirement.employeeMonthly}
              onChange={(v) =>
                setAssumptions({ retirement: { employeeMonthly: v } })
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
      </Card>

      <Callout tone={toneForLeftAfterTargets(leftAfterTargets)}>
        <strong>The trade-off, stated plainly.</strong> Before any contributions
        there is {money(surplusBefore)} a month spare. Funding both targets
        takes {money(monthlyTarget)} of it, leaving{" "}
        <strong>{money(leftAfterTargets)} a month</strong> towards a deposit.
        {leftAfterTargets < 500 && (
          <>
            {" "}
            At that rate the house is a long way off. The order that usually
            makes sense: capture the full employer match first, because nothing
            else returns as much; then fund the HSA to whatever the family will
            actually spend on healthcare that year; then put the rest towards
            the deposit. The HSA is excellent money, but it cannot be spent on a
            down payment.
          </>
        )}
      </Callout>
    </>
  );
}
