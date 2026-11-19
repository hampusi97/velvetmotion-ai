"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Lock, Search, Sparkles } from "lucide-react";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { ProactiveInbox } from "./ProactiveInbox";
import { CandyGirlCard } from "./CandyGirlCard";
import { SafeImage } from "./SafeImage";
import { useCoinsStore } from "@/lib/coinsStore";
import { claimDailyDropReward, getDailyDropClaimState } from "@/lib/progression";
import { getEdgeStreak } from "@/lib/streaks";
import { CHARACTERS, characterCategories, filterCharacters } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { getTimeMood } from "@/lib/timeMood";
import type { Character } from "@/lib/charactersTypes";

interface CommunitySpotlightItem {
  id: string;
  name: string;
  age: number;
  creator: string;
  category: string;
  portraitUrl: string;
  tagline: string;
  personality: string;
  initialMessage: string;
  visualDna: string;
  voiceId: string;
  tags: string[];
}

interface DailyDropEntry {
  day: number;
  companionId: string;
  companionName: string;
  title: string;
  scenario: string;
  challengeLabel: string;
  bonusCoins: number;
}

const ENABLE_3D = process.env.NEXT_PUBLIC_ENABLE_3D === "true";

const EXPERIENCES = [
  { id: "create" as SectionId, href: "/create/", title: "CREATE HER", subtitle: "Look · personality · heat", neon: "from-[#ff1e8e] to-[#00f5ff]", face: "briony" },
  { id: "tinder" as SectionId, href: "/discover/", title: "DISCOVER", subtitle: "Swipe · match · Rizz", neon: "from-fuchsia-400 to-[#ff1e8e]", face: "calla" },
  { id: "private" as SectionId, href: "/private/", title: "PRIVATE", subtitle: "Unlockable exclusive sets", neon: "from-pink-300 to-rose-400", face: "nadine" },
  { id: "blindfold" as SectionId, href: "/?view=blindfold", title: "BLINDFOLD", subtitle: "Voice JOI · Neon Beats", neon: "from-[#00f5ff] to-[#ff1e8e]", face: "liora" },
  { id: "group" as SectionId, href: "/group/", title: "2-ON-1 DRAMA", subtitle: "Two companions · Live banter", neon: "from-rose-400 to-[#a855f7]", face: "tess" },
];

