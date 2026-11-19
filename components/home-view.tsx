"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { ProactiveInbox } from "./ProactiveInbox";
import { CandyGirlCard } from "./CandyGirlCard";
import { useCoinsStore } from "@/lib/coinsStore";
import { claimDailyDropReward, getDailyDropClaimState } from "@/lib/progression";
import { getEdgeStreak } from "@/lib/streaks";
import { CHARACTERS, characterCategories, filterCharacters } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";

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

export function HomeView({ onNavigate, onOpenGirl, onOpenDual }: {
  onNavigate: (id: SectionId | "dual" | "group" | "lounge" | "shorts" | "vault" | "import" | "share" | "advanced" | "wallet" | "my-girls" | "private" | "collection" | "studio" | "download") => void;
  onOpenGirl?: (id: string, incomingMessage?: string) => void;
  onOpenDual?: (aId: string, bId: string) => void;
}) {
  const reduce = useReducedMotion();
  const { coins, refresh } = useCoinsStore();
  const [dailyDrop, setDailyDrop] = useState<DailyDropEntry | null>(null);
  const [dropState, setDropState] = useState({ streak: 0, claimedToday: false });
  const [claimMsg, setClaimMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [homeCategory, setHomeCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
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
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(CHARACTERS.length, 6)), 6000);
    return () => clearInterval(t);
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
  const featured = useMemo(() => filterCharacters({ query: homeQuery, category: homeCategory }).slice(0, 24), [homeQuery, homeCategory]);
  const hero = CHARACTERS[heroIdx % CHARACTERS.length];
  const heroImage = staticPortraitUrl(hero.id);

  const visibleSections = useMemo(
    () => (ENABLE_3D ? sections : sections.filter((s) => s.id !== "penthouse" && s.id !== "joi3d")),
    [],
  );

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show" className="space-y-8">
      {/* Phase 1 Animated Neon Border Sweep Hero */}
      <motion.section variants={riseItem} className="neon-border-sweep">
        <div className="neon-sweep-inner relative overflow-hidden">
          <div className="relative aspect-[16/9] sm:aspect-[3/1] min-h-[195px]">
            <img src={heroImage} alt={hero.name} className="absolute inset-0 h-full w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/75 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-9 max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#00ffa3]/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" /> Online Now
                </span>
                <span className="rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#00f5ff]">
                  HYPER-NEON FLAGSHIP
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-6xl font-black text-white leading-none tracking-tight neon-text-glow">
                {hero.name.split(" ")[0]}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-pink-100/90 line-clamp-2">{hero.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenGirl?.(hero.id)}
                  className="rounded-full neon-btn-primary px-6 py-2.5 text-xs sm:text-sm font-extrabold"
                >
                  💬 Chat with {hero.name.split(" ")[0]}
                </button>
                <Link
                  href="/discover/"
                  className="rounded-full border border-[#00f5ff]/55 bg-[#05050a]/75 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#00f5ff] hover:bg-[#00f5ff]/15"
                >
                  🔥 Discover Swipe
                </Link>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setHeroIdx(i)}
                  className={`h-1.5 rounded-full transition ${i === heroIdx % 6 ? "w-6 bg-[#ff1e8e]" : "w-3 bg-white/40"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Automated Daily Drop Banner (Phase 4.4) */}
      {dailyDrop && (
        <motion.section variants={riseItem} className="neon-border-sweep">
          <div className="neon-sweep-inner p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={staticPortraitUrl(dailyDrop.companionId)}
                alt={dailyDrop.companionName}
                className="h-14 w-14 rounded-2xl object-cover object-top border border-[#ff1e8e]/60 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ff1e8e]/20 border border-[#ff1e8e]/50 px-2 py-0.5 text-[10px] font-black text-pink-200">
                    <Sparkles className="h-3 w-3" /> TODAY&apos;S DAILY DROP
                  </span>
                  <span className="text-[11px] font-bold text-[#00f5ff]">{dailyDrop.companionName}</span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-white mt-0.5 truncate">{dailyDrop.title}</h2>
                <p className="text-xs text-[#a6a6c4] line-clamp-1">{dailyDrop.scenario}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={dropState.claimedToday}
                onClick={claimDrop}
                className="rounded-full border border-[#00ffa3]/50 bg-[#00ffa3]/15 px-4 py-2 text-xs font-extrabold text-[#00ffa3] disabled:opacity-45"
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
        </motion.section>
      )}

      {/* Streak & Coins Telemetry */}
      <motion.div variants={riseItem} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 tabular-nums">
          🪙 {coins} Free Coins
        </span>
        <span className="rounded-full border border-[#ff1e8e]/35 bg-[#ff1e8e]/10 px-3 py-1 text-xs font-bold text-pink-200 tabular-nums">
          🔥 {Math.max(streak, dropState.streak)}d Streak
        </span>
        {claimMsg && <span className="text-xs font-semibold text-[#00ffa3]">{claimMsg}</span>}
        <Link href="/download/" className="ml-auto rounded-full border border-[#00f5ff]/45 bg-[#00f5ff]/10 px-3 py-1 text-xs font-bold text-[#00f5ff] hover:bg-[#00f5ff]/20">
          ⚡ Desktop Ultra Mode
        </Link>
      </motion.div>

      {onOpenGirl && <motion.div variants={riseItem}><ProactiveInbox onOpen={onOpenGirl} /></motion.div>}

      {/* Featured Companion Grid + Mobile 2-Row x 3.2-Col Horizontal Peeking Rail */}
      {onOpenGirl && (
        <motion.section variants={riseItem} className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#f7f7fc] neon-text-glow">Explore Companions</h2>
              <p className="text-xs text-[#a6a6c4]">100% unique portraits · uncensored local &amp; cloud roleplay</p>
            </div>
            <Link href="/chat/" className="text-xs font-bold text-[#00f5ff] hover:underline">
              Open Command Center →
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSearchOpen((p) => !p)}
              aria-label="Search companions"
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                searchOpen ? "border-[#ff1e8e] bg-[#ff1e8e]/20" : "border-white/15 bg-white/5"
              }`}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setHomeCategory(cat)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                  homeCategory === cat ? "chip-active" : "border-white/15 bg-[#0c0c16] text-[#a6a6c4]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {searchOpen && (
            <input
              type="search"
              value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              placeholder="Search companions, traits, categories..."
              className="w-full rounded-2xl border border-[#ff1e8e]/35 bg-[#0c0c16] px-4 py-2.5 text-sm text-white outline-none focus:border-[#00f5ff]"
              autoFocus
            />
          )}

          {/* Mobile: 2-row x ~3.2-column horizontal peeking companion rail */}
          <div className="grid grid-rows-2 grid-flow-col auto-cols-[31%] gap-2.5 overflow-x-auto no-scrollbar pb-2 sm:hidden">
            {featured.map((c, i) => (
              <CandyGirlCard key={c.id} character={c} onSelect={() => onOpenGirl(c.id)} isNew={i < 4} />
            ))}
          </div>

          {/* Tablet/Desktop responsive Explore grid */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {featured.map((c, i) => (
              <CandyGirlCard key={c.id} character={c} onSelect={() => onOpenGirl(c.id)} isNew={i < 4} />
            ))}
          </div>

          {/* Neon SHORTS & Private Content Promo Tiles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link href="/shorts/" className="neon-border-sweep block">
              <div className="neon-sweep-inner p-4 flex flex-col justify-between min-h-[104px] bg-gradient-to-br from-[#ff1e8e]/18 to-[#0c0c16]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5ff]">SHORTS 2.0</span>
                <div>
                  <div className="text-lg font-extrabold text-white">Watch Vertical Reels</div>
                  <p className="text-[11px] text-[#a6a6c4]">Snap-scroll neon scenes &amp; neural audio</p>
                </div>
              </div>
            </Link>
            <Link href="/private/" className="neon-border-sweep block">
              <div className="neon-sweep-inner p-4 flex flex-col justify-between min-h-[104px] bg-gradient-to-br from-[#a855f7]/20 to-[#0c0c16]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ff1e8e]">PRIVATE CONTENT</span>
                <div>
                  <div className="text-lg font-extrabold text-white">Unlock Exclusive Sets</div>
                  <p className="text-[11px] text-[#a6a6c4]">Spend free coins on private boudoir albums</p>
                </div>
              </div>
            </Link>
          </div>
        </motion.section>
      )}

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
              <img src={`/portraits/${exp.face}.jpg`} alt={exp.title} className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
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
