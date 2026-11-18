"use client";

import { useEffect, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { addCoins, getCoins } from "@/lib/storage";

function cardImage(c: Character, level: "beauty" | "lingerie" | "nude" | "explicit" = "beauty") {
  return characterMediaUrl(c, level);
}

const HOOKS = [
  "She just liked you back",
  "Online now · wants nudes",
  "Wants something explicit",
  "Matched your vibe",
  "Looking for a late session",
  "Tribute energy tonight",
  "Feeling needy · send pic",
  "Will undress if you match",
  "In the mood to edge you",
  "Private content unlocked",
  "Wants sex video tonight",
  "Horny and online",
  "Ready to show everything",
  "Gallery full of nudes",
  "SPH mood · size queen online",
  "BNWO fantasy unlocked",
];

const RACE_KEY = "vm-discover-race";
const MATCHES_KEY = "vm-discover-matches";

type RacePref = "unspecified" | "white" | "black" | "other";

type HistoryEntry = { idx: number; action: "pass" | "like" | "reject"; id: string };

function loadRace(): RacePref {
  if (typeof window === "undefined") return "unspecified";
  try {
    const v = localStorage.getItem(RACE_KEY);
    if (v === "white" || v === "black" || v === "other" || v === "unspecified") return v;
  } catch {
    /* */
  }
  return "unspecified";
}

function loadMatchIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMatchIds(ids: string[]) {
  try {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(ids.slice(0, 40)));
  } catch {
    /* */
  }
}

