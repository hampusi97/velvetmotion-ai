"use client";

import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";

function cardImage(c: Character) {
  if (c.avatar && !c.avatar.endsWith(".svg")) return c.avatar;
  const prompt = encodeURIComponent(
    `photorealistic beautiful adult woman, ${c.figure}, portrait, seductive, soft light, looking at viewer, 8k`,
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=768&height=1152&nologo=true&seed=${c.id.length * 999}&model=flux&enhance=true`;
}

export function DiscoverSwipe({
  onMatch,
  onHome,
  extra = [],
}: {
  onMatch: (c: Character) => void;
  onHome: () => void;
  extra?: Character[];
}) {
  const [customGirls, setCustomGirls] = useState<Character[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("velvet-custom-girls");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomGirls(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const deck = useMemo(
    () => [...extra, ...customGirls, ...CHARACTERS],
    [extra, customGirls],
  );

  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);

  const current = deck[idx % deck.length];
  if (!current) {
    return (
      <div>
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">← Home</button>
        <p className="mt-6 text-zinc-400">No girls in the deck yet.</p>
      </div>
    );
  }

  const pass = () => setIdx((i) => i + 1);
  const like = () => {
    setLiked((L) => [...L, current.id]);
    onMatch(current);
  };

  return (
    <div className="max-w-sm mx-auto">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-4">
        ← Home
      </button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent mb-1">
        Discover
      </h2>
      <p className="text-xs text-zinc-500 mb-4">Swipe-style matches · {liked.length} likes this session</p>

      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cardImage(current)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent">
          <div className="text-2xl font-bold">
            {current.name}, {current.age}
          </div>
          <div className="text-pink-300 text-xs uppercase tracking-wide mt-1">{current.category}</div>
          <p className="text-sm text-zinc-200 mt-2 line-clamp-3">{current.tagline}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {current.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-7">
        <button
          type="button"
          onClick={pass}
          className="w-16 h-16 rounded-full bg-zinc-900 border border-white/15 text-2xl hover:border-red-400 hover:text-red-400 transition"
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={like}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-2xl shadow-lg shadow-pink-500/40 hover:scale-105 transition"
          aria-label="Like"
        >
          ♥
        </button>
      </div>
      <p className="text-center text-[11px] text-zinc-500 mt-4">Heart opens chat · X skips to the next girl</p>
    </div>
  );
}
