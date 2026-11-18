"use client";

import { useEffect, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { TRIBUTES } from "@/lib/tributes";
import { resolveAvatar } from "@/lib/portraits";
import { spendCoins, getCoins, addCoins } from "@/lib/storage";

const DURATION = 8 * 60; // 8 minutes

export function RouletteRoom({
  onHome,
  onChat,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
}) {
  const [coins, setCoins] = useState(0);
  const [girlId, setGirlId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => setCoins(getCoins()), []);

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const spin = () => {
    if (spinning) return;
    if (!spendCoins(12)) {
      alert("Need 12 coins to spin roulette");
      return;
    }
    setCoins(getCoins());
    setSpinning(true);
    // Fake spin delay for drama
    setTimeout(() => {
      const g = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      const c = TRIBUTES[Math.floor(Math.random() * TRIBUTES.length)];
      setGirlId(g.id);
      setChallengeId(c.id);
      setLeft(DURATION);
      setRunning(true);
      setSpinning(false);
    }, 900);
  };

  const finish = () => {
    setRunning(false);
    addCoins(10);
    setCoins(getCoins());
  };

  const girl = CHARACTERS.find((c) => c.id === girlId);
  const challenge = TRIBUTES.find((t) => t.id === challengeId);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Roulette Room</h1>
      <p className="text-sm text-mist">
        Random girl + random tribute. Eight-minute sprint. 12 coins to spin.
      </p>
      <div className="text-sm text-amber-200">{coins} coins</div>

      {!running && (
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold text-lg shadow-lg shadow-pink-500/30 disabled:opacity-60"
        >
          {spinning ? "Spinning…" : "Spin the wheel"}
        </button>
      )}

      {girl && challenge && (
        <div className="rounded-3xl border border-pink-500/30 bg-zinc-900/60 overflow-hidden">
          <div className="relative aspect-[16/10]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAvatar(girl.avatar, girl.id, girl.figure)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-2xl font-bold text-white">{girl.name}</div>
              <div className="text-pink-300 text-sm">{challenge.title}</div>
            </div>
            {running && (
              <div className="absolute top-4 right-4 rounded-full bg-black/70 px-3 py-1 font-mono text-pink-300">
                {mm}:{ss}
              </div>
            )}
          </div>
          <div className="p-4 space-y-2 text-sm">
            <p className="text-zinc-300">{challenge.instructions[0]}</p>
            <p className="text-xs text-zinc-500">Edge: {challenge.edgeRule}</p>
            <p className="text-xs text-zinc-500">Finish: {challenge.finishRule}</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => onChat(girl.id)}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 font-medium"
              >
                Chat her now
              </button>
              {running && left === 0 && (
                <button
                  type="button"
                  onClick={finish}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-sm hover:bg-white/5"
                >
                  Done (+10)
                </button>
              )}
              {running && left > 0 && (
                <button
                  type="button"
                  onClick={finish}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-sm text-zinc-400"
                >
                  Bail early
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
