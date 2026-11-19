"use client";

import { useMemo } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { filterCharacters, type Character } from "@/lib/characters";
import { staticPortraitUrl, onPortraitError } from "@/lib/portraitFallback";

interface CharacterRosterProps {
  romanceMode: boolean;
  query: string;
  category: string;
  tag: string | null;
  categories: string[];
  tags: string[];
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
  onTag: (value: string | null) => void;
  onSelect: (character: Character) => void;
  onBack: () => void;
}

export function CharacterRoster({
  romanceMode, query, category, tag, categories, tags, onQuery, onCategory, onTag, onSelect, onBack,
}: CharacterRosterProps) {
  const visible = useMemo(() => filterCharacters({ query, category, tag: tag ?? undefined }), [query, category, tag]);

  return (
    <div>
      <button onClick={onBack} className="text-pink-400 text-sm hover:text-pink-300">← Home</button>
      <div className="mt-3 mb-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
          {romanceMode ? "Romance" : "Explore Featured Characters"}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">{visible.length} companions · 21+ fictional · custom voices, memory chat & galleries</p>
      </div>

      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search companions…" className="w-full mb-3 px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-sm outline-none focus:border-pink-500" />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item) => (
          <button key={item} onClick={() => onCategory(item)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
            category === item ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 border-transparent text-white" : "bg-zinc-900/80 border-white/10 text-zinc-300"
          }`}>{item}</button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <button onClick={() => onTag(null)} className={`shrink-0 px-3 py-1 rounded-full text-xs border ${tag === null ? "border-pink-400 text-pink-300" : "border-zinc-800 text-zinc-400"}`}>Any</button>
        {tags.map((item) => (
          <button key={item} onClick={() => onTag(tag === item ? null : item)} className={`shrink-0 px-3 py-1 rounded-full text-xs border ${tag === item ? "bg-pink-500/20 border-pink-400 text-pink-200" : "border-zinc-800 text-zinc-400"}`}>{item}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">No matches. Try another filter or clear search.</div>
      ) : (
        <div className="grid grid-rows-2 grid-flow-col auto-cols-[31%] sm:auto-cols-[22%] md:auto-cols-[18%] lg:auto-cols-[15%] gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
          {visible.map((character, i) => (
            <button key={character.id} onClick={() => onSelect(character)} className="girl-card group relative aspect-[3/4.6] w-full snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-left">
              <img
                src={staticPortraitUrl(character.id)}
                alt={character.name}
                loading="lazy"
                onError={onPortraitError}
                className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-[1.04] transition duration-500"
              />
              {i < 4 && <span className="absolute top-0 left-0 inline-flex items-center gap-0.5 rounded-tl-2xl rounded-br-xl bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">✦ NEW</span>}
              <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-[10px] text-white">▶</span>
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-semibold text-white">{character.name.split(" ")[0]}</span>
                  <span className="text-[11px] text-zinc-400">{character.age}</span>
                  <BadgeCheck className="h-3 w-3 text-pink-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSelect(visible[0])} className="rounded-2xl border-2 border-fuchsia-500/80 bg-gradient-to-br from-fuchsia-950 to-zinc-950 p-3 text-left shadow-[0_0_20px_rgba(217,70,239,0.25)]">
          <div className="text-lg font-bold text-fuchsia-300">SHORTS</div>
          <div className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-center text-xs font-semibold text-white py-1.5">Watch</div>
        </button>
        <button type="button" onClick={() => onSelect(visible[1] || visible[0])} className="rounded-2xl border-2 border-pink-500/80 bg-gradient-to-br from-pink-950 to-zinc-950 p-3 text-left shadow-[0_0_20px_rgba(236,72,153,0.25)]">
          <div className="text-lg font-bold text-pink-300 italic">Private Content</div>
          <div className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-center text-xs font-semibold text-white py-1.5">Unlock</div>
        </button>
      </div>
    </div>
  );
}
