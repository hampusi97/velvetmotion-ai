"use client";

import { useMemo } from "react";
import Image from "next/image";
import { filterCharacters, type Character } from "@/lib/characters";

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
      <button onClick={onBack} className="text-pink-400 text-sm">
        ← Home
      </button>
      <div className="mt-3 mb-4">
        <h2 className="text-xl font-semibold text-pink-400">
          {romanceMode ? "Romance" : "Fictional Girls"}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {romanceMode
            ? "Genuine interest first. Same eight women — affection before the scene."
            : "Eight original women. Every one is a fictional adult, age 21 or older."}
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search name, vibe, or interest"
        className="w-full mb-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:border-pink-500"
        aria-label="Search companions"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2" aria-label="Categories">
        {categories.map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              onClick={() => onCategory(item)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
                active
                  ? "bg-pink-500 border-pink-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-3" aria-label="Tags">
        <button
          onClick={() => onTag(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
            tag === null
              ? "border-pink-400 text-pink-300"
              : "border-zinc-800 text-zinc-400"
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
                active
                  ? "bg-pink-500/20 border-pink-400 text-pink-200"
                  : "border-zinc-800 text-zinc-400"
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
        <div className="grid grid-cols-2 gap-3">
          {visible.map((character) => (
            <button
              key={character.id}
              onClick={() => onSelect(character)}
              className="text-left p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-pink-500"
            >
              <Image
                src={character.avatar}
                alt=""
                width={160}
                height={200}
                unoptimized
                className="w-full h-28 object-cover rounded-lg mb-2 bg-zinc-800"
              />
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{character.name}</span>
                <span className="text-xs text-pink-300">{character.age}</span>
              </div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-500 mt-1">
                {character.category}
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-3">{character.tagline}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
