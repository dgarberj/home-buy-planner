/**
Plain flex/grid segmented control -- no absolutely-positioned "active tab"
indicator, per the layout guard's preference for that pattern.
*/
export default function SegmentedTabs<T extends string>({
  items,
  active,
  onSelect,
}: {
  items: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-pressed={active === item.id}
          className={
            active === item.id
              ? "flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition"
              : "flex-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
