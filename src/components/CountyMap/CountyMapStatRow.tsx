/**
 * One label/value/sub-value line, shared by the schools and hazard-risk
 * sections since both are "a handful of stats, each with an optional
 * state-average or rating annotation" -- factored out rather than repeating
 * the same `<div className="flex justify-between gap-4">...` block per stat.
 */
export default function CountyMapStatRow({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${emphasize ? "border-t border-slate-200 pt-2" : ""}`}
    >
      <dt
        className={emphasize ? "font-medium text-slate-900" : "text-slate-600"}
      >
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasize ? "font-semibold" : "font-medium"}`}
      >
        {value}
        {sub && (
          <span className="ml-1 text-xs font-normal text-slate-400">{sub}</span>
        )}
      </dd>
    </div>
  );
}
