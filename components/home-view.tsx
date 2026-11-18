"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Film, ImageIcon, Mic, Search, Sparkles, X } from "lucide-react";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { ProactiveInbox } from "./ProactiveInbox";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import { getEdgeStreak } from "@/lib/streaks";
import { CHARACTERS, characterCategories, filterCharacters } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

const EXPERIENCES = [
  {
    id: "create" as SectionId,
    title: "CREATE HER",
    subtitle: "Build look · personality · heat",
    neon: "from-pink-400 to-cyan-400",
    imageMood: "beauty" as const,
  },
  {
    id: "tinder" as SectionId,
    title: "DISCOVER",
    subtitle: "Swipe · match · undress peek",
    neon: "from-fuchsia-400 to-pink-400",
    imageMood: "lingerie" as const,
  },
  {
    id: "joi" as SectionId,
    title: "PRIVATE CONTENT",
    subtitle: "JOI · galleries · tributes",
    neon: "from-pink-300 to-rose-400",
    imageMood: "seductive" as const,
  },
  {
    id: "blindfold" as SectionId,
    title: "BLINDFOLD JOI",
    subtitle: "Audio first · reveal later",
    neon: "from-zinc-200 to-pink-300",
    imageMood: "nude" as const,
  },
  {
    id: "penthouse" as SectionId,
    title: "3D PENTHOUSE",
    subtitle: "Hotspots · lighting · suite",
    neon: "from-fuchsia-300 to-violet-400",
    imageMood: "beauty" as const,
  },
  {
    id: "room" as SectionId,
    title: "GOON ROOM",
    subtitle: "Timed sessions · dual",
    neon: "from-rose-400 to-pink-500",
    imageMood: "explicit" as const,
  },
];

