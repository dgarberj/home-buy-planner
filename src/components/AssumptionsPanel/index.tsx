import { useState } from "react";
import CoResidentSection from "./CoResidentSection";
import ExpensesSection from "./ExpensesSection";
import HomePurchaseSection from "./HomePurchaseSection";
import HorizonSection from "./HorizonSection";
import IncomeSection from "./IncomeSection";
import JobLossSection from "./JobLossSection";
import RetirementSection from "./RetirementSection";
import SavingsSection from "./SavingsSection";
import SecondIncomeSection from "./SecondIncomeSection";
import SourceNoteCard from "./SourceNoteCard";
import SegmentedTabs from "../ui/SegmentedTabs";

type AssumptionsTab = "basics" | "advanced";

const TABS: { id: AssumptionsTab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "advanced", label: "Advanced" },
];

/**
These two groups aren't independently deep-linkable the way the top-level
clusters (`ClusterTabs` in `App.tsx`) are, so the selection lives in local
state instead of the URL hash.
*/
function AssumptionsTabs({
  tab,
  onSelect,
}: {
  tab: AssumptionsTab;
  onSelect: (t: AssumptionsTab) => void;
}) {
  return <SegmentedTabs items={TABS} active={tab} onSelect={onSelect} />;
}

/**
 * Every dial in the model, grouped the way a person thinks about them --
 * and then split again into what you need to get right on day one
 * ("Basics") versus what you fine-tune later ("Advanced"). Income/expense
 * totals and starting balances always come from the Budget and Balances
 * tabs -- both earlier steps than this one.
 *
 * Second income, co-resident, and job loss already collapse themselves down
 * to a single toggle line when off (see those components), so "Advanced"
 * isn't as heavy as its five cards suggest until someone actually turns one
 * on.
 */
export default function AssumptionsPanel() {
  const [tab, setTab] = useState<AssumptionsTab>("basics");

  return (
    <div className="space-y-5">
      <SourceNoteCard />

      <AssumptionsTabs tab={tab} onSelect={setTab} />

      {tab === "basics" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <IncomeSection />
          <ExpensesSection />
          <HomePurchaseSection />
          <HorizonSection />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <RetirementSection />
          <SavingsSection />
          <SecondIncomeSection />
          <CoResidentSection />
          <JobLossSection />
        </div>
      )}
    </div>
  );
}
