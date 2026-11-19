"use client";

import { useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

const PIECES = ["Top", "Bra", "Skirt", "Panties", "Stockings", "Everything"];
const POSITIONS = ["Missionary", "Doggy", "Cowgirl", "Blowjob", "Standing", "Reverse cowgirl", "Shower", "Hotel"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function StripRoulette({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [girl, setGirl] = useState<Character | null>(null);
  const [result, setResult] = useState<{ piece: string; position: string } | null>(null);
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    setSpinning(true);
    setResult(null);
    setTimeout(() => {
      const g = pick(CHARACTERS);
      setGirl(g);
      setResult({ piece: pick(PIECES), position: pick(POSITIONS) });
      setSpinning(false);
    }, 700);
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">← Home</button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">Strip Roulette</h2>
      <p className="text-sm text-zinc-400">Spin for a girl, a clothing piece, and a position. Then undress or take it to chat.</p>
      <button type="button" onClick={spin} disabled={spinning} className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 py-3 font-semibold text-white disabled:opacity-50">
        {spinning ? "Spinning…" : "Spin"}
      </button>
      {result && girl && (
        <div className="rounded-3xl border border-pink-500/30 bg-zinc-900/60 overflow-hidden">
          <img src={characterMediaUrl(girl, "lingerie")} alt="" className="aspect-[3/4] w-full object-cover" />
          <div className="p-4 space-y-2">
            <div className="text-lg font-bold text-cream">{girl.name}</div>
            <div className="text-sm text-pink-300">Lose: {result.piece}</div>
            <div className="text-sm text-fuchsia-300">Then: {result.position}</div>
            <button type="button" onClick={() => onChat(girl.id)} className="mt-2 w-full rounded-xl bg-pink-600/80 py-2 text-sm font-medium">
              Open chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
