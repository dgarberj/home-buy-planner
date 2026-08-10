import { useProjections } from "../../store/useProjections";
import { Callout } from "../ui";
import HsaFlexibilityCard from "./HsaFlexibilityCard";
import TargetsCard from "./TargetsCard";

/**
 * Yearly contribution targets, and what hitting them actually costs.
 *
 * The point of this panel is the tension it exposes. On a single income, the
 * money that maxes an HSA is the same money that would have gone towards a
 * deposit. Showing the targets without showing that trade-off would be
 * cheerful and misleading.
 */
export default function ContributionGauges() {
  const { assumptions } = useProjections();
  const hasHsaPlan = assumptions.retirement.hasHsaPlan;

  return (
    <div className="space-y-5">
      <TargetsCard />
      {hasHsaPlan && (
        <>
          <HsaFlexibilityCard />
          <Callout tone="neutral">
            <strong>Why the HSA sits inside the retirement balance here.</strong>{" "}
            After 65 it behaves like a traditional retirement account —
            withdrawals for anything are taxed as income, and medical
            withdrawals stay tax-free at any age. Contributions avoid income
            tax and payroll tax on the way in, growth is untaxed, and
            qualified withdrawals are untaxed on the way out. That triple
            advantage is why maxing it is a reasonable target, and why it is
            counted as long-term money rather than as savings.
          </Callout>
        </>
      )}
    </div>
  );
}
