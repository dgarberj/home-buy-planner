import CoResidentSection from "./CoResidentSection";
import ExpensesSection from "./ExpensesSection";
import HomePurchaseSection from "./HomePurchaseSection";
import HorizonSection from "./HorizonSection";
import IncomeSection from "./IncomeSection";
import JobLossSection from "./JobLossSection";
import RetirementSection from "./RetirementSection";
import SavingsSection from "./SavingsSection";
import SecondIncomeSection from "./SecondIncomeSection";
import SourceTogglesCard from "./SourceTogglesCard";

/**
 * Every dial in the model, grouped the way a person thinks about them.
 * Income/expense totals and starting balances can either be typed here or
 * driven by the Budget and Balances tabs -- the toggles say which.
 */
export default function AssumptionsPanel() {
  return (
    <div className="space-y-5">
      <SourceTogglesCard />

      <div className="grid gap-5 lg:grid-cols-2">
        <IncomeSection />
        <ExpensesSection />
        <RetirementSection />
        <SavingsSection />
        <HomePurchaseSection />
        <SecondIncomeSection />
        <CoResidentSection />
        <JobLossSection />
        <HorizonSection />
      </div>
    </div>
  );
}
