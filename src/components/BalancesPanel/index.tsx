import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deriveStartingBalances } from "../../lib/derive";
import { money } from "../../lib/format";
import { useStore } from "../../store/useStore";
import { Button, Card } from "../ui";
import BalancesDrawer from "./BalancesDrawer";

/**
 * The periodic reality check: what we actually had, on a given date.
 * The newest row is what the projection starts from, so it is highlighted.
 * The editable table lives in BalancesDrawer, opened from here.
 */

export default function BalancesPanel() {
  const { t } = useTranslation();
  const { balances, addBalance, updateBalance, removeBalance } = useStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const starting = deriveStartingBalances(balances);

  return (
    <Card
      title={t("balancesPanel.title", "Balance history")}
      subtitle={t(
        "balancesPanel.subtitle",
        "Log the real numbers every month or quarter. The newest row becomes the projection's starting point.",
      )}
      right={
        <div className="text-right">
          <div className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("balancesPanel.availableForAHouse", "Available for a house")}
          </div>
          <div className="whitespace-nowrap text-2xl font-semibold tabular-nums text-slate-900">
            {money(starting.liquid)}
          </div>
        </div>
      }
    >
      <div>
        <Button
          size="md"
          variant="primary"
          onClick={() => setIsDrawerOpen(true)}
        >
          {t(
            "balancesPanel.startHere",
            "Start here — edit your balances →",
          )}
        </Button>
      </div>
      <BalancesDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        balances={balances}
        addBalance={addBalance}
        updateBalance={updateBalance}
        removeBalance={removeBalance}
      />
    </Card>
  );
}
