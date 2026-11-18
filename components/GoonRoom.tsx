"use client";

import { useEffect, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { resolveAvatar } from "@/lib/portraits";
import { characterMediaUrl } from "@/lib/media";
import { getCoins, spendCoins, addCoins } from "@/lib/storage";

export function GoonRoom({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [coins, setCoins] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setCoins(getCoins());
    try {
      const s = localStorage.getItem("vm-goon-streak");
      if (s) setStreak(parseInt(s, 10) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id],
    );
  };

  const startSession = () => {
    if (selected.length === 0) return;
    if (!spendCoins(15)) {
      setNotice("Need 15 coins to open the Goon Room session.");
      return;
    }
    setNotice(null);
    setCoins(getCoins());
    setTimer(0);
    setRunning(true);
  };

  const endSession = () => {
    setRunning(false);
    const mins = Math.floor(timer / 60);
    const bonus = mins >= 8 ? 12 : 8;
    addCoins(bonus);
    setCoins(getCoins());
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    try {
      localStorage.setItem("vm-goon-streak", String(nextStreak));
    } catch {}
    setNotice(`Session ended. +${bonus} coins. Streak ${nextStreak}. Open chat to generate while the heat is high.`);
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Goon Room</h1>
      <p className="text-sm text-mist">
        Pick one or two girls. Start a timed session. Generate nudes and sex sequences in chat. Dual-select unlocks two-girl prompts.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-amber-200">{coins} coins</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">Session costs 15</span>
        {streak > 0 && (
          <>
            <span className="text-zinc-500">·</span>
            <span className="text-pink-300">Streak {streak}</span>
          </>
        )}
        {running && (
          <span className="ml-auto font-mono text-pink-300 text-lg">
            {mm}:{ss}
          </span>
        )}
      </div>
      {notice && <p className="text-xs text-rose-300">{notice}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {CHARACTERS.map((c) => {
          const on = selected.includes(c.id);
          const src = characterMediaUrl(c, "beauty");
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`rounded-2xl border overflow-hidden text-left transition ${
                on
                  ? "border-pink-500 ring-2 ring-pink-500/50 scale-[1.02] shadow-lg shadow-pink-500/20"
                  : "border-white/10 hover:border-pink-500/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="p-1.5 text-[11px] truncate text-center">{c.name.split(" ")[0]}</div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-zinc-900/80 to-black p-4 space-y-3 shadow-[0_0_40px_rgba(236,72,153,0.15)]">
          <div className="flex -space-x-3">
            {selected.map((id) => {
              const c = CHARACTERS.find((x) => x.id === id)!;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={id}
                  src={characterMediaUrl(c, "beauty")}
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-pink-400 object-cover"
                />
              );
            })}
          </div>
          <div className="text-sm text-cream">
            Selected:{" "}
            {selected.map((id) => CHARACTERS.find((c) => c.id === id)?.name.split(" ")[0]).join(" + ")}
            {selected.length === 2 ? (
              <span className="text-pink-300"> · dual-girl mode unlocked</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <button
                type="button"
                onClick={startSession}
                className="rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium shadow-lg shadow-pink-500/20"
              >
                Start goon session
              </button>
            ) : (
              <button
                type="button"
                onClick={endSession}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm hover:bg-white/5"
              >
                End session (+coins)
              </button>
            )}
            {selected.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onChat(id)}
                className="rounded-xl border border-pink-500/40 px-4 py-2.5 text-sm text-pink-200 hover:bg-pink-500/10"
              >
                Chat {CHARACTERS.find((c) => c.id === id)?.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Tip: In chat use Lingerie / Nude / Explicit / Sex sequence. With two girls selected, dual scenes are unlocked. Sessions ≥ 8 min earn bonus coins.
          </p>
        </div>
      )}
    </div>
  );
}
