"use client";

import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { characterPortraitUrl, resolveAvatar } from "@/lib/portraits";
import { addCoins, getCoins } from "@/lib/storage";

function cardImage(c: Character, spicy = false) {
  if (!spicy && c.avatar && !c.avatar.endsWith(".svg") && (c.avatar.startsWith("http") || c.avatar.startsWith("data:"))) {
    return c.avatar;
  }
  return characterPortraitUrl(c.id, c.figure, spicy ? "lingerie" : "seductive");
}

const HOOKS = [
  "She just liked you back",
  "Online now · 2 min away",
  "Wants something explicit",
  "Matched your vibe",
  "Looking for a late session",
  "Tribute energy tonight",
  "Feeling needy",
  "New to the app · curious",
  "Will send nudes if you match",
  "In the mood to edge you",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [deck, setDeck] = useState<Character[]>([]);
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [passed, setPassed] = useState(0);
  const [showMatch, setShowMatch] = useState<Character | null>(null);
  const [spicyPeek, setSpicyPeek] = useState(false);
  const [coins, setCoins] = useState(500);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [superLiked, setSuperLiked] = useState(false);

  useEffect(() => {
    setCoins(getCoins());
    try {
      const raw = localStorage.getItem("velvet-custom-girls");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomGirls(parsed);
      }
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    const base = [...extra, ...customGirls, ...CHARACTERS];
    // Deduplicate by id
    const seen = new Set<string>();
    const unique = base.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    setDeck(shuffle(unique));
    setIdx(0);
  }, [extra, customGirls]);

  const current = deck[idx % Math.max(deck.length, 1)];
  const nextCard = deck[(idx + 1) % Math.max(deck.length, 1)];
  const hook = HOOKS[idx % HOOKS.length];

  if (!current || deck.length === 0) {
    return (
      <div>
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <p className="mt-6 text-zinc-400">No girls in the deck yet. Create one first!</p>
      </div>
    );
  }

  const next = () => {
    setSpicyPeek(false);
    setDragX(0);
    setSuperLiked(false);
    setIdx((i) => i + 1);
  };

  const pass = () => {
    setPassed((p) => p + 1);
    next();
  };

  const like = (isSuper = false) => {
    setLiked((L) => [...L, current.id]);
    const reward = isSuper ? 8 : 3;
    addCoins(reward);
    setCoins(getCoins());
    setSuperLiked(isSuper);
    setShowMatch(current);
  };

  const openHer = () => {
    const c = showMatch || current;
    setShowMatch(null);
    onMatch(c);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX((x) => x + e.movementX);
  };
  const onPointerUp = () => {
    setDragging(false);
    if (dragX > 110) like(false);
    else if (dragX < -110) pass();
    else setDragX(0);
  };

  const rot = Math.max(-14, Math.min(14, dragX / 18));
  const opacityLike = Math.min(1, Math.max(0, dragX / 90));
  const opacityNope = Math.min(1, Math.max(0, -dragX / 90));

  return (
    <div className="mx-auto max-w-sm">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-3 hover:text-pink-300">
        ← Home
      </button>
      <div className="flex items-end justify-between mb-1">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
          Discover
        </h2>
        <span className="text-xs text-amber-200">{coins} coins</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Swipe right / ♥ to match · left to pass · {liked.length} likes · {passed} passes
      </p>

      <div className="relative">
        {/* Next card preview for depth */}
        {nextCard && nextCard.id !== current.id && (
          <div className="absolute inset-0 scale-[0.94] translate-y-3 rounded-3xl overflow-hidden border border-white/5 opacity-60 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardImage(nextCard, false)} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div
          className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.25)] touch-none select-none cursor-grab active:cursor-grabbing z-10"
          style={{
            transform: `translateX(${dragX}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 0.22s ease",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImage(current, spicyPeek)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          <div
            className="absolute top-6 left-6 rounded-lg border-4 border-emerald-400 px-3 py-1 text-emerald-300 font-black text-2xl tracking-widest rotate-[-12deg] drop-shadow-lg"
            style={{ opacity: opacityLike }}
          >
            LIKE
          </div>
          <div
            className="absolute top-6 right-6 rounded-lg border-4 border-red-400 px-3 py-1 text-red-300 font-black text-2xl tracking-widest rotate-[12deg] drop-shadow-lg"
            style={{ opacity: opacityNope }}
          >
            NOPE
          </div>
          <div className="absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-wider z-20">
            <span className="rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-pink-200">{hook}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSpicyPeek((s) => !s);
              }}
              className="rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-fuchsia-200 hover:bg-pink-600/50 transition"
            >
              {spicyPeek ? "Cover up" : "Peek 🔥"}
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="text-2xl font-bold text-white">
              {current.name}, {current.age}
            </div>
            <div className="text-pink-300 text-xs uppercase tracking-wide mt-1">{current.category}</div>
            <p className="text-sm text-zinc-200 mt-2 line-clamp-3">{current.tagline}</p>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{current.kink}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {current.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-5 mt-7">
        <button
          type="button"
          onClick={pass}
          className="w-14 h-14 rounded-full bg-zinc-900 border border-white/15 text-xl hover:border-red-400 hover:text-red-400 transition"
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => setSpicyPeek((s) => !s)}
          className="w-11 h-11 rounded-full bg-zinc-900 border border-fuchsia-500/40 text-base text-fuchsia-300 hover:bg-fuchsia-500/20"
          aria-label="Peek lingerie"
        >
          🔥
        </button>
        <button
          type="button"
          onClick={() => like(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg shadow-lg shadow-blue-500/30 hover:scale-105 transition"
          aria-label="Super Like"
          title="Super Like (+8 coins)"
        >
          ★
        </button>
        <button
          type="button"
          onClick={() => like(false)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-2xl shadow-lg shadow-pink-500/40 hover:scale-105 transition"
          aria-label="Like"
        >
          ♥
        </button>
      </div>
      <p className="text-center text-[11px] text-zinc-500 mt-4">
        Drag · ♥ match +3 coins · ★ Super Like +8 · Peek = lingerie frame
      </p>

      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowMatch(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-pink-500/50 bg-gradient-to-b from-zinc-900 to-black p-6 text-center shadow-[0_0_80px_rgba(236,72,153,0.4)]">
            <p className="text-pink-300 text-sm uppercase tracking-[0.25em] font-medium">
              {superLiked ? "Super Match ✨" : "It's a match"}
            </p>
            <div className="mt-5 mx-auto h-32 w-32 rounded-full overflow-hidden border-2 border-pink-400 shadow-lg shadow-pink-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAvatar(showMatch.avatar, showMatch.id, showMatch.figure)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {showMatch.name.split(" ")[0]} liked you back
            </h3>
            <p className="mt-2 text-sm text-zinc-400">{showMatch.voiceIntro}</p>
            <p className="mt-1 text-xs text-pink-300/80">{showMatch.kink}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={openHer}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/30"
              >
                Open chat & generate
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMatch(null);
                  next();
                }}
                className="w-full py-3 rounded-2xl border border-white/15 text-sm text-zinc-300 hover:bg-white/5"
              >
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
