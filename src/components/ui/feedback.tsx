import type { ReactNode } from "react";

/**
Small presentational primitives shared across every panel.
*/

/**
 * A hoverable "?" that explains an assumption in plain language.
 *
 * `placement` matters inside scrolling containers: a tooltip drawn above a
 * sticky table header gets clipped, so those callers pass "bottom".
 */
export function InfoTip({
  text,
  placement = "top",
}: {
  text: string;
  placement?: "top" | "bottom";
}) {
  const position = placement === "top" ? "bottom-full mb-2" : "top-full mt-2";
  return (
    <span className="group relative ml-1 inline-flex shrink-0 translate-y-px align-middle">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold normal-case leading-none tracking-normal text-slate-400 hover:border-slate-400 hover:text-slate-600"
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 z-30 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${position}`}
      >
        {text}
      </span>
    </span>
  );
}

export function Label({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="flex items-start text-sm font-medium leading-snug text-slate-700">
      <span className="min-w-0">{children}</span>
      {hint && <InfoTip text={hint} />}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (isChecked: boolean) => void;
  label: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-left">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        // overflow-hidden is a belt-and-braces guard: even if the knob's
        // positioning is ever broken again, it cannot escape the pill and land
        // on top of the label beside it.
        className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        {/*
          left-0.5 is load-bearing. Without an explicit horizontal anchor an
          absolutely positioned element falls back to its static position,
          which inherits text-align from an ancestor -- so inside any
          right-aligned container the knob started at the RIGHT edge and the
          translate then pushed it further right, off the switch entirely.

          Track 44px, knob 20px, 2px inset each side: off at x=2, on at x=22,
          so the travel is exactly 20px.
        */}
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="flex items-start text-sm leading-snug text-slate-700">
        <span className="min-w-0">{label}</span>
        {hint && <InfoTip text={hint} />}
      </span>
    </label>
  );
}

/**
Background/text/border classes per tone, shared by `Callout` and anything
else (e.g. `VerdictStrip`) that needs the same tone→colour mapping in a
different layout, so the two can't drift apart.
*/
export const TONE_CLASSES = {
  good: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  bad: "bg-red-50 text-red-900 border-red-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

/**
A coloured plain-English conclusion box.
*/
export function Callout({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad" | "neutral";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  );
}

/**
Big number + caption, used across the dashboard.
*/
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad";
  sub?: string;
}) {
  const toneClass = {
    good: "text-emerald-600",
    bad: "text-red-600",
    neutral: "text-slate-900",
  }[tone];
  return (
    <div>
      <div className="flex items-start text-xs font-medium uppercase tracking-wide text-slate-500">
        <span className="min-w-0">{label}</span>
        {hint && <InfoTip text={hint} />}
      </div>
      <div
        className={`mt-1 break-words text-2xl font-semibold leading-tight tabular-nums ${toneClass}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 break-words text-xs leading-relaxed text-slate-500">
          {sub}
        </div>
      )}
    </div>
  );
}
