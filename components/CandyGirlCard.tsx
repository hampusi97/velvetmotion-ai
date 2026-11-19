"use client";

import { BadgeCheck, ImageIcon, MessageCircle, Mic, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl, type MediaMood } from "@/lib/media";

export function CandyGirlCard({
  character,
  onSelect,
  mood = "beauty",
  isNew = false,
  ctaLabel = "Chat",
}: {
  character: Character;
  onSelect: (character: Character) => void;
  mood?: MediaMood;
  isNew?: boolean;
  ctaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(character)}
      aria-label={`Open ${character.name}`}
      className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-left transition hover:-translate-y-0.5"
    >
      <img
        src={characterMediaUrl(character, mood)}
        alt={character.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
      />
      {isNew && (
        <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-pink-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
          <Sparkles className="h-2 w-2" /> NEW
        </span>
      )}
      <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
        Online
      </span>
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
}
