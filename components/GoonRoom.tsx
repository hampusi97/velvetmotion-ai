"use client";

import { useEffect, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { characterPortraitUrl } from "@/lib/portraits";
import { getCoins, spendCoins, addCoins } from "@/lib/storage";

export function GoonRoom({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [coins, setCoins] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => setCoins(getCoins()), []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id]));
  };

  const startSession = () => {
    if (selected.length === 0) return;
    if (!spendCoins(20)) {
      alert("Need 20 coins to open the Goon Room session.");
      return;
    }
    setCoins(getCoins());
    setTimer(0);
    setRunning(true);
  };

  const endSession = () => {
    setRunning(false);
    addCoins(5);
    setCoins(getCoins());
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Goon Room</h1>
      <p className="text-sm text-mist">
        Pick one or two girls. Start a timed session. Generate nudes in chat. Dual-select enables two-girl prompts.
      </p>
      <div className="text-sm text-amber-200">{coins} coins · session costs 20</div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {CHARACTERS.map((c) => {
          const on = selected.includes(c.id);
          const src = c.avatar.startsWith("http") ? c.avatar : characterPortraitUrl(c.id, c.figure);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`rounded-2xl border overflow-hidden text-left ${on ? "border-pink-500 ring-1 ring-pink-500" : "border-white/10"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="p-1.5 text-[11px] truncate">{c.name.split(" ")[0]}</div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
          <div className="text-sm">
            Selected: {selected.map((id) => CHARACTERS.find((c) => c.id === id)?.name.split(" ")[0]).join(" + ")}
            {selected.length === 2 ? " · dual-girl mode" : ""}
          </div>
          <div className="text-2xl font-mono text-pink-300">
            {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
          </div>
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <button type="button" onClick={startSession} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-medium">
                Start goon session
              </button>
            ) : (
              <button type="button" onClick={endSession} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
                End (+5 coins)
              </button>
            )}
            {selected.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onChat(id)}
                className="rounded-xl border border-pink-500/40 px-4 py-2 text-sm text-pink-200"
              >
                Chat {CHARACTERS.find((c) => c.id === id)?.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Tip: In chat, use Generate → Explicit / Sex video. With two selected, dual scenes are unlocked in the generator.
          </p>
        </div>
      )}
    </div>
  );
}
