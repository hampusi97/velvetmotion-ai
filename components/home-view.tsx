"use client";

import { motion, useReducedMotion } from "framer-motion";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";

export function HomeView({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      data-motion
      variants={riseContainer}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.section variants={riseItem} className="pb-12 pt-10 md:pb-16 md:pt-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-200">
          Fictional adults · 21+
        </p>
        <h1 className="mt-4 max-w-[12ch] font-display text-[clamp(3.1rem,8vw,6.25rem)] leading-[0.9] tracking-[-0.04em] text-cream">
          Velvet
          <span className="block text-rose-200">Motion</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
          Chat, nudes, and cinematic scenes with original companions. Free AI included — no key required.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate("girls")}
            className="press inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-base font-medium text-white hover:bg-rose-500"
          >
            Meet the girls
          </button>
          <button
            type="button"
            onClick={() => onNavigate("packs")}
            className="press inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-base font-medium text-cream hover:bg-white/10"
          >
            Story packs
          </button>
        </div>
        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
          {[
            { t: "Live chat", d: "Free LLM + character voice" },
            { t: "Nudes", d: "Portrait to explicit" },
            { t: "Video mode", d: "Cinematic sequences" },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="text-sm font-medium text-cream">{item.t}</div>
              <div className="mt-0.5 text-xs text-mist">{item.d}</div>
            </div>
          ))}
        </div>
      </motion.section>

      <section aria-labelledby="sections-heading" className="pb-4">
        <motion.div variants={riseItem} className="mb-5 md:mb-6">
          <h2 id="sections-heading" className="font-display text-3xl tracking-[-0.03em] text-cream md:text-4xl">
            Explore
          </h2>
          <p className="mt-2 text-base text-mist">Roster, stories, JOI, and more.</p>
        </motion.div>
        <motion.ul
          variants={riseContainer}
          className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
        >
          {sections.map((section) => (
            <motion.li key={section.id} variants={riseItem} className="min-w-0">
              <FeatureCard section={section} onOpen={onNavigate} />
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </motion.div>
  );
}
