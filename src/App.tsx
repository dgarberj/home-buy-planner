import { useEffect, useRef, useState } from "react";
import {
  clusterForHash,
  clusterOfSection,
  sectionIdFromHash,
  type ClusterId,
} from "./clusters";
import AppLayout from "./components/AppLayout";
import AssumptionsPanel from "./components/AssumptionsPanel";
import BalancesPanel from "./components/BalancesPanel";
import BudgetPanel from "./components/BudgetPanel";
import ClusterSections from "./components/ClusterSections";
import ClusterTabs from "./components/ClusterTabs";
import ContributionGauges from "./components/ContributionGauges";
import Dashboard from "./components/Dashboard";
import DrawdownPanel from "./components/DrawdownPanel";
import HowToRead from "./components/HowToRead";
import LenderPanel from "./components/LenderPanel";
import MarketPanel from "./components/MarketPanel";
import MonthlyDataTable from "./components/MonthlyDataTable";
import RetirementImpactSection from "./components/RetirementImpactSection";
import ScenarioBuilder from "./components/ScenarioBuilder";
import Splash from "./components/Splash";
import SourcesPanel from "./components/SourcesPanel";
import VerdictStrip from "./components/VerdictStrip";
import WaitingPanel from "./components/WaitingPanel";
import { useStore } from "./store/useStore";

export default function App() {
  const [cluster, setCluster] = useState<ClusterId>(() =>
    clusterForHash(location.hash),
  );
  // A target Section id queued for scroll-into-view once its cluster has
  // mounted (either from a deep-link hash on first load, or a nav click
  // that changed clusters). A ref, not state -- clearing it is a side
  // effect on an external system (the DOM scroll position), not something
  // a render depends on, so it shouldn't itself trigger a re-render.
  //
  // On initial load, a hash like "#detail" should land on the Results
  // cluster *and* scroll to the Month-by-month Section, not just to the top
  // of Results -- the browser's own fragment-scroll fired before React
  // mounted anything, so it landed on nothing. `sectionIdFromHash` is null
  // for an empty/share/unrecognized hash, so there's nothing queued in that
  // case.
  const pendingScrollId = useRef<string | null>(
    sectionIdFromHash(location.hash),
  );

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id) return;
    document.querySelector(`#${id}`)?.scrollIntoView();
    pendingScrollId.current = null;
  }, [cluster]);

  const hasSeenSplash = useStore((s) => s.settings.hasSeenSplash);
  const setSettings = useStore((s) => s.setSettings);
  // Shown once, on first ever visit, and reopenable later from the header
  // link -- but skipped for a deep link (a specific section, or a
  // #share=... payload) landing directly on it doesn't need the pitch, and
  // ShareImportHandler needs the hash left alone to do its own thing.
  const [splashOpen, setSplashOpen] = useState(
    () => !hasSeenSplash && !location.hash,
  );

  function handleEnterPlanner() {
    if (!hasSeenSplash) setSettings({ hasSeenSplash: true });
    setSplashOpen(false);
  }

  function handleNavigate(id: string) {
    const target = clusterOfSection(id);
    if (target === cluster) {
      document.querySelector(`#${id}`)?.scrollIntoView();
    } else {
      pendingScrollId.current = id;
      setCluster(target);
    }
    history.pushState(null, "", `#${id}`);
  }

  if (splashOpen) {
    return <Splash onEnter={handleEnterPlanner} />;
  }

  return (
    <AppLayout
      onNavigate={handleNavigate}
      onReopenSplash={() => setSplashOpen(true)}
    >
      <VerdictStrip />

      <HowToRead />

      <ClusterTabs cluster={cluster} onSelect={setCluster} />

      <ClusterSections
        cluster={cluster}
        content={{
          balances: <BalancesPanel />,
          budget: <BudgetPanel />,
          contributions: <ContributionGauges />,
          assumptions: <AssumptionsPanel />,
          market: <MarketPanel />,
          lender: <LenderPanel />,
          waiting: <WaitingPanel />,
          scenarios: <ScenarioBuilder />,
          dashboard: <Dashboard />,
          retirement: <RetirementImpactSection />,
          drawdown: <DrawdownPanel />,
          detail: <MonthlyDataTable />,
          sources: <SourcesPanel />,
        }}
      />
    </AppLayout>
  );
}
