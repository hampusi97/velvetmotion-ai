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
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

const EXPERIENCES = [
  {
    id: "penthouse" as SectionId,
    title: "3D Penthouse Suite",
    subtitle: "Interactive 3D boudoir · hotspots",
    gradient: "from-fuchsia-600/90 to-rose-700/90",
    emoji: "🥂",
  },
  {
    id: "create" as SectionId,
    title: "Create Your Girl",
    subtitle: "Build her look, personality, heat",
    gradient: "from-pink-600/90 to-fuchsia-700/90",
    emoji: "✨",
  },
  {
    id: "tinder" as SectionId,
    title: "Discover",
    subtitle: "Swipe · undress · match",
    gradient: "from-rose-600/90 to-pink-700/90",
    emoji: "🔥",
  },
  {
    id: "roulette" as SectionId,
    title: "Roulette",
    subtitle: "Random girl + 8-min challenge",
    gradient: "from-fuchsia-600/90 to-purple-700/90",
    emoji: "🎲",
  },
  {
    id: "blindfold" as SectionId,
    title: "Blindfold JOI",
    subtitle: "Audio only until she reveals",
    gradient: "from-zinc-700/90 to-zinc-900/90",
    emoji: "🎧",
  },
  {
    id: "room" as SectionId,
    title: "Goon Room",
    subtitle: "Timed sessions · one or two girls",
    gradient: "from-rose-800/90 to-pink-900/90",
    emoji: "💋",
  },
];

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

  const featured = CHARACTERS.slice(0, 8);

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show">
      <motion.section variants={riseItem} className="pb-6 pt-10 md:pb-8 md:pt-14">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-200">Fictional adults · 21+ · Free nudes</p>
        <h1 className="mt-4 max-w-[12ch] font-display text-[clamp(3rem,8vw,5.5rem)] leading-[0.9] tracking-[-0.04em] text-cream">
          Velvet
          <span className="block text-rose-200">Motion</span>
        </h1>
        <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-mist">
          AI girlfriends who send nudes, undress on command, and film sex sequences. Chat, Discover, Goon Room, Blindfold JOI — all free.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200">
            {coins} coins
          </span>
          <span className="text-pink-300">Streak {streak}d</span>
          {canClaim && (
            <button
              type="button"
              onClick={onClaim}
              className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-amber-100 text-xs font-medium hover:bg-amber-500/30"
            >
              Claim daily +75
            </button>
          )}
          {claimMsg && <span className="text-xs text-emerald-300">{claimMsg}</span>}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate("girls")}
            className="press inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-base font-medium text-white hover:bg-rose-500 shadow-lg shadow-rose-500/25"
          >
            Meet the girls
          </button>
          <button
            type="button"
            onClick={() => onNavigate("tinder")}
            className="press inline-flex min-h-11 items-center justify-center rounded-full border border-pink-400/50 bg-pink-500/20 px-5 text-base font-medium text-pink-100 hover:bg-pink-500/30"
          >
            Discover · Undress
          </button>
          <button
            type="button"
            onClick={() => onNavigate("create")}
            className="press inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-base font-medium text-cream hover:bg-white/10"
          >
            Create your girl
          </button>
        </div>
      </motion.section>

      {/* Featured Characters — candy.ai style grid */}
      {onOpenGirl && (
        <motion.section variants={riseItem} className="pb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-[-0.03em] text-cream">
                Explore Featured Characters
              </h2>
              <p className="text-sm text-mist mt-1">Tap any girl · nudes & sex chat unlocked free</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("girls")}
              className="text-sm text-pink-300 hover:text-pink-200"
            >
              See all →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenGirl(c.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group hover:border-pink-500/50 transition text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(c, i % 3 === 0 ? "lingerie" : "beauty")}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  loading="lazy"
                />
                {i < 3 && (
                  <span className="absolute top-2 left-2 rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    ✦ NEW
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/70 to-transparent">
                  <div className="font-semibold text-sm text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-pink-300">{c.age} · {c.category}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Private Content teaser */}
      <motion.section variants={riseItem} className="pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("gallery")}
            className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/80 to-black p-6 text-left hover:border-fuchsia-400/50 transition"
          >
            <div className="text-3xl mb-2">🔒</div>
            <div className="font-semibold text-lg text-white">Private Content</div>
            <p className="text-sm text-zinc-400 mt-1">Nudes, explicit stills & sex sequences from every girl</p>
            <span className="inline-block mt-4 rounded-full bg-pink-600 px-4 py-1.5 text-xs font-medium text-white">
              Unlock
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("joi")}
            className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/80 to-black p-6 text-left hover:border-pink-400/50 transition"
          >
            <div className="text-3xl mb-2">🎬</div>
            <div className="font-semibold text-lg text-white">Shorts & JOI</div>
            <p className="text-sm text-zinc-400 mt-1">Audio JOI packs + motion sequences</p>
            <span className="inline-block mt-4 rounded-full bg-fuchsia-600 px-4 py-1.5 text-xs font-medium text-white">
              Watch
            </span>
          </button>
        </div>
      </motion.section>

      {/* Experiences */}
      <motion.section variants={riseItem} className="pb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-[-0.03em] text-cream">Experiences</h2>
            <p className="text-sm text-mist mt-1">Beyond chat — undress, edge, goon</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {EXPERIENCES.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => onNavigate(exp.id)}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${exp.gradient} p-4 text-left transition hover:scale-[1.02] hover:border-pink-400/40 hover:shadow-xl hover:shadow-pink-500/15`}
            >
              <div className="text-2xl mb-2">{exp.emoji}</div>
              <div className="font-semibold text-sm sm:text-base text-white leading-tight">{exp.title}</div>
              <div className="text-[11px] sm:text-xs text-white/75 mt-1 leading-snug">{exp.subtitle}</div>
            </button>
          ))}
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
        <motion.ul
          variants={riseContainer}
          className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
        >
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