export function HomeView({
  onNavigate,
  onOpenGirl,
  onOpenDual,
}: {
  onNavigate: (
    id:
      | SectionId
      | "dual"
      | "group"
      | "lounge"
      | "shorts"
      | "vault"
      | "import"
      | "share"
      | "advanced"
      | "wallet"
      | "my-girls",
  ) => void;
  onOpenGirl?: (id: string, incomingMessage?: string) => void;
  onOpenDual?: (aId: string, bId: string) => void;
}) {
  const reduce = useReducedMotion();
  const [coins, setCoins] = useState(500);
  const [canClaim, setCanClaim] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [homeCategory, setHomeCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [homeQuery, setHomeQuery] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    setCoins(getCoins());
    setCanClaim(canClaimDaily());
    setStreak(getEdgeStreak());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(CHARACTERS.length, 6)), 5000);
    return () => clearInterval(t);
  }, []);

  const onClaim = () => {
    const n = claimDaily();
    if (n > 0) {
      setCoins(getCoins());
      setCanClaim(false);
      setClaimMsg(`+${n} coins claimed`);
    }
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const featured = useMemo(() => {
    const list = filterCharacters({ query: homeQuery, category: homeCategory });
    return list.slice(0, 12);
  }, [homeQuery, homeCategory]);

  const hero = CHARACTERS[heroIdx % CHARACTERS.length];

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show">
      {/* Hero banner — Candy style */}
      <motion.section variants={riseItem} className="relative mb-8 overflow-hidden rounded-3xl border border-pink-500/30">
        <div className="relative aspect-[21/9] min-h-[200px] sm:min-h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterMediaUrl(hero, "beauty")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-10 max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-pink-300">Featured companion</p>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl text-white leading-tight">
              {hero.name.split(" ")[0]}
              <span className="block text-lg sm:text-2xl text-pink-200 font-sans font-medium mt-1">
                {hero.tagline.slice(0, 60)}
              </span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenGirl?.(hero.id)}
                className="rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/40 hover:bg-pink-500"
              >
                Show me
              </button>
              <button
                type="button"
                onClick={() => onNavigate("tinder")}
                className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur hover:bg-white/15"
              >
                Discover more
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setHeroIdx(i)}
                className={`h-1.5 w-6 rounded-full transition ${i === heroIdx % 6 ? "bg-pink-500" : "bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Coins / streak bar */}
      <motion.div variants={riseItem} className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => onNavigate("wallet")}
          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200 tabular-nums hover:bg-amber-500/20 transition"
        >
          🪙 {coins} coins · Wallet
        </button>
        <span className="text-pink-300 tabular-nums">Streak {streak}d</span>
        {canClaim && (
          <button
            type="button"
            onClick={onClaim}
            className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-amber-100 text-xs font-medium hover:bg-amber-500/30"
          >
            Claim daily
          </button>
        )}
        {claimMsg && <span className="text-xs text-emerald-300">{claimMsg}</span>}
        <button
          type="button"
          onClick={() => onNavigate("wallet")}
          className="rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 hover:bg-pink-500/20"
        >
          💝 Support Dev ($5 optional)
        </button>
        <button
          type="button"
          onClick={() => onNavigate("lounge" as SectionId)}
          className="ml-auto rounded-full border border-fuchsia-500/40 px-3 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/15"
        >
          User lounge · Omegle style
        </button>
      </motion.div>

      {onOpenGirl && (
        <motion.div variants={riseItem}>
          <ProactiveInbox onOpen={onOpenGirl} />
        </motion.div>
      )}

      {/* Experiences — large Candy-style tiles */}
      <motion.section variants={riseItem} className="pb-10">
        <div className="mb-4">
          <h2 className="font-display text-2xl sm:text-3xl text-cream">
            Velvet <span className="text-pink-400">Experiences</span>
          </h2>
          <p className="text-sm text-mist mt-1">New ways to play beyond chat.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERIENCES.map((exp, i) => {
            const face = CHARACTERS[i % CHARACTERS.length];
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => onNavigate(exp.id)}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 text-left transition hover:border-pink-500/50 hover:shadow-[0_0_40px_rgba(236,72,153,0.25)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(face, exp.imageMood)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div
                    className={`text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r ${exp.neon} bg-clip-text text-transparent drop-shadow-lg`}
                    style={{ textShadow: "0 0 30px rgba(255,77,154,0.4)" }}
                  >
                    {exp.title}
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">{exp.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* Featured characters grid */}
      {onOpenGirl && (
        <motion.section variants={riseItem} className="pb-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-[-0.03em] text-cream">
                Explore <span className="text-pink-400">Featured</span>
              </h2>
              <p className="text-sm text-mist mt-1">Voices · memory · galleries · JOI / SPH / BNWO</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("girls")}
              className="text-sm text-pink-300 hover:text-pink-200 whitespace-nowrap shrink-0"
            >
              See all ({CHARACTERS.length}) →
            </button>
          </div>

          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                if (searchOpen) setHomeQuery("");
              }}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                searchOpen || homeQuery
                  ? "border-pink-500 bg-pink-500/20 text-pink-200"
                  : "border-white/15 bg-white/5 text-zinc-300"
              }`}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {categories.map((cat) => {
              const active = homeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHomeCategory(cat)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? "border-pink-500 bg-pink-600/25 text-white"
                      : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-pink-500/40"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {searchOpen && (
            <div className="mb-4">
              <input
                type="search"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                placeholder="Search name, personality, tags…"
                className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-pink-500"
                autoFocus
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featured.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenGirl(c.id)}
                className="girl-card relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 group hover:border-pink-500/60 transition text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(c, i % 3 === 0 ? "lingerie" : "beauty")}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                  loading="lazy"
                />
                {i < 3 && (
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    <Sparkles className="h-2.5 w-2.5" />
                    NEW
                  </span>
                )}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-zinc-100 backdrop-blur-sm">
                    <ImageIcon className="h-3 w-3" />
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-pink-200 backdrop-blur-sm">
                    <Mic className="h-3 w-3" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/65 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white truncate">{c.name}</span>
                    <span className="text-xs text-zinc-300 shrink-0">{c.age}</span>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-pink-400" />
                  </div>
                  <div className="mt-0.5 text-[11px] text-pink-200/90 truncate">{c.category}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={riseItem} className="pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("gallery")}
            className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/80 to-black p-6 text-left hover:border-fuchsia-400/50 transition"
          >
            <ImageIcon className="h-7 w-7 text-pink-300 mb-2" />
            <div className="font-semibold text-lg text-white">Private Content</div>
            <p className="text-sm text-zinc-400 mt-1">Saved sets · tributes · custom scenes</p>
            <span className="inline-block mt-4 rounded-full bg-pink-600 px-4 py-1.5 text-xs font-medium text-white">
              Unlock
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("joi")}
            className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/80 to-black p-6 text-left hover:border-pink-400/50 transition"
          >
            <Film className="h-7 w-7 text-fuchsia-300 mb-2" />
            <div className="font-semibold text-lg text-white">Shorts & Guided Audio</div>
            <p className="text-sm text-zinc-400 mt-1">JOI packs · timed pacing</p>
            <span className="inline-block mt-4 rounded-full bg-fuchsia-600 px-4 py-1.5 text-xs font-medium text-white">
              Watch
            </span>
          </button>
        </div>
      </motion.section>

      {onOpenGirl && (
        <motion.div variants={riseItem}>
          <FeaturedPair onOpen={onOpenGirl} onOpenDual={onOpenDual} />
        </motion.div>
      )}

      {onOpenGirl && (
        <motion.div variants={riseItem}>
          <DailyFeed onOpenGirl={onOpenGirl} />
        </motion.div>
      )}

      <section aria-labelledby="sections-heading" className="pb-4">
        <motion.div variants={riseItem} className="mb-5">
          <h2 id="sections-heading" className="font-display text-3xl text-cream">
            More
          </h2>
        </motion.div>
        <motion.ul
          variants={riseContainer}
          className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sections.map((section) => (
            <motion.li key={section.id} variants={riseItem} className="min-w-0">
              <FeatureCard section={section} onOpen={onNavigate} />
            </motion.li>
          ))}
        </motion.ul>
        <motion.div variants={riseItem} className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["shorts", "🎬 Velvet Shorts"],
              ["dual", "👯‍♀️ Dual Girl Chat"],
              ["group", "👥 Group Chat (2-4 Girls)"],
              ["lounge", "👋 User Lounge"],
              ["vault", "🔐 Private PIN Vault"],
              ["import", "🃏 Import SillyTavern Card"],
              ["share", "🔗 Share & Import Codes"],
              ["advanced", "⚙️ ComfyUI / Ollama / Telegram"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-pink-500/50 hover:bg-pink-500/10 transition"
            >
              {label}
            </button>
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}
