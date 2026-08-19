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
