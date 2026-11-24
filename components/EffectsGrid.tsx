"use client";

import { useState } from "react";
import { EFFECTS, type Effect } from "@/data/effects";
import { Sparkles } from "lucide-react";

export function EffectsGrid({ onPick }: { onPick: (effect: Effect) => void }) {
  const [cat, setCat] = useState<string>("all");
  const cats = ["all", ...Array.from(new Set(EFFECTS.map((e) => e.category)))];
  const items = cat === "all" ? EFFECTS : EFFECTS.filter((e) => e.category === cat);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[11px] text-pink-100">
        <strong>Photo Tools:</strong> Upload a photo, pick an effect, get a result. Face stays locked. Local engine preferred for explicit.
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border capitalize ${
              cat === c ? "border-pink-400 bg-pink-500/20 text-white" : "border-white/15 text-zinc-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((e) => (
          <button
            key={e.slug}
            type="button"
            onClick={() => onPick(e)}
            className="rounded-2xl border border-white/10 bg-[#120f14] p-3 text-left hover:border-pink-400/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{e.label}</span>
              {e.featured && <Sparkles className="h-3 w-3 text-pink-400" />}
            </div>
            <p className="mt-1 text-[10px] text-zinc-400 line-clamp-2">{e.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
