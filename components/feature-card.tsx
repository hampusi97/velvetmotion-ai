"use client";

import type { Section } from "@/lib/sections";
import { ArrowIcon } from "./icons";

export function FeatureCard({
  section,
  onOpen,
}: {
  section: Section;
  onOpen: (id: Section["id"]) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(section.id)}
      className="feature-card press group flex h-full w-full flex-col rounded-3xl border border-white/10 bg-ink-800 text-left shadow-card"
    >
      <span className={`relative block aspect-[4/3] overflow-hidden rounded-t-3xl ${section.art}`}>
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-800/55 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-rose-100">
            {section.kicker}
          </span>
          <span className="block font-display text-2xl leading-tight text-cream text-balance">
            {section.title}
          </span>
        </span>
      </span>
      <span className="flex flex-1 flex-col px-5 pb-4 pt-4">
        <span className="text-base leading-relaxed text-mist">{section.summary}</span>
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-base font-medium text-rose-200">
          Open
          <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
        </span>
      </span>
    </button>
  );
}
