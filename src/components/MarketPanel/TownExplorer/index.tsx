import { useMemo, useState } from "react";
import { COST_DEFAULTS } from "../../../costDefaults";
import { useRankedTowns } from "../../../hooks/useRankedTowns";
import {
  RELEVANT_TOWN_COUNT,
  useTownRelevance,
} from "../../../hooks/useTownRelevance";
import { useStore } from "../../../store/useStore";
import CountyMap from "../../CountyMap";
import { Callout, Card, Field, MoneyInput, Toggle } from "../../ui";
import AllTownsTable from "./AllTownsTable";
import BudgetControls from "./BudgetControls";
import TownCard from "./TownCard";

export default function TownExplorer() {
  const assumptions = useStore((s) => s.assumptions);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [reserve, setReserve] = useState(
    COST_DEFAULTS.defaultReserveForSavingsUsd,
  );
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);
  const [priceOverride, setPriceOverride] = useState(
    assumptions.home.targetPrice,
  );
  const [showAllTowns, setShowAllTowns] = useState(false);

  const creditScore = settings.creditScore;
  const pinned = settings.shortlist;

  const { budget, ceilingPrice, rows } = useRankedTowns(
    assumptions,
    reserve,
    creditScore,
  );
  const relevant = useTownRelevance(rows, RELEVANT_TOWN_COUNT);

  const pinnedRows = useMemo(
    () =>
      pinned
        .map((name) => rows.find((r) => r.m.name === name))
        .filter((r) => r != null),
    [pinned, rows],
  );

  // Auto-suggestions top the pinned set up to RELEVANT_TOWN_COUNT, so a user
  // who has already pinned enough towns doesn't get unrequested extras.
  const suggested = useMemo(() => {
    const pinnedNames = new Set(pinned);
    return relevant
      .filter((r) => !pinnedNames.has(r.row.m.name))
      .slice(0, Math.max(0, RELEVANT_TOWN_COUNT - pinned.length));
  }, [relevant, pinned]);

  // Seeded once from the initial ranked/pinned set; manual expand/collapse
  // choices afterward persist across re-ranks (e.g. moving the reserve
  // slider) rather than being clobbered every render.
  const [expandedTowns, setExpandedTowns] = useState<Set<string>>(
    () =>
      new Set([
        ...pinnedRows.map((row) => row.m.name),
        ...suggested.map((r) => r.row.m.name),
      ]),
  );

  const toggleExpand = (name: string) =>
    setExpandedTowns((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const togglePin = (name: string) => {
    const isPinned = pinned.includes(name);
    setSettings({
      shortlist: isPinned
        ? pinned.filter((n) => n !== name)
        : [...pinned, name],
    });
    // Pinning always shows the town expanded -- otherwise pinning a town
    // from the full table would leave it collapsed while bumping a
    // previously-expanded suggestion out of view.
    if (!isPinned) {
      setExpandedTowns((previous) => new Set(previous).add(name));
    }
  };

  return (
    <div className="space-y-5">
      <Card
        title="What you can actually afford, and where"
        subtitle="Each town judged against its OWN median house price, not a hypothetical one. Ranking by tax rate alone points you at places you cannot buy."
      >
        <BudgetControls
          assumptions={assumptions}
          setAssumptions={setAssumptions}
          reserve={reserve}
          setReserve={setReserve}
          creditScore={creditScore}
          setCreditScore={(v) => setSettings({ creditScore: v })}
          budget={budget}
          ceilingPrice={ceilingPrice}
          typicalEffectiveTaxRate={COST_DEFAULTS.typicalEffectiveTaxRate}
        />

        <div className="mt-4">
          <Toggle
            checked={priceOverrideEnabled}
            onChange={setPriceOverrideEnabled}
            label="Test a hypothetical price instead of each town's own median"
            hint="Off by default: figures below use each town's own sourced median price, consistent with its reach badge. Turn this on to ask 'what would $X cost here' instead."
          />
          {priceOverrideEnabled && (
            <div className="mt-2 w-44">
              <Field label="Price to test">
                <MoneyInput
                  value={priceOverride}
                  step={5000}
                  onChange={setPriceOverride}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Callout tone="warn">
            <strong>The trap in the tax table.</strong> The lowest rates sit
            under the best schools, and those are exactly the places you cannot
            buy. Radnor is 1.26% with a $1,206,000 median. Marple is 1.09% with
            a $651,500 median. A cheap rate on a house out of reach is worth
            nothing. The towns below are pre-picked to avoid that trap.
          </Callout>
        </div>

        {pinnedRows.length > 0 && (
          <div
            className={`mt-4 gap-3 space-y-3 ${
              pinnedRows.length >= 2
                ? "md:grid md:grid-cols-2 md:space-y-0"
                : ""
            }`}
          >
            {pinnedRows.map((row) => (
              <TownCard
                key={row.m.name}
                row={row}
                assumptions={assumptions}
                creditScore={creditScore}
                priceOverride={priceOverrideEnabled ? priceOverride : null}
                isPinned
                isExpanded={expandedTowns.has(row.m.name)}
                onToggleExpand={() => toggleExpand(row.m.name)}
                onTogglePin={() => togglePin(row.m.name)}
              />
            ))}
          </div>
        )}

        {suggested.length > 0 && (
          <div className="mt-4 space-y-3">
            {suggested.map(({ row, affordabilityScreened }) => (
              <TownCard
                key={row.m.name}
                row={row}
                assumptions={assumptions}
                creditScore={creditScore}
                priceOverride={priceOverrideEnabled ? priceOverride : null}
                isPinned={false}
                isExpanded={expandedTowns.has(row.m.name)}
                affordabilityScreened={affordabilityScreened}
                onToggleExpand={() => toggleExpand(row.m.name)}
                onTogglePin={() => togglePin(row.m.name)}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAllTowns((v) => !v)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            {showAllTowns ? "Hide" : "Browse"} all 112 towns
          </button>
          {showAllTowns && (
            <div className="mt-3">
              <AllTownsTable
                assumptions={assumptions}
                rows={rows}
                pinned={pinned}
                onTogglePin={togglePin}
              />
            </div>
          )}
        </div>
      </Card>

      <Card
        title="County map"
        subtitle="Every municipality, coloured by tax. Click a town to pin it."
      >
        <CountyMap
          price={
            priceOverrideEnabled ? priceOverride : assumptions.home.targetPrice
          }
          highlighted={pinned}
          onPick={(name) => {
            if (!pinned.includes(name)) togglePin(name);
          }}
        />
      </Card>
    </div>
  );
}
