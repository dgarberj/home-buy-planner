import type { Reach } from "../../../engine/affordability";

export const REACH_LABEL: Record<Reach, string> = {
  comfortable: "Comfortable",
  stretch: "A stretch",
  "out-of-reach": "Out of reach",
  unknown: "Unknown",
};

export const REACH_STYLE: Record<Reach, string> = {
  comfortable: "bg-emerald-100 text-emerald-800",
  stretch: "bg-amber-100 text-amber-800",
  "out-of-reach": "bg-red-100 text-red-700",
  unknown: "bg-slate-100 text-slate-500",
};
