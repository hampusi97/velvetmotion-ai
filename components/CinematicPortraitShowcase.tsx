"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Film, Pause, Play, Sparkles } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { staticPortraitUrl } from "@/lib/portraitFallback";

export type PortraitSpotlight = {
  id: string;
  name: string;
  tagline: string;
  category: string;
};

export function CinematicPortraitShowcase({
  companions,
  onOpenCompanion,
}: {
  companions: PortraitSpotlight[];
  onOpenCompanion: (id: string) => void;
}) {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const selected = companions.slice(0, 3);

  if (!selected.length) return null;

  return (
    <section aria-labelledby="vm-living-portraits" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e8b9ba]">
            VelvetMotion / Living portraits
          </p>
          <h2 id="vm-living-portraits" className="mt-1 font-display text-xl font-bold tracking-tight text-[#fff6ef] sm:text-2xl">
            A little spark of cinema.
          </h2>
          <p className="mt-1 text-xs text-zinc-400">Interactive portrait previews. Actual generated video lives in Media Studio.</p>
        </div>
        <button
          type="button"
          aria-pressed={!motionEnabled}
          onClick={() => setMotionEnabled((s) => !s)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-zinc-200 hover:border-[#e8b9ba]/40"
        >
          {motionEnabled ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
          {motionEnabled ? "Pause motion" : "Resume motion"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {selected.map((companion, index) => (
          <button
            key={companion.id}
            type="button"
            onClick={() => onOpenCompanion(companion.id)}
            onPointerMove={(event) => {
              const r = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty("--vm-pointer-x", `${((event.clientX - r.left) / r.width) * 100}%`);
              event.currentTarget.style.setProperty("--vm-pointer-y", `${((event.clientY - r.top) / r.height) * 100}%`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.setProperty("--vm-pointer-x", "50%");
              event.currentTarget.style.setProperty("--vm-pointer-y", "50%");
            }}
            style={{ "--vm-motion-delay": `${index * -2.8}s` } as React.CSSProperties}
            className="vm-portrait-card group relative min-h-64 overflow-hidden rounded-[28px] border border-white/10 bg-[#19121b] text-left shadow-[0_16px_42px_rgba(0,0,0,.22)] transition duration-300 hover:-translate-y-1 hover:border-[#e9aeb7]/50 hover:shadow-[0_20px_54px_rgba(110,34,64,.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9aeb7] sm:min-h-[390px]"
          >
            <div className="absolute inset-0 overflow-hidden">
              <div data-playing={motionEnabled ? "true" : "false"} className="vm-portrait-photo absolute inset-0">
                <SafeImage src={staticPortraitUrl(companion.id)} alt={`Portrait of fictional companion ${companion.name}`} className="h-full w-full object-cover object-top" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0710] via-[#17101e]/20 to-black/20" aria-hidden="true" />
              <div className="vm-portrait-light pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
            </div>

            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0c0911]/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#fff2eb] backdrop-blur-xl">
              <Sparkles className="h-3 w-3 text-[#f2bcc6]" aria-hidden="true" />
              Fictional companion
            </span>
            <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-[#0c0911]/60 px-2.5 py-1 text-[10px] text-zinc-200 backdrop-blur-lg">
              Motion preview
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.22em] text-[#efc8c2]">{companion.category}</p>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-bold text-white">{companion.name}</h3>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#efc8c2]/40 bg-white/10 text-white transition group-hover:bg-[#ba547e]">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">{companion.tagline}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-[#d5a2a9]/15 bg-gradient-to-r from-[#271825]/80 to-[#111016]/80 px-4 py-3">
        <p className="text-xs text-zinc-300">
          Want real motion? Turn a permitted source image into a clip using your connected video model.
        </p>
        <Link href="/studio/" className="inline-flex items-center gap-1.5 rounded-full border border-[#e8a0b2]/30 bg-[#bd567d]/20 px-4 py-2 text-xs font-bold text-pink-100 hover:bg-[#bd567d]/30">
          <Film className="h-3.5 w-3.5" aria-hidden="true" /> Open Studio <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
