"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { filterCharacters, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { getCachedPortrait, setCachedPortrait } from "@/lib/portraitCache";

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
        <p className="text-zinc-500 text-sm">No one matches that filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {visible.map((character, i) => {
            const src = getCachedPortrait(character.id) || characterMediaUrl(character, "beauty");
            return (
              <button key={character.id} onClick={() => onSelect(character)} className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-left">
                <img
                  src={src}
                  alt={character.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-[1.04] transition duration-500"
                  onLoad={() => setCachedPortrait(character.id, src)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {i < 4 && <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 rounded-full bg-pink-600 px-1.5 py-0.5 text-[9px] font-bold text-white"><Sparkles className="h-2 w-2" />NEW</span>}
                <span className="absolute top-2 right-2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">Online</span>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/55 to-transparent">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-semibold text-white">{character.name}</span>
                    <span className="text-[10px] text-zinc-400">{character.age}</span>
                    <BadgeCheck className="h-3 w-3 text-pink-400" />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[9px] text-zinc-400">{character.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
