"use client";

import { useMemo, useState } from "react";
import { Heart, MessageCircle, Pause, Play, Volume2 } from "lucide-react";
import { CHARACTERS } from "@/lib/characters";
import { SHORTS_GENRES, SHORTS_SERIES } from "@/lib/shortsCatalog";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { speakWithNeuralVoice } from "@/lib/kokoroTts";

const kenburns = `@keyframes kenburns { 0% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.1) translate(-1.5%,-1%); } 100% { transform: scale(1) translate(0,0); } } .animate-kenburns { animation: kenburns 11s ease-in-out infinite; }`;

export function ShortsFeed({
  onHome,
  onChat,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
}) {
  const [genre, setGenre] = useState<string>("All");
  const [paused, setPaused] = useState(false);
  const [pace, setPace] = useState<1 | 1.5>(1);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    const filtered = genre === "All" ? SHORTS_SERIES : SHORTS_SERIES.filter((s) => s.genre === genre);
    return filtered.map((series, idx) => {
      const hint = series.characterHint.toLowerCase();
      const character =
        CHARACTERS.find((c) => c.tags.some((t) => t.toLowerCase().includes(hint.split("-")[0]))) ||
        CHARACTERS[idx % CHARACTERS.length];
      const ep = series.episodes[0];
      return { series, ep, character, portrait: staticPortraitUrl(character.id) };
    });
  }, [genre]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-md space-y-3 pb-20">
      <style>{kenburns}</style>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onHome} className="text-xs text-[#00f5ff] hover:underline">
          ← Home
        </button>
        <h1 className="font-display text-xl font-extrabold text-[#f7f7fc] neon-text-glow">Velvet Shorts 2.0</h1>
        <span className="rounded-full border border-[#ff1e8e]/35 bg-[#ff1e8e]/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-200">
          {items.length} clips
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {["All", ...SHORTS_GENRES].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition ${
              genre === g ? "chip-active" : "border-white/15 text-[#a6a6c4] hover:border-[#ff1e8e]/50"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Full-height CSS snap-y snap-mandatory vertical feed */}
      <div className="h-[76dvh] snap-y snap-mandatory overflow-y-auto no-scrollbar space-y-4 rounded-3xl">
        {items.map(({ series, ep, character, portrait }, idx) => {
          const liked = Boolean(likedIds[series.id]);
          const animDur = pace === 1.5 ? "7s" : "11s";
          return (
            <section
              key={series.id}
              className="relative h-[74dvh] snap-start snap-always rounded-3xl overflow-hidden neon-border-sweep"
            >
              <div className="neon-sweep-inner relative h-full w-full overflow-hidden bg-[#05050a]">
                <img
                  src={portrait}
                  alt={character.name}
                  loading={idx <= 1 ? "eager" : "lazy"}
                  style={{
                    animationDuration: animDur,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  className="absolute inset-0 h-full w-full object-cover object-top animate-kenburns"
                />
                {/* Preload next clip portrait */}
                {items[idx + 1] && <link rel="preload" as="image" href={items[idx + 1].portrait} />}

                <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-black/25 to-black/30" />

                {/* Neon Glass Right-Side Action Rail */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
                  <button
                    type="button"
                    aria-label="Like Short"
                    onClick={() => toggleLike(series.id)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full neon-glass transition ${
                      liked ? "text-[#ff1e8e] border-[#ff1e8e]" : "text-white"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                  </button>
                  <button
                    type="button"
                    aria-label="Chat in Scene"
                    onClick={() => onChat(character.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full neon-glass text-[#00f5ff]"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Play Audio"
                    onClick={() => void speakWithNeuralVoice(`${ep.title}. ${series.blurb}`, { voiceId: character.voiceId })}
                    className="flex h-11 w-11 items-center justify-center rounded-full neon-glass text-pink-200"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPace((p) => (p === 1 ? 1.5 : 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full neon-glass text-[11px] font-bold text-[#00f5ff]"
                  >
                    {pace}x
                  </button>
                  <button
                    type="button"
                    aria-label={paused ? "Play" : "Pause"}
                    onClick={() => setPaused((p) => !p)}
                    className="flex h-11 w-11 items-center justify-center rounded-full neon-glass text-white"
                  >
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-[#05050a] via-black/80 to-transparent z-10 pr-16">
                  <div className="flex items-center gap-2 mb-1.5">
                    {ep.spicy && (
                      <span className="rounded-full bg-[#ff1e8e] px-2 py-0.5 text-[10px] font-bold text-white">18+ SPICY</span>
                    )}
                    <span className="rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/15 px-2 py-0.5 text-[10px] font-bold text-[#00f5ff]">
                      {series.genre}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-pink-300">{character.name} · {series.title}</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{ep.title}</div>
                  <p className="text-xs text-[#a6a6c4] mt-1 line-clamp-2">{series.blurb}</p>
                  <button
                    type="button"
                    onClick={() => onChat(character.id)}
                    className="mt-3 w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white"
                  >
                    💬 Chat in Scene with {character.name.split(" ")[0]}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
