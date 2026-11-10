"use client";

import { motion, useReducedMotion } from "framer-motion";
import { riseItem } from "@/lib/motion";
import type { Section } from "@/lib/sections";
import { ArrowIcon } from "./icons";

export function SectionView({
  section,
  onHome,
}: {
  section: Section;
  onHome: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      data-motion
      variants={riseItem}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="pb-8 pt-6 md:pt-10"
    >
      <div>
        <button
          type="button"
          onClick={onHome}
          className="press mb-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-base font-medium text-cream"
        >
          <ArrowIcon className="h-4 w-4 rotate-180" />
          Home
        </button>
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-card">
          <div className={`relative aspect-[16/10] sm:aspect-[16/7] ${section.art}`}>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/10"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 md:p-10">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-rose-100">
                {section.kicker}
              </p>
              <h1 className="mt-2 max-w-[14ch] font-display text-4xl leading-[0.95] tracking-[-0.03em] text-cream sm:text-5xl md:text-6xl">
                {section.title}
              </h1>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-ink-800 p-5 shadow-card sm:p-6 md:p-8">
          <p className="max-w-2xl text-lg leading-relaxed text-cream">{section.summary}</p>
          <p className="mt-4 text-base leading-relaxed text-mist">
            This section is not connected.
          </p>
        </div>
      </div>
    </motion.article>
  );
}
