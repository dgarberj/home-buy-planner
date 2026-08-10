import LeversBar from "../LeversBar";
import { Sidebar } from "../ui";
import { NAV } from "../../nav";

/**
 * The persistent left column at `md:` and above: section navigation, then
 * the levers, so both stay reachable without scrolling back up. Below `md:`
 * this renders nothing -- `App.tsx` has a separate in-flow fallback.
 *
 * `onNavigate` lets `App.tsx` (the sole owner of the active cluster) switch
 * clusters and queue a post-render scroll before the link's own anchor jump
 * would otherwise land on a Section that isn't mounted yet.
 */
export default function AppSidebar({
  onNavigate,
}: {
  onNavigate: (id: string) => void;
}) {
  return (
    <Sidebar>
      <div className="flex flex-col gap-1">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(n.id);
            }}
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
