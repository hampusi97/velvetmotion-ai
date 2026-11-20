"use client";

import { ArrowUpRight, Heart, Mic2, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { safeCompanionAvatarUrl } from "@/lib/avatarOptimize";
import { SafeImage } from "@/components/SafeImage";

/** Premium discover card with honest feature labels and independently interactive favorites. */
export function CandyGirlCard({
  character,
  onSelect,
  isNew = false,
  isFavorite = false,
  onToggleFavorite,
}: {
  character: Character;
  onSelect: (character: Character) => void;
  isNew?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (character: Character) => void;
}) {
  const hasVoicePreset = Boolean(character.voiceId);
  return (
    <article className="girl-card group relative aspect-[3/4] overflow-hidden rounded-[23px] border border-white/10 bg-[#1e1620] text-left shadow-[0_10px_35px_rgba(0,0,0,.20)] transition duration-300 hover:-translate-y-1 hover:border-[#e8b4be]/45 hover:shadow-[0_22px_60px_rgba(55,19,37,.38)]">
      <button type="button" onClick={() => onSelect(character)}
        aria-label={"Meet " + character.name + ", fictional companion"}
        className="absolute inset-0 z-10 block h-full w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0b6c7]">
        <SafeImage
          src={safeCompanionAvatarUrl(character.avatar) || staticPortraitUrl(character.id)}
          alt={"Portrait of " + character.name}
          loading="lazy"
          className="h-full w-full object-cover object-top transition duration-700 ease-out group-hover:scale-[1.09] motion-reduce:transform-none"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0811]/95 via-[#0e0811]/10 to-[#0e0811]/20" />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f1bdc9]/30 bg-[#4d2035]/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#ffdae5] backdrop-blur-md">
              <Sparkles className="h-2.5 w-2.5" /> New
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#ebadba]">{character.category}</span>
          <div className="mt-1 flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {character.name}
              <span className="ml-1.5 align-middle font-sans text-[11px] font-normal text-zinc-300">{character.age}</span>
            </h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-[#f0c8d1] opacity-65 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#dad0d8] opacity-90 sm:text-[11px]">{character.tagline}</p>
          {hasVoicePreset && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-[#edc4cf]">
              <Mic2 className="h-3 w-3" aria-hidden="true" /> Voice preset
            </span>
          )}
        </div>
      </button>
      {onToggleFavorite && (
        <button type="button" onClick={() => onToggleFavorite(character)}
          aria-label={(isFavorite ? "Remove " : "Save ") + character.name + (isFavorite ? " from favorites" : " to favorites")}
          aria-pressed={isFavorite}
          className={"absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200 " +
            (isFavorite ? "border-[#f8b4c6]/65 bg-[#b55276]/75 text-white" : "border-white/20 bg-black/45 text-white/80 hover:bg-[#7d415c]/75")}>
          <Heart className={"h-4 w-4 " + (isFavorite ? "fill-current" : "")} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
