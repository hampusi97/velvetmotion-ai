"use client";

import { useMemo } from "react";
import { BadgeCheck, ImageIcon, Mic, Sparkles } from "lucide-react";
import { filterCharacters, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { getPinned, togglePin } from "@/lib/storage";
import { useState } from "react";

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
          {visible.length} companions · 21+ fictional · custom voices, memory chat &amp; galleries
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search name, vibe, kink…"
        className="w-full mb-3 px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
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

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
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
          {visible.map((character, i) => {
            const src = characterMediaUrl(character, "beauty");
            const isNew = i < 6;
            return (
              <button
                key={character.id}
                onClick={() => onSelect(character)}
                className="girl-card group text-left overflow-hidden transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-[3/4] bg-gradient-to-b from-pink-950/40 to-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={character.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top group-hover:scale-[1.06] transition duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow">ONLINE</span>
                  {isNew && (
                    <div className="absolute top-2.5 left-2.5 rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow">
                      <Sparkles className="h-2.5 w-2.5" />
                      NEW
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span
                      title="Photo gallery"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-zinc-100 backdrop-blur-sm"
                    >
                      <ImageIcon className="h-3 w-3" />
                    </span>
                    <span
                      title={`Voice: ${character.voice.label}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-pink-200 backdrop-blur-sm"
                    >
                      <Mic className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 girl-card-overlay">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white truncate">{character.name}</span>
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Online" />
                      <span className="text-xs text-zinc-300 shrink-0 tabular-nums">{character.age}</span>
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-pink-400" aria-hidden="true" />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-pink-200/90">
                      <span>{character.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-300 truncate">{character.voice.label}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{character.tagline}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
