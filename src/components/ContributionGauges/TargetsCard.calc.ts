import type { TFunction } from "i18next";
import {
  HSA_LIMITS,
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
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";

export const FILING_STATUS_LABEL: Record<FilingStatus, string> = {
  single: "Single",
  marriedJoint: "Married filing jointly",
};

export const HSA_COVERAGE_LABEL: Record<"selfOnly" | "family", string> = {
  selfOnly: "Self-only",
  family: "Family",
};

export function filingStatusLabel(t: TFunction, status: FilingStatus): string {
  return t(
    `contributionGauges.targets.filingStatus.${status}`,
    FILING_STATUS_LABEL[status],
  );
}

export function hsaCoverageLabel(
  t: TFunction,
  tier: "selfOnly" | "family",
): string {
  return t(
    `contributionGauges.targets.hsaCoverage.${tier}`,
    HSA_COVERAGE_LABEL[tier],
  );
}

export function toneForLeftAfterTargets(
  leftAfterTargets: number,
): "bad" | "warn" | "good" {
  if (leftAfterTargets < 200) return "bad";
  if (leftAfterTargets < 600) return "warn";
  return "good";
}

export function fundedTargetsLabel(
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
export function computeContributionFigures(
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
  const actual401k = hasK401Plan ? assumptions.retirement.k401Pct * gross : 0;
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

export type ContributionFigures = ReturnType<typeof computeContributionFigures>;
