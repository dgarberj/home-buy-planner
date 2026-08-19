import { useTranslation } from "react-i18next";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import { Card, Toggle } from "../ui";
import { computeContributionFigures } from "./TargetsCard.calc";
import TargetsBreakdown from "./TargetsBreakdown";
import TargetsGauges from "./TargetsGauges";
import TargetsInputsGrid from "./TargetsInputsGrid";
import TargetsTradeoffCallout from "./TargetsTradeoffCallout";

export default function TargetsCard() {
  const { t } = useTranslation();
  const { assumptions } = useProjections();
  const setAssumptions = useStore((s) => s.setAssumptions);
  const setSettings = useStore((s) => s.setSettings);
  const settings = useStore((s) => s.settings);

  const figures = computeContributionFigures(assumptions, settings);
  const { hasHsaPlan, hasK401Plan, hasIraPlan } = figures;

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
          <TargetsGauges figures={figures} isHsaPaused={isHsaPaused} />
          <TargetsBreakdown figures={figures} />
        </div>

        <TargetsInputsGrid
          figures={figures}
          assumptions={assumptions}
          setAssumptions={setAssumptions}
          setSettings={setSettings}
        />
      </Card>

      <TargetsTradeoffCallout figures={figures} />
    </>
  );
}
