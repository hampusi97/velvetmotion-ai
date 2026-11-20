"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Heart, Lock, Pause, Play, Search, Sparkles } from "lucide-react";
import { riseContainer, riseItem } from "@/lib/motion";
import { sections, type SectionId } from "@/lib/sections";
import { FeatureCard } from "./feature-card";
import { DailyFeed } from "./DailyFeed";
import { FeaturedPair } from "./FeaturedPair";
import { ProactiveInbox } from "./ProactiveInbox";
import { CandyGirlCard } from "./CandyGirlCard";
import { ExperienceRail } from "./ExperienceRail";
import { CinematicPortraitShowcase } from "./CinematicPortraitShowcase";
import { SafeImage } from "./SafeImage";
import { useCoinsStore } from "@/lib/coinsStore";
import { claimDailyDropReward, getDailyDropClaimState } from "@/lib/progression";
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
  const { refresh } = useCoinsStore();
  const [dailyDrop, setDailyDrop] = useState<DailyDropEntry | null>(null);
  const [spotlight, setSpotlight] = useState<CommunitySpotlightItem[]>([]);
  const [timeMood] = useState(() => getTimeMood());
  const [dropState, setDropState] = useState({ streak: 0, claimedToday: false });
  const [claimMsg, setClaimMsg] = useState("");
  const [homeCategory, setHomeCategory] = useState("All");
  const [privateOnly, setPrivateOnly] = useState(false);
  const [homeQuery, setHomeQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [showAllCompanions, setShowAllCompanions] = useState(false);
  const [rosterSort, setRosterSort] = useState<"featured" | "name">("featured");
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vm:favorite-companions") || "[]") as unknown;
      setFavoriteIds(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
    } catch { setFavoriteIds([]); }
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
    const t = reduce || heroPaused ? null : setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(CHARACTERS.length, 6)), 8500);
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
      if (t) clearInterval(t);
      window.removeEventListener("vm:style-tab", onStyleTab);
    };
  }, [reduce, heroPaused]);

  const claimDrop = () => {
    const res = claimDailyDropReward(dailyDrop?.bonusCoins || 25);
    if (res.ok) {
      refresh();
      setDropState({ streak: res.streak, claimedToday: true });
      setClaimMsg(`+${dailyDrop?.bonusCoins || 25} Free Coins claimed!`);
    }
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const filteredRoster = useMemo(() => {
    let list = filterCharacters({ query: homeQuery, category: homeCategory });
    if (privateOnly) {
      list = list.filter((c) => c.intimacy >= 50 || /suite|private|boudoir|after/i.test(c.kink + c.tagline));
    }
    if (favoriteOnly) list = list.filter((c) => favoriteIds.includes(c.id));
    if (rosterSort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [homeQuery, homeCategory, privateOnly, favoriteOnly, favoriteIds, rosterSort]);
  const featured = showAllCompanions ? filteredRoster : filteredRoster.slice(0, 18);
  const toggleFavorite = (id: string) => {
    setFavoriteIds((old) => {
      const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id];
      try { localStorage.setItem("vm:favorite-companions", JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  const hero = CHARACTERS[heroIdx % CHARACTERS.length];
  const heroImage = heroIdx % 6 === 0 ? "/promos/hero-banner.webp" : staticPortraitUrl(hero.id);

  const exploreCells = useMemo(() => {
    const cells: Array<{ kind: "char"; character: Character; isNew: boolean } | { kind: "shorts" } | { kind: "private" }> = [];
    featured.forEach((c, idx) => {
      if (idx === 2) cells.push({ kind: "shorts" });
      if (idx === 8) cells.push({ kind: "private" });
      cells.push({ kind: "char", character: c, isNew: (c.tags || []).some((t) => t.toUpperCase() === "NEW") });
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
      {/* Original VelvetMotion Private Atelier editorial hero. Motion is pausable. */}
      <motion.section variants={riseItem}
        className="relative isolate overflow-hidden rounded-[31px] border border-[#e3b0bf]/20 bg-[#170e1c] shadow-[0_30px_85px_rgba(0,0,0,.35)]">
        <div className="relative min-h-[365px] sm:min-h-[430px] lg:min-h-[505px]">
          <SafeImage
            src={heroImage}
            alt={hero.name + " — fictional adult companion"}
            className="absolute inset-0 h-full w-full object-cover object-[center_20%] transition-opacity duration-500 sm:object-[center_23%]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#130d18]/95 via-[#180f1e]/85 to-[#170d18]/20 sm:via-[#180f1e]/70" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0912]/70 via-transparent to-[#201324]/30" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-28 top-1/3 h-72 w-72 rounded-full bg-[#b54a76]/10 blur-[95px]" aria-hidden="true" />

          <div className="relative z-10 flex min-h-[365px] flex-col justify-center px-6 py-12 sm:min-h-[430px] sm:px-12 lg:min-h-[505px] lg:px-16">
            <div className="max-w-[570px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#edd0ca]/25 bg-[#241522]/50 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#f6d8d1] backdrop-blur-lg">
                <Sparkles className="h-3.5 w-3.5" /> VelvetMotion · Private Atelier
              </p>
              <h1 className="mt-5 font-display text-[35px] font-semibold leading-[1.07] tracking-[-.03em] text-[#fff7f3] sm:text-5xl lg:text-[62px]">
                {heroIdx % 6 === 0 ? (
                  <>Every story
                    <span className="block bg-gradient-to-r from-[#f8d3b8] via-[#f1a6c0] to-[#ceb5ec] bg-clip-text text-transparent">
                      begins with a spark.
                    </span>
                  </>
                ) : (
                  <>Meet <span className="bg-gradient-to-r from-[#f4cfbe] to-[#edaac8] bg-clip-text text-transparent">{hero.name}</span>.</>
                )}
              </h1>
              <p className="mt-4 max-w-[480px] text-sm leading-7 text-[#e4d5dc] sm:text-base">
                {heroIdx % 6 === 0
                  ? "Discover original fictional companions, build your own characters, create memories, and explore image, voice, and video tools through compatible AI engines."
                  : hero.tagline}
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[.17em] text-[#dbabbc]">
                Fictional adults · Personalized stories · Local AI optional
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => onOpenGirl?.(hero.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d37c96] to-[#a5537e] px-6 py-3 text-xs font-bold text-white shadow-[0_8px_30px_rgba(152,44,95,.27)] transition hover:brightness-110 sm:text-sm">
                  Meet {hero.name.split(" ")[0]} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <Link href="/create/"
                  className="inline-flex items-center gap-2 rounded-full border border-[#edd0d3]/30 bg-black/25 px-5 py-3 text-xs font-semibold text-white backdrop-blur-lg transition hover:border-[#eac1d1]/65 sm:text-sm">
                  Design a companion
                </Link>
                <Link href="/studio/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.055] px-5 py-3 text-xs font-medium text-[#f1d3dd] backdrop-blur-lg transition hover:border-white/35 sm:text-sm">
                  Open Studio
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 rounded-full border border-white/15 bg-[#180f1d]/75 px-3 py-2 backdrop-blur-xl sm:bottom-6 sm:right-7">
            <div className="flex gap-1.5" aria-label="Featured companion selection">
              {Array.from({ length: 6 }).map((_, i) => (
                <button key={i} type="button" aria-label={`Show featured slide ${i + 1}`}
                  aria-pressed={heroIdx % 6 === i} onClick={() => setHeroIdx(i)}
                  className={`h-2 rounded-full transition-all ${heroIdx % 6 === i ? "w-6 bg-[#ecc4ca]" : "w-2 bg-white/35 hover:bg-white/70"}`}
                />
              ))}
            </div>
            <span className="h-4 w-px bg-white/20" />
            <button type="button" aria-label={heroPaused ? "Resume hero rotation" : "Pause hero rotation"}
              aria-pressed={heroPaused} onClick={() => setHeroPaused((v) => !v)}
              className="text-[#f6d4dc] transition hover:text-white">
              {heroPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </motion.section>

      <motion.section variants={riseItem}>
        <ExperienceRail />
      </motion.section>

      {onOpenGirl && (
        <motion.section variants={riseItem}>
          <CinematicPortraitShowcase
            companions={featured.slice(0, 3).map((c) => ({
              id: c.id,
              name: c.name,
              tagline: c.tagline,
              category: c.category,
            }))}
            onOpenCompanion={(id) => onOpenGirl(id)}
          />
        </motion.section>
      )}

      {/* Explore characters and original VelvetMotion experiences */}
      {onOpenGirl && (
        <motion.section variants={riseItem} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-1.5">
              <span className="text-[#e8b6c0]">Explore</span>
              <span className="text-white">The Atelier</span>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-[#241b26] px-3 py-1 text-[11px] font-semibold text-[#e8c7d3] tabular-nums">
                {filteredRoster.length} fictional adult companions
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

            <button type="button" aria-pressed={favoriteOnly}
              onClick={() => setFavoriteOnly((v) => !v)}
              className={"shrink-0 inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition " + (favoriteOnly ? "border-[#e6a6b9] bg-[#8d3e61]/25 text-pink-100" : "border-white/10 bg-[#241c28] text-zinc-300 hover:border-white/25")}>
              <Heart className="h-3 w-3" /> Saved ({favoriteIds.length})
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-400">
              Showing {featured.length} of {filteredRoster.length} companions · Tap a portrait to enter her world
            </p>
            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              Sort
              <select aria-label="Sort companions" value={rosterSort}
                onChange={(e) => setRosterSort(e.target.value as "featured" | "name")}
                className="rounded-xl border border-white/10 bg-[#241b26] px-3 py-2 text-xs text-white">
                <option value="featured">Featured</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>

          {/* Responsive Atelier character portraits and experience tiles */}
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
                  isFavorite={favoriteIds.includes(cell.character.id)}
                  onToggleFavorite={() => toggleFavorite(cell.character.id)}
                />
              );
            })}
          </div>
          {filteredRoster.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#211923] p-8 text-center text-sm text-zinc-300">
              No companions match these filters. Try another category or clear your search.
            </div>
          )}
          {filteredRoster.length > 18 && (
            <div className="flex justify-center pt-3">
              <button type="button" onClick={() => setShowAllCompanions((v) => !v)}
                className="rounded-full border border-[#e5a9b8]/40 bg-[#9b4a6d]/15 px-6 py-3 text-sm font-semibold text-[#f7d7df] transition hover:border-[#e5a9b8]/80 hover:bg-[#9b4a6d]/25">
                {showAllCompanions ? "Show fewer companions" : "Explore all " + filteredRoster.length + " companions"}
              </button>
            </div>
          )}
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
