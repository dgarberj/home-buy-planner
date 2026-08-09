import { useState } from "react";
import AssumptionsPanel from "./components/AssumptionsPanel";
import BalancesPanel from "./components/BalancesPanel";
import BudgetPanel from "./components/BudgetPanel";
import Dashboard from "./components/Dashboard";
import DataToolbar from "./components/DataToolbar";
import ContributionGauges from "./components/ContributionGauges";
import DrawdownPanel from "./components/DrawdownPanel";
import LenderPanel from "./components/LenderPanel";
import LeversBar from "./components/LeversBar";
import MarketPanel from "./components/MarketPanel";
import WaitingPanel from "./components/WaitingPanel";
import MonthlyDataTable from "./components/MonthlyDataTable";
import RetirementMilestones from "./components/RetirementMilestones";
import ScenarioBuilder from "./components/ScenarioBuilder";
import SourcesPanel from "./components/SourcesPanel";
import Section from "./components/Section";

const NAV = [
  { id: "budget", label: "Budget" },
  { id: "assumptions", label: "Assumptions" },
  { id: "balances", label: "Balances" },
  { id: "contributions", label: "Contributions" },
  { id: "market", label: "Where to buy" },
  { id: "lender", label: "Lender view" },
  { id: "waiting", label: "Worth waiting?" },
  { id: "scenarios", label: "Scenarios" },
  { id: "dashboard", label: "Dashboard" },
  { id: "retirement", label: "Retirement" },
  { id: "drawdown", label: "Will it last?" },
  { id: "detail", label: "Month by month" },
  { id: "sources", label: "Sources" },
];

/**
A short, non-technical explainer, folded away until someone wants it.
*/
function HowToRead() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="text-base font-semibold text-slate-900">
            How to read this
          </span>
          <span className="ml-2 text-sm text-slate-500">
            60 seconds on what the numbers mean
          </span>
        </span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
          <p>
            This tool answers one question:{" "}
            <strong className="text-slate-900">
              when can we buy a house, and would we be okay if one of us lost a
              job?
            </strong>
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <strong className="text-slate-900">Start at the top.</strong> The
              budget is every recurring dollar in and out. Change any number and
              everything below updates instantly.
            </li>
            <li>
              <strong className="text-slate-900">
                Scenarios are versions of the future.
              </strong>{" "}
              Each one picks a month to buy and whether a job loss happens. Drag
              the sliders — that is what they are for.
            </li>
            <li>
              <strong className="text-slate-900">"House ready"</strong> is the
              first month our savings would cover the down payment and closing
              costs. The house gets more expensive while we save, so waiting is
              not free.
            </li>
            <li>
              <strong className="text-slate-900">"Thinnest cash"</strong> is the
              lowest our spendable savings ever get. It is the resilience
              number. Below zero, in red, means the plan does not fund itself.
            </li>
            <li>
              <strong className="text-slate-900">
                Commitments are different from expenses.
              </strong>{" "}
              A fixed obligation with a known end date never inflates and never
              gets cut in a crisis — and the month it ends, money frees up for
              good.
            </li>
            <li>
              <strong className="text-slate-900">
                Nothing here is a prediction.
              </strong>{" "}
              It is arithmetic on the assumptions we typed in. Change an
              assumption and you get a different, equally confident-looking
              answer — which is exactly why it is worth playing with the
              extremes.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <div className="mr-auto">
            <h1 className="text-base font-semibold tracking-tight">
              Home Buy Planner
            </h1>
            <p className="text-xs text-slate-500">
              Runs entirely on this computer. Nothing is sent anywhere.
            </p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <DataToolbar />
        </div>
        {/* The switches worth flipping repeatedly, so they follow you down. */}
        <LeversBar />
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-8">
        <HowToRead />

        <Section
          id="budget"
          eyebrow="Step 1"
          title="What comes in and what goes out"
          description="Your actual budget. Anything marked ESTIMATE is still a guess — fixing those, starting with take-home, makes everything downstream more honest."
        >
          <BudgetPanel />
        </Section>

        <Section
          id="assumptions"
          eyebrow="Step 2"
          title="Assumptions"
          description="The rates and terms behind the projection: raises, inflation, investment returns, and the house we're aiming at. Hover any ? for what it means."
        >
          <AssumptionsPanel />
        </Section>

        <Section
          id="balances"
          eyebrow="Step 3"
          title="What we actually have"
          description="A snapshot of real balances, logged every month or quarter. The newest one is where the projection starts."
          defaultOpen={false}
        >
          <BalancesPanel />
        </Section>

        <Section
          id="contributions"
          eyebrow="Step 4"
          title="Retirement contributions"
          description="What you are putting away each year, against the targets — and what that leaves for a deposit."
        >
          <ContributionGauges />
        </Section>

        <Section
          id="market"
          eyebrow="Step 5"
          title="Where to buy"
          description="Real 2026 Delaware County tax rates. The same house can cost several hundred a month more depending only on which township line it sits behind."
        >
          <MarketPanel />
        </Section>

        <Section
          id="lender"
          eyebrow="The hard gate"
          title="What a lender will allow"
          description="A different calculation from yours — gross income, fixed obligations counted as debt, upkeep ignored. The smaller of the two ceilings is the one that governs."
        >
          <LenderPanel />
        </Section>

        <Section
          id="waiting"
          eyebrow="The trade-off"
          title="Is it worth waiting?"
          description="Whether saving longer actually puts a better house in reach — and which of the two constraints is really holding you back."
        >
          <WaitingPanel />
        </Section>

        <Section
          id="scenarios"
          eyebrow="Step 6"
          title="Scenarios to compare"
          description="Buy early or buy later, with or without a job loss. Add as many as you like."
        >
          <ScenarioBuilder />
        </Section>

        <Section
          id="dashboard"
          eyebrow="The answer"
          title="Dashboard"
          description="How the scenarios diverge over the next few years, and whether each one holds up."
        >
          <Dashboard />
        </Section>

        <Section
          id="retirement"
          eyebrow="The long view"
          title="Impact at retirement"
          description="How the buy-early decision compounds by the time you stop working — and, just as importantly, where it doesn't."
        >
          <RetirementMilestones />
        </Section>

        <Section
          id="drawdown"
          eyebrow="The real question"
          title="Will the money last?"
          description="A pot of money at 65 means nothing on its own. This is what it actually supports, and when it runs out."
        >
          <DrawdownPanel />
        </Section>

        <Section
          id="detail"
          eyebrow="The receipts"
          title="Month by month"
          description="The raw output of the projection, one row per month, for checking the model's working."
          defaultOpen={false}
        >
          <MonthlyDataTable />
        </Section>

        <Section
          id="sources"
          eyebrow="The receipts"
          title="Where the numbers came from"
          description="Every external figure in this app, with a link, what it covers, and how far to trust it."
          defaultOpen={false}
        >
          <SourcesPanel />
        </Section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
          Your numbers are saved in this browser only. Use Export to keep a
          backup in the gitignored{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-500">
            data/
          </code>{" "}
          folder.
        </footer>
      </main>
    </div>
  );
}