export function HomeView({ onNavigate, onOpenGirl, onOpenDual, onOpenCustomCharacter }: {
  onNavigate: (id: SectionId | "dual" | "group" | "lounge" | "shorts" | "vault" | "import" | "share" | "advanced" | "wallet" | "my-girls" | "private" | "collection" | "studio" | "download") => void;
  onOpenGirl?: (id: string, incomingMessage?: string) => void;
  onOpenDual?: (aId: string, bId: string) => void;
  onOpenCustomCharacter?: (character: Character) => void;
}) {
  const reduce = useReducedMotion();
  const { coins, refresh } = useCoinsStore();
  const [dailyDrop, setDailyDrop] = useState<DailyDropEntry | null>(null);
  const [spotlight, setSpotlight] = useState<CommunitySpotlightItem[]>([]);
  const [timeMood] = useState(() => getTimeMood());
  const [dropState, setDropState] = useState({ streak: 0, claimedToday: false });
  const [claimMsg, setClaimMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [homeCategory, setHomeCategory] = useState("All");
  const [privateOnly, setPrivateOnly] = useState(false);
  const [homeQuery, setHomeQuery] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    setStreak(getEdgeStreak());
    setDropState(getDailyDropClaimState());
    void fetch("/data/daily-drops.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: DailyDropEntry[]) => {
        if (Array.isArray(list) && list.length > 0) {
          const idx = Math.floor(Date.now() / 86400000) % list.length;
          setDailyDrop(list[idx]);
        }
      })
      .catch(() => {});
    void fetch("/data/community-featured.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: CommunitySpotlightItem[]) => {
        if (Array.isArray(list)) setSpotlight(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(CHARACTERS.length, 6)), 6000);
    const onStyleTab = (e: Event) => {
      const tab = (e as CustomEvent<"girls" | "anime" | "all">).detail;
      if (tab === "anime") {
        setHomeCategory("Anime");
        setPrivateOnly(false);
      } else {
        setHomeCategory("All");
        setPrivateOnly(false);
      }
    };
    window.addEventListener("vm:style-tab", onStyleTab);
    return () => {
      clearInterval(t);
      window.removeEventListener("vm:style-tab", onStyleTab);
    };
  }, []);

  const claimDrop = () => {
    const res = claimDailyDropReward(dailyDrop?.bonusCoins || 25);
    if (res.ok) {
      refresh();
      setDropState({ streak: res.streak, claimedToday: true });
      setClaimMsg(`+${dailyDrop?.bonusCoins || 25} Free Coins claimed!`);
    }
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const featured = useMemo(() => {
    const list = filterCharacters({ query: homeQuery, category: homeCategory });
    if (privateOnly) {
      return list.filter((c) => c.intimacy >= 50 || /suite|private|boudoir|after/i.test(c.kink + c.tagline)).slice(0, 22);
    }
    return list.slice(0, 22);
  }, [homeQuery, homeCategory, privateOnly]);
  const hero = CHARACTERS[heroIdx % CHARACTERS.length];
  const heroImage = heroIdx % 6 === 0 ? "/promos/hero-banner.webp" : staticPortraitUrl(hero.id);

  const exploreCells = useMemo(() => {
    const cells: Array<{ kind: "char"; character: Character; isNew: boolean } | { kind: "shorts" } | { kind: "private" }> = [];
    featured.forEach((c, idx) => {
      if (idx === 2) cells.push({ kind: "shorts" });
      if (idx === 8) cells.push({ kind: "private" });
      cells.push({ kind: "char", character: c, isNew: idx < 5 });
    });
    if (featured.length < 3) cells.push({ kind: "shorts" });
    if (featured.length < 9) cells.push({ kind: "private" });
    return cells;
  }, [featured]);

  const visibleSections = useMemo(
    () => (ENABLE_3D ? sections : sections.filter((s) => s.id !== "penthouse" && s.id !== "joi3d")),
    [],
  );

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show" className="space-y-6">
      {/* candy.ai-inspired Obsidian Editorial Hero Carousel */}
      <motion.section variants={riseItem} className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#16161b] shadow-2xl">
        <div className="relative aspect-[16/7] sm:aspect-[16/5] min-h-[185px]">
          <SafeImage
            src={heroImage}
            alt={hero.name}
            className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111114] via-[#111114]/75 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-center p-5 sm:px-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ff5678] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                ✦ Featured
              </span>
              <span className="text-[11px] font-semibold text-zinc-300">{timeMood.badge}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black text-white leading-none tracking-tight">
              {heroIdx % 6 === 0 ? "Your Free AI Companion Studio" : hero.name}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 line-clamp-2">
              {heroIdx % 6 === 0
                ? "Zero daily caps · Editable Memory Vault · Voice calls & downloadable Local GPU Ultra desktop app."
                : hero.tagline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onOpenGirl?.(hero.id)}
                className="rounded-full neon-btn-primary px-6 py-2 text-xs sm:text-sm font-bold"
              >
                Chat with {hero.name.split(" ")[0]}
              </button>
              <Link
                href="/create/"
                className="rounded-full border border-white/15 bg-black/50 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:border-[#ff5678]/60"
              >
                Create Character
              </Link>
            </div>
          </div>

          {/* Centered Hero Pagination Dots matching candy.ai */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setHeroIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === heroIdx % 6 ? "w-5 bg-[#ff5678]" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Explore Featured Characters > (candy.ai Primary Grid + Interleaved SHORTS & Private Content Cards) */}
      {onOpenGirl && (
        <motion.section variants={riseItem} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-1.5">
              <span className="text-[#ff5c7c]">Explore</span>
              <span className="text-white">Featured Characters</span>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-[#1a1a1f] px-2.5 py-1 text-[11px] font-semibold text-zinc-300 tabular-nums">
                🔥 {Math.max(streak, dropState.streak)}d streak · 🪙 {coins}
              </span>
              <Link href="/discover/" className="rounded-full border border-[#ff5678]/40 bg-[#2a1820] px-3 py-1 text-[11px] font-bold text-[#ff8aa1] hover:bg-[#ff5678]/25">
                Swipe Discover →
              </Link>
            </div>
          </div>

          {/* Pill Search + Category Chips with soft right fade */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pr-10">
            <div className="relative shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                placeholder="Search"
                className="w-36 sm:w-48 rounded-full border border-white/10 bg-[#1c1c22] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-400 outline-none focus:border-[#ff5678]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setHomeCategory("All");
                setPrivateOnly(false);
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                homeCategory === "All" && !privateOnly ? "chip-active" : "border-white/10 bg-[#1c1c22] text-zinc-300 hover:border-white/25"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setPrivateOnly((p) => !p)}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                privateOnly ? "chip-active" : "border-white/10 bg-[#1c1c22] text-zinc-300 hover:border-white/25"
              }`}
            >
              <Lock className="h-3 w-3 text-[#ff5678]" /> Private Content
            </button>

            {categories
              .filter((c) => c !== "All")
              .map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setHomeCategory(cat);
                    setPrivateOnly(false);
                  }}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    homeCategory === cat ? "chip-active" : "border-white/10 bg-[#1c1c22] text-zinc-300 hover:border-white/25"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-[#111114] to-transparent" />
          </div>

          {/* 6-Column Editorial Photo Grid with Interleaved SHORTS & Private Content Promo Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {exploreCells.map((cell) => {
              if (cell.kind === "shorts") {
                return (
                  <Link
                    key="promo-shorts"
                    href="/shorts/"
                    className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-purple-500/40 bg-[#161322] text-center block"
                  >
                    <SafeImage
                      src="/promos/shorts-card.webp"
                      alt="VelvetMotion Shorts"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/80" />
                    <div className="relative z-10 flex h-full flex-col items-center justify-between p-3.5">
                      <span className="mt-1 font-display text-2xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.9)]">
                        SHORTS
                      </span>
                      <span className="w-full rounded-full neon-btn-primary py-2 text-xs font-bold text-white">
                        Watch
                      </span>
                    </div>
                  </Link>
                );
              }
              if (cell.kind === "private") {
                return (
                  <Link
                    key="promo-private"
                    href="/private/"
                    className="girl-card group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#ff5678]/40 bg-[#1b141a] text-center block"
                  >
                    <SafeImage
                      src="/promos/private-card.webp"
                      alt="Private Content"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85" />
                    <div className="relative z-10 flex h-full flex-col items-center justify-between p-3.5">
                      <span className="mt-1 font-display text-xl italic font-extrabold leading-tight text-white drop-shadow-[0_0_16px_rgba(255,86,120,0.95)]">
                        Private
                        <br />
                        Content
                      </span>
                      <span className="w-full rounded-full neon-btn-primary py-2 text-xs font-bold text-white">
                        Unlock
                      </span>
                    </div>
                  </Link>
                );
              }
              return (
                <CandyGirlCard
                  key={cell.character.id}
                  character={cell.character}
                  onSelect={() => onOpenGirl(cell.character.id)}
                  isNew={cell.isNew}
                />
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Automated Daily Drop Banner */}
      {dailyDrop && (
        <motion.section variants={riseItem} className="neon-border-sweep">
          <div className="neon-sweep-inner p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <SafeImage
                src={staticPortraitUrl(dailyDrop.companionId)}
                alt={dailyDrop.companionName}
                className="h-14 w-14 rounded-2xl object-cover object-top border border-[#ff5678]/50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ff5678]/20 border border-[#ff5678]/40 px-2 py-0.5 text-[10px] font-black text-pink-200">
                    <Sparkles className="h-3 w-3" /> TODAY&apos;S DAILY DROP
                  </span>
                  <span className="text-[11px] font-bold text-[#ff8aa1]">{dailyDrop.companionName}</span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-white mt-0.5 truncate">{dailyDrop.title}</h2>
                <p className="text-xs text-zinc-400 line-clamp-1">{dailyDrop.scenario}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={dropState.claimedToday}
                onClick={claimDrop}
                className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-extrabold text-emerald-300 disabled:opacity-45"
              >
                {dropState.claimedToday ? "Claimed Today ✓" : dailyDrop.challengeLabel}
              </button>
              <button
                type="button"
                onClick={() => onOpenGirl?.(dailyDrop.companionId, `*Daily Drop:* ${dailyDrop.scenario}`)}
                className="rounded-full neon-btn-primary px-4 py-2 text-xs font-extrabold text-white"
              >
                Play Scenario →
              </button>
            </div>
          </div>
          {claimMsg && <p className="px-5 pb-3 text-xs font-semibold text-emerald-300">{claimMsg}</p>}
        </motion.section>
      )}

      {/* Phase 8 #10: Weekly Community Spotlight Rail */}
      {spotlight.length > 0 && (
        <motion.section variants={riseItem} className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#f7f7fc] neon-text-glow flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00f5ff]" /> Community Spotlight
              </h2>
              <p className="text-xs text-[#a6a6c4]">Curated weekly creator cards ready to chat &amp; fork</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {spotlight.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  const charObj: Character = {
                    id: card.id,
                    name: card.name,
                    age: Math.max(18, card.age),
                    tagline: card.tagline,
                    category: card.category,
                    avatar: card.portraitUrl,
                    voiceIntro: card.initialMessage,
                    initialMessage: card.initialMessage,
                    tags: card.tags,
                    intimacy: 60,
                    voice: { label: card.voiceId, pitch: 1, rate: 0.96, style: card.personality },
                    voiceId: card.voiceId,
                    visualDna: card.visualDna,
                    personality: card.personality,
                    traits: card.tags.slice(0, 3),
                    background: `Featured weekly community card by ${card.creator}.`,
                    figure: card.visualDna,
                    kink: card.category,
                    reply: card.initialMessage,
                  };
                  if (onOpenCustomCharacter) onOpenCustomCharacter(charObj);
                  else onOpenGirl?.(card.id, card.initialMessage);
                }}
                  className="group relative w-52 shrink-0 rounded-2xl overflow-hidden neon-glass text-left girl-card"
              >
                <div className="relative aspect-[3/4]">
                  <SafeImage src={card.portraitUrl} alt={card.name} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                  <div className="candy-scrim absolute inset-0" />
                  <span className="absolute left-2.5 top-2.5 rounded-full border border-[#ff5678]/50 bg-[#141418]/85 px-2 py-0.5 text-[9px] font-extrabold text-[#ff8aa1]">
                    {card.creator}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="text-sm font-extrabold text-white truncate">{card.name}, {card.age}</div>
                    <p className="text-[11px] text-zinc-300 line-clamp-2 mt-0.5">{card.tagline}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {onOpenGirl && <motion.div variants={riseItem}><ProactiveInbox onOpen={onOpenGirl} /></motion.div>}

      {/* Experiences */}
      <motion.section variants={riseItem}>
        <div className="mb-4"><h2 className="font-display text-2xl font-extrabold text-[#f7f7fc]">Experiences</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {EXPERIENCES.map((exp) => (
            <Link
              key={exp.id}
              href={exp.href}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl neon-glass text-left girl-card block"
            >
              <SafeImage src={`/portraits/${exp.face}.jpg`} alt={exp.title} className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
              <div className="candy-scrim absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <div className={`text-lg font-black tracking-tight bg-gradient-to-r ${exp.neon} bg-clip-text text-transparent neon-text-glow`}>
                  {exp.title}
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5">{exp.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {onOpenGirl && <motion.div variants={riseItem}><FeaturedPair onOpen={onOpenGirl} onOpenDual={onOpenDual} /></motion.div>}
      {onOpenGirl && <motion.div variants={riseItem}><DailyFeed onOpenGirl={onOpenGirl} /></motion.div>}

      <section className="pb-4">
        <motion.div variants={riseItem} className="mb-4"><h2 className="font-display text-2xl font-extrabold text-[#f7f7fc]">More Modes</h2></motion.div>
        <motion.ul variants={riseContainer} className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => (
            <motion.li key={section.id} variants={riseItem}>
              <FeatureCard section={section} onOpen={onNavigate} />
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </motion.div>
  );
}
