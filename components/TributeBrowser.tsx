"use client";

import { useState } from "react";
import { TRIBUTES, type TributeChallenge } from "@/lib/tributes";
import { getCharacter } from "@/lib/characters";
import { getEdgeStreak, recordTributeComplete } from "@/lib/streaks";
import { addCoins } from "@/lib/storage";

const intensityColor = {
  warm: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  hot: "text-pink-300 border-pink-500/40 bg-pink-500/10",
  extreme: "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10",
};

export function TributeBrowser({ onStartWithGirl }: { onStartWithGirl?: (id: string) => void }) {
  const [active, setActive] = useState<TributeChallenge | null>(null);
  const [streak, setStreak] = useState(() => (typeof window !== "undefined" ? getEdgeStreak() : 0));
  const [toast, setToast] = useState("");

  const complete = () => {
    const { streak: s, unlockedDual } = recordTributeComplete();
    setStreak(s);
    addCoins(20);
    setToast(
      unlockedDual
        ? `Day ${s} streak! Free dual-girl gen unlocked · +20 coins`
        : `Tribute logged · streak ${s}/3 for free dual · +20 coins`,
    );
    setActive(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-cream">Tribute challenges</h2>
        <p className="mt-2 text-mist text-sm max-w-xl">
          Edge, goon, cum for the girls. Complete once per day to build your edging streak — 3 days unlocks a free dual-girl generation.
        </p>
        <p className="mt-2 text-sm text-pink-300">Edging streak: {streak} day{streak === 1 ? "" : "s"}</p>
        {toast && <p className="mt-1 text-xs text-emerald-300">{toast}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRIBUTES.map((t) => {
          const girl = t.characterId ? getCharacter(t.characterId) : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t)}
              className="text-left rounded-3xl border border-white/10 bg-white/[0.03] p-5 hover:border-pink-500/50 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-cream">{t.title}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${intensityColor[t.intensity]}`}>
                  {t.intensity}
                </span>
              </div>
              <p className="text-xs text-mist mt-2">{t.duration}{girl ? ` · ${girl.name}` : " · any girl"}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-pink-500/30 bg-ink-900 p-6 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="text-xl font-semibold text-cream">{active.title}</h3>
                <p className="text-xs text-pink-300 mt-1 uppercase tracking-wide">
                  {active.intensity} · {active.duration}
                </p>
              </div>
              <button type="button" onClick={() => setActive(null)} className="text-zinc-400 text-lg">
                ✕
              </button>
            </div>
            <ol className="mt-5 space-y-2 list-decimal list-inside text-sm text-mist">
              {active.instructions.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ol>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Edge rule</div>
                <p className="text-sm text-cream mt-1">{active.edgeRule}</p>
              </div>
              <div className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-3">
                <div className="text-[10px] uppercase tracking-wider text-pink-300">Finish rule</div>
                <p className="text-sm text-cream mt-1">{active.finishRule}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {active.characterId && onStartWithGirl && (
                <button
                  type="button"
                  onClick={() => {
                    onStartWithGirl(active.characterId!);
                    setActive(null);
                  }}
                  className="flex-1 min-w-[140px] py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium text-white"
                >
                  Start with {getCharacter(active.characterId)?.name.split(" ")[0]}
                </button>
              )}
              <button
                type="button"
                onClick={complete}
                className="flex-1 min-w-[140px] py-3 rounded-2xl border border-emerald-500/40 text-emerald-200 font-medium"
              >
                Mark complete (+streak)
              </button>
              <button type="button" onClick={() => setActive(null)} className="px-5 py-3 rounded-2xl border border-white/15 text-cream">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
