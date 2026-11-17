"use client";

import { useMemo } from "react";
import { filterCharacters, type Character } from "@/lib/characters";
import { resolveAvatar } from "@/lib/portraits";

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
  romanceMode,
  query,
  category,
  tag,
  categories,
  tags,
  onQuery,
  onCategory,
  onTag,
  onSelect,
  onBack,
}: CharacterRosterProps) {
  const visible = useMemo(
    () => filterCharacters({ query, category, tag: tag ?? undefined }),
    [query, category, tag],
  );

  return (
    <div>
      <button onClick={onBack} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>
      <div className="mt-3 mb-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
          {romanceMode ? "Romance" : "AI Girlfriends"}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {romanceMode
            ? "Affection first. Same cast — warmth before the heat."
            : "Original fictional women, 21+. High-quality portraits · chat · nudes · video."}
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search name, vibe, kink…"
        className="w-full mb-3 px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40"
        aria-label="Search companions"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2" aria-label="Categories">
        {categories.map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              onClick={() => onCategory(item)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
                active
                  ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 border-transparent text-white shadow-lg shadow-pink-500/20"
                  : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:border-pink-500/40"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4" aria-label="Tags">
        <button
          onClick={() => onTag(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
            tag === null ? "border-pink-400 text-pink-300" : "border-zinc-800 text-zinc-400"
          }`}
        >
          Any tag
        </button>
        {tags.map((item) => {
          const active = tag === item;
          return (
            <button
              key={item}
              onClick={() => onTag(active ? null : item)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
                active ? "bg-pink-500/20 border-pink-400 text-pink-200" : "border-zinc-800 text-zinc-400"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-zinc-500 text-sm">No one matches that filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visible.map((character) => {
            const src = resolveAvatar(character.avatar, character.id, character.figure);
            return (
              <button
                key={character.id}
                onClick={() => onSelect(character)}
                className="group text-left rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden transition hover:border-pink-500/60 hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] bg-gradient-to-b from-pink-950/40 to-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-semibold text-sm text-white truncate">{character.name}</span>
                      <span className="text-xs text-pink-300 shrink-0">{character.age}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-fuchsia-300/90 mt-0.5">
                      {character.category}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 p-3 line-clamp-2 leading-relaxed">{character.tagline}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
