import type { ReactNode } from "react";

function ListItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-semibold text-slate-900">{title}</span> {children}
    </li>
  );
}

/**
 * The front door. Shown once, on the very first visit -- and reopenable any
 * time after via the header link -- so first paint is a plain-language pitch
 * instead of the full Setup wall of budget, balance, and assumption inputs.
 * `App.tsx` owns *whether* this is showing (including skipping it entirely
 * for a deep link or a share link); this component only renders the pitch
 * and hands control back on `onEnter`.
 */
export default function Splash({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Home Buy Planner
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            When can we actually buy a house?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            This tool answers that, plus the question that matters more: would
            we still be okay if one of us lost a job along the way. Type in your
            real numbers and it does the arithmetic instantly — no spreadsheet,
            no guessing.
          </p>

          <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <ListItem title="Start with your budget.">
              Every recurring dollar in and out. Change any number and
              everything downstream — contributions, scenarios, the answer —
              updates instantly.
            </ListItem>
            <ListItem title="Scenarios are versions of the future.">
              Pick a month to buy and whether a job loss happens along the way.
              Add as many as you like and compare them side by side.
            </ListItem>
            <ListItem
              title={
                '"House ready" and "thinnest cash" are the two numbers that matter.'
              }
            >
              The first month you could afford it, and the lowest your savings
              ever get along the way. Below zero, in red, means the plan doesn't
              fund itself.
            </ListItem>
            <ListItem title="Nothing here is a prediction.">
              It's arithmetic on the assumptions you type in — which is exactly
              why it's worth playing with the extremes.
            </ListItem>
          </ul>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Open the planner
            </button>
            <p className="text-xs text-slate-400">
              Your numbers stay saved in this browser only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
