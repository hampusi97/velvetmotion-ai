"use client";

import { BadgeCheck, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl, type MediaMood } from "@/lib/media";

export function CandyGirlCard({
  character,
  onSelect,
  mood = "beauty",
  isNew = false,
}: {
  character: Character;
  onSelect: (character: Character) => void;
  mood?: MediaMood;
  isNew?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(character)}
      aria-label={`Open ${character.name}`}
      className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-left transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10"
    >
      <img
        src={characterMediaUrl(character, mood)}
        alt={character.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition" />
      {isNew && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-pink-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md">
          <Sparkles className="h-2.5 w-2.5" /> NEW
        </span>
      )}
      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Online
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white tracking-tight">{character.name}</span>
          <span className="text-xs text-zinc-300 tabular-nums">{character.age}</span>
          <BadgeCheck className="h-3.5 w-3.5 text-pink-400 shrink-0" />
        </div>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{character.category || character.tagline?.slice(0, 40)}</p>
      </div>
    </button>
  );
}
