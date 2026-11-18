import type { Accent } from "@/lib/content/types";

/** Literal class strings so Tailwind can see them. */
export const ACCENT_CLASS: Record<Accent, string> = {
  amber: "from-amber-700 to-orange-500",
  violet: "from-violet-700 to-purple-500",
  fuchsia: "from-fuchsia-700 to-pink-500",
  red: "from-red-800 to-rose-500",
  sky: "from-sky-700 to-indigo-400",
  orange: "from-orange-700 to-amber-400",
  pink: "from-pink-600 to-rose-400",
  rose: "from-rose-700 to-pink-400",
  indigo: "from-indigo-700 to-violet-400",
  cyan: "from-cyan-700 to-sky-400",
  emerald: "from-emerald-700 to-teal-400",
  slate: "from-slate-600 to-zinc-400",
};
