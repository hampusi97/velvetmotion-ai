"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Search, Sparkles } from "lucide-react";
import { filterCharacters, type Character } from "@/lib/characters";
import { CandyGirlCard } from "@/components/CandyGirlCard";

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<"featured" | "name">("featured");
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vm:favorite-companions") || "[]") as unknown;
      setFavorites(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
    } catch { setFavorites([]); }
  }, []);

  const visible = useMemo(() => {
    let list = filterCharacters({ query, category, tag: tag || undefined });
    if (savedOnly) list = list.filter((c) => favorites.includes(c.id));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [query, category, tag, savedOnly, favorites, sort]);

  const toggleFavorite = (character: Character) => {
    setFavorites((old) => {
      const next = old.includes(character.id)
        ? old.filter((id) => id !== character.id)
        : [...old, character.id];
      try { localStorage.setItem("vm:favorite-companions", JSON.stringify(next)); } catch { /* storage optional */ }
      return next;
    });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-16 text-white">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-[#edb5c3] hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Return to the Atelier
      </button>

      <header className="rounded-[27px] border border-[#e8b8c3]/15 bg-gradient-to-r from-[#301c2c]/80 to-[#15111c] px-5 py-7 sm:px-8 sm:py-9">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#e6b8c5]">
          <Sparkles className="h-3.5 w-3.5" /> VelvetMotion / Discover
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {romanceMode ? "Find a new connection." : "Meet your next muse."}
        </h1>
        <p className="mt-2 max-w-xl text-xs leading-6 text-[#cabbc8]">
          Discover distinct fictional adult characters, explore their personalities, and create a story on your terms.
          Voice previews and media generation depend on a compatible connected model.
        </p>
      </header>

      <section aria-label="Filter companions" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[190px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input type="search" aria-label="Search companions" value={query}
              onChange={(e) => onQuery(e.target.value)} placeholder="Search by name, mood or personality"
              className="w-full rounded-[16px] border border-white/10 bg-[#241b27] py-3 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-zinc-400 focus:border-[#e7afbd]/70" />
          </div>
          <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((old) => !old)}
            className={"inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 text-xs font-semibold transition " +
              (savedOnly ? "border-[#edacbf]/70 bg-[#a14b70]/20 text-[#ffdfec]" : "border-white/10 bg-[#241b27] text-zinc-300 hover:border-white/30")}>
            <Heart className="h-3.5 w-3.5" /> Saved ({favorites.length})
          </button>
          <select aria-label="Sort companions" value={sort} onChange={(e) => setSort(e.target.value as "featured" | "name")}
            className="rounded-[16px] border border-white/10 bg-[#241b27] px-4 py-3 text-xs text-zinc-200">
            <option value="featured">Featured order</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="group" aria-label="Category">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => onCategory(item)}
              className={"shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold transition " +
                (category === item ? "border-[#e2a9b7]/70 bg-[#a35c78]/25 text-[#ffe1ec]" : "border-white/10 bg-[#211922] text-zinc-300 hover:border-white/25")}>
              {item}
            </button>
          ))}
        </div>
        <button type="button" aria-expanded={showTags} onClick={() => setShowTags((v) => !v)}
          className="text-[11px] font-semibold text-[#e4b6c1] hover:text-white">
          {showTags ? "Hide mood filters −" : tag ? "Mood filter: " + tag + " · Edit" : "More mood filters +"}
        </button>
        {showTags && (
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-[#17121b] p-3">
            <button type="button" onClick={() => onTag(null)}
              className={"rounded-full border px-3 py-1.5 text-[10px] " + (!tag ? "border-pink-300 bg-pink-300/10 text-white" : "border-white/10 text-zinc-300")}>Any mood</button>
            {tags.map((item) => (
              <button key={item} type="button" onClick={() => onTag(tag === item ? null : item)}
                className={"rounded-full border px-3 py-1.5 text-[10px] " + (tag === item ? "border-pink-300 bg-pink-300/10 text-white" : "border-white/10 text-zinc-300")}>{item}</button>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#d6c0cb]">{visible.length} fictional adult companions</p>
        <span className="text-[10px] uppercase tracking-[.17em] text-zinc-500">Private Atelier</span>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {visible.map((character) => (
            <CandyGirlCard key={character.id} character={character} onSelect={onSelect}
              isNew={(character.tags || []).some((t) => t.toUpperCase() === "NEW")}
              isFavorite={favorites.includes(character.id)}
              onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/10 bg-[#1a1520] p-10 text-center text-sm text-zinc-400">
          No companions match these filters. Try another category, or turn off Saved.
        </div>
      )}
    </main>
  );
}
