import { Trans } from "react-i18next";
import { DELCO_CLR_FACTOR } from "../../data/localMarket";
import { Callout } from "../ui";
import NeighbouringCountiesCard from "./NeighbouringCountiesCard";
import TownExplorer from "./TownExplorer";

/**
 * Where to buy, costed properly.
 *
 * In Delaware County the same house carries wildly different tax bills
 * depending on which side of a township line it sits on. On a median-priced
 * house that gap is several hundred dollars a month -- bigger than most of the
 * levers elsewhere in this app. This panel makes it pickable.
 */
export default function MarketPanel() {
  return (
    <div className="space-y-5">
      <TownExplorer />
      <NeighbouringCountiesCard />

      <Callout tone="bad">
        <Trans
          i18nKey="marketPanel.assessmentCaveat"
          components={{ b: <strong />, i: <em /> }}
          values={{ clrFactor: DELCO_CLR_FACTOR }}
        >
          <b>Read this before trusting any number above.</b> Pennsylvania taxes
          the <i>assessed</i> value, not what you pay. Delaware County last
          reassessed for 2021 using 2020 values, and{" "}
          <b>buying does not trigger a reassessment</b> — so two identical
          houses next door to each other can carry very different bills,
          permanently. These estimates divide the sale price by the state's
          common level ratio factor ({"{{clrFactor}}"}), which is a county-wide
          average. Use this table to rank places; look up the actual assessment
          before making an offer on an actual house.
        </Trans>
      </Callout>
    </div>
  );
}
