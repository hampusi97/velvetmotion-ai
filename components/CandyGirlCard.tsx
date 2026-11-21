"use client";

import { ArrowUpRight, Heart, MessageCircle, Mic2, Play, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { safeCompanionAvatarUrl } from "@/lib/avatarOptimize";
import { LivePortraitVideo } from "@/components/LivePortraitVideo";

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
        <LivePortraitVideo
          src={safeCompanionAvatarUrl(character.avatar) || staticPortraitUrl(character.id)}
          companionId={character.id}
          alt={"Portrait of " + character.name}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0811]/95 via-[#0e0811]/30 to-[#0e0811]/15" />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff2a7a]/95 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-[0_0_12px_rgba(255,42,122,0.75)]">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f1bdc9]/30 bg-[#4d2035]/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[.13em] text-[#ffdae5] backdrop-blur-md">
              <Sparkles className="h-2.5 w-2.5" /> New
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-extrabold tracking-tight text-white sm:text-lg">
              {character.name}
              <span className="ml-1.5 align-middle font-sans text-sm font-extrabold text-[#ff3b8b]">{character.age}</span>
            </h3>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff2a7a] text-white shadow-[0_0_12px_rgba(255,42,122,0.75)]">
              <Play className="h-3 w-3 fill-white text-white ml-0.5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#dad0d8] opacity-90 sm:text-[11px]">{character.tagline}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-white/75">
            <div className="flex items-center gap-2.5">
              {hasVoicePreset && (
                <span className="inline-flex items-center gap-1 text-[#edc4cf]">
                  <Mic2 className="h-3 w-3" aria-hidden="true" /> Voice
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" aria-hidden="true" /> Live
              </span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#f0c8d1] opacity-75 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
          </div>
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
