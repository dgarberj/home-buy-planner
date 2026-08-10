import { useState } from "react";
import { useStore } from "../../store/useStore";
import { Button, Card, MoneyInput, SectionTitle } from "../ui";
import CountyMap from "../CountyMap";

export default function CountyOverviewCard({
  price,
  setPrice,
}: {
  price: number;
  setPrice: (price: number) => void;
}) {
  const { settings, setSettings } = useStore();
  const [selected, setSelected] = useState<string>(
    settings.shortlist[0] ?? "Marple",
  );

  return (
    <Card
      title="Delaware County at a glance"
      subtitle="Every municipality, coloured by tax. Hover for millage, school performance and the monthly cost. Click to select."
    >
      <CountyMap
        price={price}
        highlighted={settings.shortlist}
        onPick={(name) => setSelected(name)}
      />
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="w-44">
          <SectionTitle>Price to test</SectionTitle>
          <MoneyInput value={price} step={5000} onChange={setPrice} />
        </div>
        <div className="w-44">
          <SectionTitle>Shortlist</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {settings.shortlist.length === 0 && (
              <span className="text-xs text-slate-400">None yet</span>
            )}
            {settings.shortlist.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setSettings({
                    shortlist: settings.shortlist.filter((n) => n !== name),
                  })
                }
                className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                title="Remove from shortlist"
              >
                {name} ✕
              </button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            !settings.shortlist.includes(selected) &&
            setSettings({ shortlist: [...settings.shortlist, selected] })
          }
        >
          Add {selected} to shortlist
        </Button>
      </div>
    </Card>
  );
}
