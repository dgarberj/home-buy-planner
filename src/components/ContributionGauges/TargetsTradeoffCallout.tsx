import { useTranslation } from "react-i18next";
import { money } from "../../lib/format";
import { Callout } from "../ui";
import {
  fundedTargetsLabel,
  toneForLeftAfterTargets,
  type ContributionFigures,
} from "./TargetsCard.calc";

/**
 * The closing "trade-off, stated plainly" callout: what's spare before
 * contributions, what the targets take, and what's left for a deposit.
 */
export default function TargetsTradeoffCallout({
  figures,
}: {
  figures: ContributionFigures;
}) {
  const { t } = useTranslation();
  const {
    hasHsaPlan,
    hasK401Plan,
    hasIraPlan,
    iraRoom,
    surplusBefore,
    monthlyTarget,
    leftAfterTargets,
  } = figures;

  return (
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
      {t(
        "contributionGauges.targets.tradeoff.body2",
        "takes {{amount}} of it, leaving",
        {
          amount: money(monthlyTarget),
        },
      )}{" "}
      <strong>
        {t(
          "contributionGauges.targets.tradeoff.leftPerMonth",
          "{{amount}} a month",
          { amount: money(leftAfterTargets) },
        )}
      </strong>{" "}
      {t("contributionGauges.targets.tradeoff.body3", "towards a deposit.")}
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
  );
}
