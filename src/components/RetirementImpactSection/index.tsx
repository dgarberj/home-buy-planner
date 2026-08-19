import RetirementOutlookChart from "../Dashboard/RetirementOutlookChart";
import RetirementMilestones from "../RetirementMilestones";

export default function RetirementImpactSection() {
  return (
    <div className="space-y-5">
      <RetirementOutlookChart />
      <RetirementMilestones />
    </div>
  );
}
