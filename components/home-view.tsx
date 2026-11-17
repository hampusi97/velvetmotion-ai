"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import { getEdgeStreak } from "@/lib/streaks";

export function HomeView({
  onNavigate,
  onOpenGirl,
}: {
  onNavigate: (id: SectionId) => void;
  onOpenGirl?: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [coins, setCoins] = useState(500);
  const [canClaim, setCanClaim] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setCoins(getCoins());
    setCanClaim(canClaimDaily());
    setStreak(getEdgeStreak());
  }, []);

  const onClaim = () => {
    const n = claimDaily();
    if (n > 0) {
      setCoins(getCoins());
      setCanClaim(false);
      setClaimMsg(`+${n} coins claimed`);
    }
  };

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show">
      <motion.section variants={riseItem} className="pb-6 pt-10 md:pb-8 md:pt-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-200">Fictional adults · 21+</p>
        <h1 className="mt-4 max-w-[12ch] font-display text-[clamp(3.1rem,8vw,6.25rem)] leading-[0.9] tracking-[-0.04em] text-cream">
          Velvet
          <span className="block text-rose-200">Motion</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
          Chat, nudes, Discover swipe, roulette sprints, blindfold JOI. Free AI — log in to play.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-amber-200">{coins} coins</span>
          <span className="text-pink-300">Streak {streak}d</span>
          {canClaim && (
            <button
              type="button"
              onClick={onClaim}
              className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-amber-100 text-xs font-medium"
            >
              Claim daily +75
            </button>
          )}
          {claimMsg && <span className="text-xs text-emerald-300">{claimMsg}</span>}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => onNavigate("girls")} className="press inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-base font-medium text-white hover:bg-rose-500">
            Meet the girls
          </button>
          <button type="button" onClick={() => onNavigate("tinder")} className="press inline-flex min-h-11 items-center justify-center rounded-full border border-pink-500/50 bg-pink-500/15 px-5 text-base font-medium text-pink-100">
            Discover
          </button>
          <button type="button" onClick={() => onNavigate("roulette")} className="press inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-base font-medium text-cream">
            Roulette
          </button>
          <button type="button" onClick={() => onNavigate("blindfold")} className="press inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-base font-medium text-cream">
            Blindfold
          </button>
        </div>
      </motion.section>

      {onOpenGirl && (
        <motion.div variants={riseItem}>
          <FeaturedPair onOpen={onOpenGirl} />
        </motion.div>
      )}

      {onOpenGirl && (
        <motion.div variants={riseItem}>
          <DailyFeed onOpenGirl={onOpenGirl} />
        </motion.div>
      )}

      <section aria-labelledby="sections-heading" className="pb-4">
        <motion.div variants={riseItem} className="mb-5 md:mb-6">
          <h2 id="sections-heading" className="font-display text-3xl tracking-[-0.03em] text-cream md:text-4xl">
            Explore
          </h2>
        </motion.div>
        <motion.ul variants={riseContainer} className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {sections
            .filter((s) => !["workspace", "bnwo", "suggest"].includes(s.id))
            .map((section) => (
              <motion.li key={section.id} variants={riseItem} className="min-w-0">
                <FeatureCard section={section} onOpen={onNavigate} />
              </motion.li>
            ))}
        </motion.ul>
      </section>
    </motion.div>
  );
}
