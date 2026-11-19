"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { ProactiveInbox } from "./ProactiveInbox";
import { CandyGirlCard } from "./CandyGirlCard";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import { getEdgeStreak } from "@/lib/streaks";
import { CHARACTERS, characterCategories, filterCharacters } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";

const PORTRAIT_POOL = ["briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper"];

const EXPERIENCES = [
  { id: "create" as SectionId, title: "CREATE HER", subtitle: "Look · personality · heat", neon: "from-pink-400 to-cyan-400", face: "briony" },
  { id: "tinder" as SectionId, title: "DISCOVER", subtitle: "Swipe · match · undress", neon: "from-fuchsia-400 to-pink-400", face: "calla" },
  { id: "joi" as SectionId, title: "PRIVATE", subtitle: "JOI · galleries · tributes", neon: "from-pink-300 to-rose-400", face: "nadine" },
  { id: "blindfold" as SectionId, title: "BLINDFOLD", subtitle: "Audio first · reveal later", neon: "from-zinc-200 to-pink-300", face: "liora" },
  { id: "penthouse" as SectionId, title: "3D SUITE", subtitle: "Hotspots · lighting", neon: "from-fuchsia-300 to-violet-400", face: "isolde" },
  { id: "room" as SectionId, title: "GOON ROOM", subtitle: "Timed · dual", neon: "from-rose-400 to-pink-500", face: "tess" },
];

