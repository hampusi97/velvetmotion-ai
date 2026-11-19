"use client";

import { useMemo, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl, joiSequenceFrames, sexSequenceFrames } from "@/lib/media";
import { SHORTS_SERIES, SHORTS_GENRES } from "@/lib/shortsCatalog";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

const kenburns = `@keyframes kenburns { 0% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.12) translate(-2%,-1%); } 100% { transform: scale(1) translate(0,0); } } .animate-kenburns { animation: kenburns 12s ease-in-out infinite; }`;

export function ShortsFeed({
  onHome,
  onChat,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
}) {
  const [genre, setGenre] = useState<string | "All">("All");
  const [seriesIdx, setSeriesIdx] = useState(0);
  const [epIdx, setEpIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pace, setPace] = useState(1);

  const filtered = useMemo(
    () => (genre === "All" ? SHORTS_SERIES : SHORTS_SERIES.filter((s) => s.genre === genre)),
    [genre],
  );
  const series = filtered[seriesIdx % Math.max(1, filtered.length)] || SHORTS_SERIES[0];
  const ep = series.episodes[epIdx % series.episodes.length];

  const character = useMemo(() => {
    const hint = series.characterHint.toLowerCase();
    const found =
      CHARACTERS.find((c) => c.tags.some((t) => t.toLowerCase().includes(hint.split("-")[0]))) ||
      CHARACTERS.find((c) => c.kink.toLowerCase().includes("joi") && series.genre === "JOI") ||
      CHARACTERS[seriesIdx % CHARACTERS.length];
    return found;
  }, [series, seriesIdx]);

  const frames = useMemo(() => {
    if (ep.spicy) return sexSequenceFrames(character);
    return joiSequenceFrames(character);
  }, [character, ep.spicy]);

  const nextEp = () => {
    if (epIdx + 1 < series.episodes.length) setEpIdx(epIdx + 1);
    else {
      setSeriesIdx((s) => s + 1);
      setEpIdx(0);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-16"><style>{kenburns}</style>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <h1 className="font-display text-xl text-cream">Velvet Shorts</h1>
        <span className="text-xs text-zinc-500">{series.genre}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        <button
          type="button"
          onClick={() => {
            setGenre("All");
            setSeriesIdx(0);
            setEpIdx(0);
          }}
          className={`shrink-0 rounded-full px-3 py-1 text-xs border ${
            genre === "All" ? "border-pink-500 bg-pink-500/20 text-pink-100" : "border-white/15 text-zinc-400"
          }`}
        >
          All
        </button>
        {SHORTS_GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGenre(g);
              setSeriesIdx(0);
              setEpIdx(0);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs border ${
              genre === g ? "border-pink-500 bg-pink-500/20 text-pink-100" : "border-white/15 text-zinc-400"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="relative aspect-[9/16] max-h-[70vh] rounded-3xl overflow-hidden border border-pink-500/40 bg-zinc-950 shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        {/* Ken Burns fallback so the stage is never black */}
        <img
          src={characterMediaUrl(character, "beauty")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover animate-kenburns"
          onError={(e) => { (e.target as HTMLImageElement).src = "/portraits/chloe.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        {/* Right-side TikTok-style rail */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <button type="button" onClick={() => setPaused(p => !p)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white text-xs">{paused ? "▶" : "⏸"}</button>
          <button type="button" onClick={() => setPace(p => p === 0.75 ? 1 : p === 1 ? 1.5 : 0.75)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white text-[10px]">{pace}x</button>
          <button type="button" onClick={nextEp} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white text-xs">⏭</button>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
          <div className="flex gap-2 mb-2">
            {ep.spicy && (
              <span className="rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white">SPICY</span>
            )}
            {ep.free ? (
              <span className="rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-bold text-white">FREE</span>
            ) : (
              <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">EP {epIdx + 1}</span>
            )}
          </div>
          <div className="text-xs uppercase tracking-widest text-pink-300">{series.title}</div>
          <div className="text-lg font-semibold text-white mt-1">{ep.title}</div>
          <p className="text-sm text-zinc-300 mt-1">{series.blurb}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onChat(character.id)}
              className="flex-1 rounded-full bg-pink-600 py-2.5 text-sm font-semibold"
            >
              Chat with {character.name.split(" ")[0]}
            </button>
            <button type="button" onClick={nextEp} className="rounded-full border border-white/20 px-4 py-2.5 text-sm">
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {filtered.map((s, i) => {
          const c =
            CHARACTERS.find((x) =>
              x.tags.some((t) => t.toLowerCase().includes(s.characterHint.split("-")[0])),
            ) || CHARACTERS[i % CHARACTERS.length];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSeriesIdx(i);
                setEpIdx(0);
              }}
              className={`shrink-0 w-24 rounded-xl overflow-hidden border text-left ${
                i === seriesIdx % filtered.length ? "border-pink-500" : "border-white/10"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterMediaUrl(c, "beauty")} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="text-[9px] p-1.5 text-zinc-300 leading-tight">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-zinc-500">{s.genre}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
