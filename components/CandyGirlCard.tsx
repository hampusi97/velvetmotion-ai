"use client";

import { BadgeCheck, Film, Lock, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { SafeImage } from "@/components/SafeImage";

export function CandyGirlCard({
  character,
  onSelect,
  isNew = false,
}: {
  character: Character;
  onSelect: (character: Character) => void;
  mood?: string;
  isNew?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(character)}
      aria-label={`Open ${character.name}`}
      className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1f] text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#ff5678]/60 hover:shadow-[0_12px_28px_rgba(0,0,0,0.55),0_0_20px_rgba(255,86,120,0.2)]"
    >
      <SafeImage
        src={staticPortraitUrl(character.id)}
        alt={character.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.06]"
      />

      {/* Crisp bottom vignette scrim letting photography breathe */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />

      {/* Top-left flush NEW coral-rose ribbon matching candy.ai */}
      {isNew && (
        <span className="absolute left-0 top-0 inline-flex items-center gap-1 rounded-br-xl bg-gradient-to-r from-[#ff4a76] to-[#ff6b8d] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-[#ff4a76]/30">
          <Sparkles className="h-2.5 w-2.5 fill-current" /> NEW
        </span>
      )}

      {/* Top-right compact circular dark translucent icon badges */}
      <div className="absolute right-2 top-2 flex flex-col gap-1.5 items-end">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/55 backdrop-blur-md text-white/90"
          title="Voice & Video Ready"
        >
          <Film className="h-3 w-3" />
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/55 backdrop-blur-md text-white/85"
          title="Private Gallery Set"
        >
          <Lock className="h-2.5 w-2.5" />
        </span>
      </div>

      {/* Bottom Name + Age + Verified Badge */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/95 via-black/55 to-transparent">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold text-white tracking-tight">
            {character.name}
          </span>
          <span className="text-xs font-medium text-zinc-300 tabular-nums shrink-0">
            {character.age}
          </span>
          <BadgeCheck className="h-4 w-4 text-[#ff5678] fill-[#ff5678]/20 shrink-0" />
        </div>
      </div>
    </button>
  );
}
