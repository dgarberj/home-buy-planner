import LeversBar from "../LeversBar";
import { Sidebar } from "../ui";
import { NAV } from "../../nav";

/**
 * The persistent left column at `md:` and above: section navigation, then
 * the levers, so both stay reachable without scrolling back up. Below `md:`
 * this renders nothing -- `App.tsx` has a separate in-flow fallback.
 */
export default function AppSidebar() {
  return (
    <Sidebar>
      <div className="flex flex-col gap-1">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {n.label}
          </a>
        ))}
      </div>
      <LeversBar />
    </Sidebar>
  );
}
