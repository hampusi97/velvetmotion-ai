"use client";

import { getFeaturedPair } from "@/lib/featured";
import { CHARACTERS } from "@/lib/characters";
import { resolveCharacterAvatar } from "@/lib/media";

export function FeaturedPair({
  onOpen,
  onOpenDual,
}: {
  onOpen: (id: string) => void;
  onOpenDual?: (aId: string, bId: string) => void;
}) {
  const pair = getFeaturedPair();
  const a = CHARACTERS.find((c) => c.id === pair.aId);
  const b = CHARACTERS.find((c) => c.id === pair.bId);
  if (!a || !b) return null;

  return (
    <section className="mb-8 rounded-3xl border border-pink-500/30 bg-gradient-to-r from-pink-950/40 to-fuchsia-950/30 p-4 sm:p-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex -space-x-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveCharacterAvatar(a)}
            alt={a.name}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full border-2 border-pink-400 object-cover object-top"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveCharacterAvatar(b)}
            alt={b.name}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full border-2 border-fuchsia-400 object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-pink-300">This week</p>
          <h3 className="text-lg font-semibold text-cream">{pair.label}</h3>
          <p className="text-xs text-mist">Dual-girl gens {pair.dualDiscount}% off when you pick both in chat.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenDual && (
            <button
              type="button"
              onClick={() => onOpenDual(a.id, b.id)}
              className="rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/25"
            >
              Dual Chat ({pair.aName} + {pair.bName})
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpen(a.id)}
            className="rounded-full border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-sm font-medium text-pink-100"
          >
            {pair.aName}
          </button>
          <button
            type="button"
            onClick={() => onOpen(b.id)}
            className="rounded-full border border-white/20 px-3.5 py-2 text-sm"
          >
            {pair.bName}
          </button>
        </div>
      </div>
    </section>
  );
}
