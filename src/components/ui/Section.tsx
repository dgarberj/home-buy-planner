import { useState, type ReactNode } from "react";

/**
 * A collapsible page section. The page is one continuous scroll rather than a
 * set of tabs, so nothing is hidden behind navigation -- but each section can
 * be folded away once you're done with it.
 */
export default function Section({
  id,
  eyebrow,
  title,
  description,
  defaultOpen = true,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-20">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {open ? "Hide" : "Show"}
        </button>
      </header>
      {open && children}
    </section>
  );
}