function matchChance(race: RacePref): number {
  if (race === "black") return 0.8;
  if (race === "white") return 0.3;
  if (race === "other") return 0.55;
  return 1;
}

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
  const [rejected, setRejected] = useState(false);
  const [peekLevel, setPeekLevel] = useState<0 | 1 | 2 | 3>(0);
  const [coins, setCoins] = useState(500);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [superLiked, setSuperLiked] = useState(false);
  const [race, setRace] = useState<RacePref>("unspecified");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    setCoins(getCoins());
    setRace(loadRace());
    setMatchIds(loadMatchIds());
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
    const seen = new Set<string>();
    const unique = base.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    setDeck(shuffle(unique));
    setIdx(0);
    setHistory([]);
  }, [extra, customGirls]);

  const current = deck[idx % Math.max(deck.length, 1)];
  const nextCard = deck[(idx + 1) % Math.max(deck.length, 1)];
  const hook = HOOKS[idx % HOOKS.length];

  const matchedChars = matchIds
    .map((id) => deck.find((c) => c.id === id) || CHARACTERS.find((c) => c.id === id) || customGirls.find((c) => c.id === id))
    .filter(Boolean) as Character[];

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

  const levels = ["beauty", "lingerie", "nude", "explicit"] as const;
  const currentLevel = levels[peekLevel];

  const next = () => {
    setPeekLevel(0);
    setDragX(0);
    setSuperLiked(false);
    setRejected(false);
    setIdx((i) => i + 1);
  };

  const pass = () => {
    setHistory((h) => [...h, { idx, action: "pass", id: current.id }]);
    setPassed((p) => p + 1);
    next();
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setIdx(last.idx);
    setPeekLevel(0);
    setDragX(0);
    setRejected(false);
    setShowMatch(null);
    if (last.action === "pass") setPassed((p) => Math.max(0, p - 1));
    if (last.action === "like" || last.action === "reject") {
      setLiked((L) => L.filter((id) => id !== last.id));
    }
  };

  const setRacePref = (r: RacePref) => {
    setRace(r);
    try {
      localStorage.setItem(RACE_KEY, r);
    } catch {
      /* */
    }
  };

  const like = (isSuper = false) => {
    const chance = isSuper ? 1 : matchChance(race);
    const hits = Math.random() < chance;
    if (!hits) {
      setHistory((h) => [...h, { idx, action: "reject", id: current.id }]);
      setRejected(true);
      setLiked((L) => [...L, current.id]);
      return;
    }
    setHistory((h) => [...h, { idx, action: "like", id: current.id }]);
    setLiked((L) => [...L, current.id]);
    const nextMatches = [current.id, ...matchIds.filter((id) => id !== current.id)];
    setMatchIds(nextMatches);
    saveMatchIds(nextMatches);
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

  const cyclePeek = () => {
    setPeekLevel((p) => ((p + 1) % 4) as 0 | 1 | 2 | 3);
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
      <p className="text-xs text-zinc-500 mb-2">
        Swipe · {liked.length} likes · {passed} passes · {matchIds.length} matches
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="rounded-full px-2.5 py-1 text-[10px] border border-white/15 text-zinc-300 disabled:opacity-30"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          onClick={() => setShowMatches((v) => !v)}
          className={`rounded-full px-2.5 py-1 text-[10px] border ${
            showMatches ? "border-pink-500 bg-pink-500/20 text-pink-200" : "border-white/15 text-zinc-300"
          }`}
        >
          Matches ({matchIds.length})
        </button>
        {(
          [
            ["unspecified", "Always match"],
            ["white", "~30%"],
            ["black", "~80%"],
            ["other", "~55%"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRacePref(id)}
            className={`rounded-full px-2.5 py-1 text-[10px] border ${
              race === id
                ? "border-pink-500 bg-pink-500/20 text-pink-200"
                : "border-white/10 text-zinc-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showMatches && (
        <div className="mb-4 rounded-2xl border border-pink-500/30 bg-zinc-900/80 p-3 space-y-2 max-h-48 overflow-y-auto">
          {matchedChars.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-2">No matches yet — swipe right</p>
          ) : (
            matchedChars.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onMatch(c)}
                className="w-full flex items-center gap-2 rounded-xl hover:bg-white/5 p-1.5 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(c, "beauty")}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover border border-pink-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-cream truncate">{c.name}</div>
                  <div className="text-[10px] text-pink-300 truncate">{c.category}</div>
                </div>
                <span className="text-[10px] text-pink-400">Chat →</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="relative">
        {nextCard && nextCard.id !== current.id && (
          <div className="absolute inset-0 scale-[0.94] translate-y-3 rounded-3xl overflow-hidden border border-white/5 opacity-60 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardImage(nextCard, "beauty")} alt="" className="w-full h-full object-cover" />
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
            src={cardImage(current, currentLevel)}
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
                cyclePeek();
              }}
              className="rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-fuchsia-200 hover:bg-pink-600/50 transition"
            >
              {peekLevel === 0 && "Peek 🔥"}
              {peekLevel === 1 && "Lingerie"}
              {peekLevel === 2 && "Nude 🔥"}
              {peekLevel === 3 && "Explicit"}
            </button>
          </div>
          {peekLevel >= 2 && (
            <div className="absolute top-12 right-3 rounded-full bg-pink-600/90 px-2 py-0.5 text-[10px] font-bold text-white z-20">
              NSFW
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="text-2xl font-bold text-white">
              {current.name}, {current.age}
            </div>
            <div className="text-pink-300 text-xs uppercase tracking-wide mt-1">{current.category}</div>
            <p className="text-sm text-zinc-200 mt-2 line-clamp-3">{current.tagline}</p>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{current.kink}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 mt-7">
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
          onClick={cyclePeek}
          className="w-12 h-12 rounded-full bg-zinc-900 border border-fuchsia-500/40 text-sm text-fuchsia-300 hover:bg-fuchsia-500/20 font-medium"
          aria-label="Undress peek"
        >
          {peekLevel === 0 ? "🔥" : peekLevel === 1 ? "👙" : peekLevel === 2 ? "nude" : "💦"}
        </button>
        <button
          type="button"
          onClick={() => like(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg shadow-lg shadow-blue-500/30 hover:scale-105 transition"
          aria-label="Super Like"
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
        Undo · Matches list · ♥ match · ★ Super · Peek 🔥
      </p>

      {rejected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => {
              setRejected(false);
              next();
            }}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-zinc-950 p-6 text-center">
            <p className="text-zinc-400 text-sm uppercase tracking-widest">She passed</p>
            <h3 className="mt-3 text-xl font-bold text-cream">
              {current.name.split(" ")[0]} isn&apos;t matching right now
            </h3>
            <button
              type="button"
              onClick={() => {
                setRejected(false);
                next();
              }}
              className="mt-5 w-full py-3 rounded-2xl bg-zinc-800 font-medium"
            >
              Keep swiping
            </button>
          </div>
        </div>
      )}

      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowMatch(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-pink-500/50 bg-gradient-to-b from-zinc-900 to-black p-6 text-center shadow-[0_0_80px_rgba(236,72,153,0.4)]">
            <p className="text-pink-300 text-sm uppercase tracking-[0.25em] font-medium">
              {superLiked ? "Super Match ✨" : "It's a match"}
            </p>
            <div className="mt-5 mx-auto h-36 w-36 rounded-full overflow-hidden border-2 border-pink-400 shadow-lg shadow-pink-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterMediaUrl(showMatch, "nude")}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {showMatch.name.split(" ")[0]} liked you back
            </h3>
            <p className="mt-2 text-sm text-zinc-400">{showMatch.voiceIntro}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={openHer}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/30"
              >
                Open chat · nudes · JOI / SPH
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
