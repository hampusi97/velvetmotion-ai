"use client";

import { BadgeCheck, ImageIcon, MessageCircle, Mic, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl, type MediaMood } from "@/lib/media";

/**
 * Candy-style companion card: tall 3:4 portrait, bottom gradient with name/age/verified,
 * category + voice chips, tagline, NEW badge, media icons, and a hover "Chat now" CTA.
 */
export function CandyGirlCard({
  character,
  onSelect,
  mood = "beauty",
  isNew = false,
  ctaLabel = "Chat now",
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
      className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-pink-950/40 to-zinc-950 text-left transition hover:-translate-y-1 focus-visible:outline-pink-400"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={characterMediaUrl(character, mood)}
        alt={character.name}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.06]"
      />

      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow">
        ONLINE
      </span>
      {isNew && (
        <span className="absolute left-2.5 top-9 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-pink-500/40">
          <Sparkles className="h-2.5 w-2.5" /> NEW
        </span>
      )}

      <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
        <span
          title="Photo gallery"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-100 backdrop-blur-md"
        >
          <ImageIcon className="h-3 w-3" />
        </span>
        <span
          title={`Voice: ${character.voice.label}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-pink-500/20 bg-black/55 text-pink-200 backdrop-blur-md"
        >
          <Mic className="h-3 w-3" />
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 girl-card-overlay p-3 pt-12">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white drop-shadow">{character.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-zinc-300">{character.age}</span>
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-pink-400" aria-hidden="true" />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-pink-200/90">
          <span>{character.category}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate text-zinc-300">{character.voice.label}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{character.tagline}</p>

        <span className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 py-1.5 text-[11px] font-semibold text-white opacity-100 shadow-lg shadow-pink-500/30 transition duration-200 [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
          <MessageCircle className="h-3 w-3" />
          {ctaLabel}
        </span>
      </div>
    </button>
  );
}
