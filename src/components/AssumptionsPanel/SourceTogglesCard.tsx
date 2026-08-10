import { useStore } from "../../store/useStore";
import { Card, Toggle } from "../ui";

export default function SourceTogglesCard() {
  const { settings, setSettings } = useStore();
  const fromBudget = settings.useBudgetTotals;
  const fromBalances = settings.useLatestBalances;

  return (
    <Card
      title="Where the numbers come from"
      subtitle="Turn these off if you'd rather type totals directly instead of itemising."
    >
      <div className="space-y-3">
        <Toggle
          checked={fromBudget}
          onChange={(v) => setSettings({ useBudgetTotals: v })}
          label={
            <>
              Use the <strong>Budget</strong> tab for income, expenses and
              rent
            </>
          }
          hint="When on, the four totals below are added up from your budget line items and can't be edited here."
        />
        <Toggle
          checked={fromBalances}
          onChange={(v) => setSettings({ useLatestBalances: v })}
          label={
            <>
              Use the newest <strong>Balances</strong> snapshot for starting
              balances
            </>
          }
          hint="When on, the projection starts from the most recent snapshot you logged. Checking + savings + investments count as available cash."
        />
      </div>
    </Card>
  );
}
