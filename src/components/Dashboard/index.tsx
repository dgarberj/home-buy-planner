import { useProjections } from "../../store/useProjections";
import { Card } from "../ui";
import NetWorthChart from "./NetWorthChart";
import ScenarioComparisonTable from "./ScenarioComparisonTable";
import ScenarioStatCards from "./ScenarioStatCards";
import SecondIncomeLeverCard from "./SecondIncomeLeverCard";
import VerdictsCard from "./VerdictsCard";

/**
 * The answer screen. Someone should be able to land here, read two sentences,
 * and know whether the plan works -- without being walked through it.
 */
export default function Dashboard() {
  const { summaries } = useProjections();

  if (summaries.length === 0) {
    return (
      <Card title="Dashboard">
        <p className="py-10 text-center text-sm text-slate-400">
          No scenarios are switched on. Turn one on above to see a projection.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <SecondIncomeLeverCard />
      <VerdictsCard />
      <NetWorthChart />
      <ScenarioStatCards />
      <ScenarioComparisonTable />
    </div>
  );
}