export function HomeView({ onNavigate, onOpenGirl, onOpenDual }: {
  onNavigate: (id: SectionId | "dual" | "group" | "lounge" | "shorts" | "vault" | "import" | "share" | "advanced" | "wallet" | "my-girls") => void;
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
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(CHARACTERS.length, 6)), 6000);
    return () => clearInterval(t);
  }, []);

  const onClaim = () => {
    const n = claimDaily();
    if (n > 0) {
      setCoins(getCoins());
      setCanClaim(false);
      setClaimMsg(`+${n} coins`);
    }
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const featured = useMemo(() => filterCharacters({ query: homeQuery, category: homeCategory }).slice(0, 30), [homeQuery, homeCategory]);
  const hero = CHARACTERS[heroIdx % CHARACTERS.length];
  const heroFace = PORTRAIT_POOL[heroIdx % PORTRAIT_POOL.length];

  return (
    <motion.div data-motion variants={riseContainer} initial={reduce ? false : "hidden"} animate="show">
      <motion.section variants={riseItem} className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-pink-500/25 candy-hero neon-pulse">
        <div className="relative aspect-[3/1] min-h-[140px] sm:min-h-[180px]">
          <img src={`/portraits/${heroFace}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
          <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-10 max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Online
              </span>
              <span className="rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Featured</span>
            </div>
            <h1 className="font-display text-5xl sm:text-7xl text-transparent bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-400 bg-clip-text leading-none tracking-tight drop-shadow-lg neon-text">{hero.name.split(" ")[0]}</h1>
            <p className="mt-1 text-base sm:text-lg text-pink-100/90 font-medium">{hero.tagline.slice(0, 70)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenGirl?.(hero.id)} className="candy-cta px-7 py-2.5 text-sm">Play with her</button>
              <button type="button" onClick={() => onNavigate("tinder")} className="rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur hover:bg-white/20">Discover</button>
            </div>
          </div>
          <div className="absolute bottom-5 right-5 flex gap-1.5 z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setHeroIdx(i)} className={`h-1 w-5 rounded-full transition ${i === heroIdx % 6 ? "bg-pink-500" : "bg-white/40"}`} />
            ))}
          </div>
        </div>
      </motion.section>

      <motion.div variants={riseItem} className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => onNavigate("wallet")} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200 tabular-nums hover:bg-amber-500/20">🪙 {coins}</button>
        <span className="text-pink-300 tabular-nums">{streak}d streak</span>
        {canClaim && <button type="button" onClick={onClaim} className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-amber-100 text-xs font-medium">Claim daily</button>}
        {claimMsg && <span className="text-xs text-emerald-300">{claimMsg}</span>}
        <button type="button" onClick={() => onNavigate("lounge" as SectionId)} className="ml-auto rounded-full border border-fuchsia-500/40 px-3 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/15">Lounge</button>
      </motion.div>

      {onOpenGirl && <motion.div variants={riseItem}><ProactiveInbox onOpen={onOpenGirl} /></motion.div>}

      <motion.section variants={riseItem} className="pb-10">
        <div className="mb-4"><h2 className="font-display text-2xl text-cream">Experiences</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {EXPERIENCES.map((exp) => (
            <button key={exp.id} type="button" onClick={() => onNavigate(exp.id)} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 text-left girl-card glass-card">
              <img src={`/portraits/${exp.face}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className={`text-xl font-black tracking-tight bg-gradient-to-r ${exp.neon} bg-clip-text text-transparent neon-text`}>{exp.title}</div>
                <p className="text-xs text-zinc-300 mt-0.5">{exp.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {onOpenGirl && (
        <motion.section variants={riseItem} className="pb-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl text-cream">Explore Featured Characters</h2>
            <button type="button" onClick={() => onNavigate("girls")} className="text-sm text-pink-300 hover:text-pink-200">See all →</button>
          </div>
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setSearchOpen((p) => !p)} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${searchOpen ? "border-pink-500 bg-pink-500/20" : "border-white/15 bg-white/5"}`}>
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setHomeCategory(cat)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${homeCategory === cat ? "border-pink-500 bg-pink-600/25 text-white chip-active" : "border-white/10 bg-white/5 text-zinc-300"}`}>{cat}</button>
            ))}
          </div>
          {searchOpen && <input type="search" value={homeQuery} onChange={(e) => setHomeQuery(e.target.value)} placeholder="Search…" className="mb-4 w-full rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-2 text-sm outline-none focus:border-pink-500" autoFocus />}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {featured.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
                No girls match “{homeQuery}”. Try another name or clear the search.
              </div>
            )}
            {featured.map((c, i) => (
              <CandyGirlCard key={c.id} character={c} onSelect={() => onOpenGirl(c.id)} isNew={i < 4} />
            ))}
            <button type="button" onClick={() => onNavigate("shorts")} className="relative aspect-[2/3] rounded-2xl border-2 border-fuchsia-500/60 bg-gradient-to-br from-fuchsia-900/40 to-pink-900/40 p-4 text-left flex flex-col justify-end">
              <div className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">SHORTS</div>
              <div className="text-lg font-black text-white mt-1">Watch</div>
              <p className="text-[10px] text-zinc-300 mt-1">Looping previews</p>
            </button>
            <button type="button" onClick={() => onNavigate("vault")} className="relative aspect-[2/3] rounded-2xl border-2 border-pink-500/60 bg-gradient-to-br from-pink-900/40 to-rose-900/40 p-4 text-left flex flex-col justify-end">
              <div className="text-xs font-bold uppercase tracking-widest text-pink-300">PRIVATE</div>
              <div className="text-lg font-black text-white mt-1">Unlock</div>
              <p className="text-[10px] text-zinc-300 mt-1">Vault & nudes</p>
            </button>
          </div>
        </motion.section>
      )}

      {onOpenGirl && <motion.div variants={riseItem}><FeaturedPair onOpen={onOpenGirl} onOpenDual={onOpenDual} /></motion.div>}
      {onOpenGirl && <motion.div variants={riseItem}><DailyFeed onOpenGirl={onOpenGirl} /></motion.div>}

      <section className="pb-4">
        <motion.div variants={riseItem} className="mb-5"><h2 className="font-display text-2xl text-cream">More</h2></motion.div>
        <motion.ul variants={riseContainer} className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => <motion.li key={section.id} variants={riseItem}><FeatureCard section={section} onOpen={onNavigate} /></motion.li>)}
        </motion.ul>
      </section>
    </motion.div>
  );
}
