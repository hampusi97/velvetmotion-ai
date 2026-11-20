'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Lock,
  Film,
  Sparkles,
  Flame,
  Play,
  ChevronRight,
} from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import {
  AFTER_DARK_COMPANIONS,
  ARCHETYPE_COMPANIONS,
  COMPANION_ARCHETYPE_FILTERS,
  FLAGSHIP_COMPANIONS,
  type CompanionCategory,
  type CompanionProfile,
} from '@/data/companions';

export interface ShowcaseCompanion {
  id: string;
  name: string;
  age: number;
  portrait: string;
  fallbackPortrait?: string;
  category?: 'Caucasian' | 'Black' | 'Latina' | 'Asian' | 'European' | 'South Asian' | 'Mixed';
  hair?: 'Blonde' | 'Brunette' | 'Black' | 'Red' | 'Colorful';
  isNew?: boolean;
  hasPrivate?: boolean;
  tagline: string;
  role?: string;
  archetypeCategory?: CompanionCategory;
}

const FALLBACK_PORTRAIT = '/portraits/nova.jpg';

function toShowcaseCard(
  profile: CompanionProfile,
  hair?: ShowcaseCompanion['hair'],
  category?: ShowcaseCompanion['category'],
): ShowcaseCompanion {
  return {
    id: profile.id,
    name: profile.name,
    age: profile.age,
    portrait: profile.portraitUrl,
    category,
    hair,
    isNew: profile.isNew,
    archetypeCategory: profile.category,
    role: profile.archetype,
    tagline: profile.tagline,
  };
}

const AFTER_DARK_CARDS = AFTER_DARK_COMPANIONS.map((profile) => toShowcaseCard(
  profile,
  profile.id === 'renata-costa' ? 'Brunette' : 'Black',
  profile.id === 'imani-reed' ? 'Black' : profile.id === 'renata-costa' ? 'Latina' : undefined,
));

const ARCHETYPE_HAIR: Record<string, ShowcaseCompanion['hair']> = {
  'mara-graves': 'Black',
  'vesna-nox': 'Red',
  'blair-hartwell': 'Blonde',
  'rowan-mercer': 'Black',
  'jade-aster': 'Black',
  'morgan-ellis': 'Red',
  'veda-kane': 'Black',
  'noor-mansour': 'Black',
  'juno-aimes': 'Black',
};
const newArchetypeCards = ARCHETYPE_COMPANIONS.map((profile) => toShowcaseCard(profile, ARCHETYPE_HAIR[profile.id]));
const includedProfileIds = new Set([...AFTER_DARK_CARDS, ...newArchetypeCards].map(({ id }) => id));
const additionalGothCards = FLAGSHIP_COMPANIONS
  .filter((profile) => profile.category === 'Goth' && !includedProfileIds.has(profile.id))
  .map((profile) => toShowcaseCard(profile, 'Black'));

export const SHOWCASE_COMPANIONS: ShowcaseCompanion[] = [
  ...newArchetypeCards,
  ...AFTER_DARK_CARDS,
  ...additionalGothCards,
  {
    id: 'chloe',
    name: 'Chloe',
    age: 23,
    portrait: '/portraits/chloe.jpg',
    category: 'Caucasian',
    hair: 'Brunette',
    isNew: true,
    tagline: 'Late-night penthouse energy',
  },
  {
    id: 'priya',
    name: 'Priya',
    age: 25,
    portrait: '/portraits/priya-v.jpg',
    category: 'South Asian',
    hair: 'Black',
    isNew: true,
    hasPrivate: true,
    tagline: 'Playful, bold & unforgettable',
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 27,
    portrait: '/portraits/elena.jpg',
    category: 'European',
    hair: 'Brunette',
    isNew: true,
    hasPrivate: true,
    tagline: 'Velvet lounge confessions',
  },
  {
    id: 'delilah',
    name: 'Delilah',
    age: 21,
    portrait: '/portraits/delilah-v.jpg',
    category: 'Mixed',
    hair: 'Colorful',
    hasPrivate: true,
    tagline: 'Neon café rebel',
  },
  {
    id: 'suzu',
    name: 'Suzu',
    age: 21,
    portrait: '/portraits/suzu-m.jpg',
    category: 'Asian',
    hair: 'Black',
    hasPrivate: true,
    tagline: 'Tokyo midnight arcade',
  },
  {
    id: 'mia',
    name: 'Mia',
    age: 24,
    portrait: '/portraits/mia.jpg',
    category: 'Caucasian',
    hair: 'Blonde',
    tagline: 'Golden hour tease',
  },
  {
    id: 'scarlett',
    name: 'Scarlett',
    age: 26,
    portrait: '/portraits/scarlett.jpg',
    category: 'Latina',
    hair: 'Black',
    isNew: true,
    hasPrivate: true,
    tagline: 'Midnight rooftop drinks',
  },
  {
    id: 'freya',
    name: 'Freya',
    age: 24,
    portrait: '/portraits/freya.jpg',
    category: 'European',
    hair: 'Blonde',
    isNew: true,
    tagline: 'Nordic charm after dark',
  },
  {
    id: 'valentina',
    name: 'Valentina',
    age: 27,
    portrait: '/portraits/valentina.jpg',
    category: 'Latina',
    hair: 'Brunette',
    hasPrivate: true,
    tagline: 'VIP lounge regular',
  },
  {
    id: 'mila',
    name: 'Mila',
    age: 22,
    portrait: '/portraits/mila-s.jpg',
    category: 'European',
    hair: 'Blonde',
    hasPrivate: true,
    tagline: 'After-party whisperer',
  },
  {
    id: 'nova',
    name: 'Nova',
    age: 24,
    portrait: '/portraits/nova.jpg',
    category: 'Asian',
    hair: 'Black',
    hasPrivate: true,
    tagline: 'Cyber-neon muse',
  },
  {
    id: 'sloane',
    name: 'Sloane',
    age: 26,
    portrait: '/portraits/sloane.jpg',
    category: 'Caucasian',
    hair: 'Brunette',
    hasPrivate: true,
    tagline: 'Sharp wit, softer side',
  },
];

const ADULT_SCENE_CARDS = FLAGSHIP_COMPANIONS
  .filter((profile) => profile.sceneSelfiePresets.some((scene) => scene.nsfw))
  .map((profile) => SHOWCASE_COMPANIONS.find(({ id }) => id === profile.id) ?? toShowcaseCard(profile));

const HERO_SLIDES = [
  {
    id: 'nova',
    eyebrow: 'VelvetMotion AI',
    title: 'Companions after dark',
    caption: 'Meet fictional AI companions, find a match, and create your own scenes in Studio.',
    cta: 'Find a match',
    href: '/discover/',
    image: '/promos/match-lounge.webp',
  },
  {
    id: 'chloe',
    eyebrow: 'Featured companion',
    title: 'An evening with Chloe',
    caption: 'Pick up a conversation with a warm, playful late-night confidante.',
    cta: 'Chat now',
    href: '/chat/?companion=chloe',
    image: '/portraits/chloe.jpg',
  },
  {
    id: 'priya',
    eyebrow: 'Group chat',
    title: 'Priya & Mia',
    caption: 'Start a shared scene with two distinct companion personalities.',
    cta: 'Enter room',
    href: '/group/',
    image: '/portraits/priya-v.jpg',
  },
];

const EXPERIENCES = [
  {
    id: 'creators',
    title: 'VELVET',
    subtitle: 'CREATORS',
    caption: 'Upload fictional art or craft your dream companion.',
    href: '/create/',
    image: '/portraits/priya-v.jpg',
    accent: 'from-[#ff1e8e] via-[#ff4dff] to-[#00f5ff]',
    position: 'top' as const,
  },
  {
    id: 'video',
    title: 'BUILD',
    subtitle: 'YOUR VIDEO',
    caption: 'Direct AI clips with a connected video model.',
    href: '/studio/',
    image: '/portraits/mia.jpg',
    accent: 'from-[#ff4d8d] to-[#ff1e8e]',
    position: 'top' as const,
  },
  {
    id: 'private',
    title: 'Private',
    subtitle: 'Content',
    caption: 'Unlock exclusive late-night photo sets for free.',
    href: '/private/',
    image: '/portraits/scarlett.jpg',
    accent: 'from-[#ff4dff] to-[#ff1e8e]',
    position: 'top' as const,
  },
  {
    id: 'cams',
    title: 'GUIDED',
    subtitle: 'JOI AUDIO',
    caption: 'Generate a personal script or try a ready-made session.',
    href: '/joi/',
    image: '/portraits/raven.jpg',
    accent: 'from-[#ff1e8e] to-[#c026d3]',
    position: 'bottom' as const,
  },
  {
    id: 'shorts',
    title: 'VELVET',
    subtitle: 'SHORTS',
    caption: 'Swipe vertical neon stories & jump straight into chat.',
    href: '/shorts/',
    image: '/portraits/elena.jpg',
    accent: 'from-[#00f5ff] to-[#ff1e8e]',
    position: 'top' as const,
  },
];

const SHORTS_EPISODES = [
  {
    id: 'ep-1',
    title: 'Midnight Penthouse',
    companion: 'Chloe',
    image: '/portraits/chloe.jpg',
    href: '/shorts/',
    isTeaser: false,
  },
  {
    id: 'ep-2',
    title: 'Neon Arcade Date',
    companion: 'Suzu',
    image: '/portraits/suzu-m.jpg',
    href: '/shorts/',
    isTeaser: false,
  },
  {
    id: 'ep-3',
    title: 'SPICY SERIES',
    companion: 'Unlock all episodes free',
    image: '',
    href: '/shorts/',
    isTeaser: true,
  },
  {
    id: 'ep-4',
    title: 'After-Hours Lounge',
    companion: 'Scarlett',
    image: '/portraits/scarlett.jpg',
    href: '/shorts/',
    isTeaser: false,
  },
  {
    id: 'ep-5',
    title: 'Rooftop Confessions',
    companion: 'Valentina',
    image: '/portraits/valentina.jpg',
    href: '/shorts/',
    isTeaser: false,
  },
];

const FILTER_PILLS = ['All', '18+ Scenes', ...COMPANION_ARCHETYPE_FILTERS, 'After Hours', 'New arrivals', 'Private Content', 'Caucasian', 'Black', 'Latina', 'Asian', 'European', 'Blonde', 'Brunette'];

function SafePortrait({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <SafeImage
      src={src || FALLBACK_PORTRAIT}
      fallbackSrc={FALLBACK_PORTRAIT}
      alt={alt}
      loading="lazy"
      className={className}
    />
  );
}

export default function VelvetExploreShowcase() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const onStyleTab = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === 'anime') setActiveFilter('Asian');
      else if (tab === 'all' || tab === 'girls') setActiveFilter('All');
    };
    window.addEventListener('vm:style-tab', onStyleTab);
    return () => window.removeEventListener('vm:style-tab', onStyleTab);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase().replace(/\bstep[- ]*daughters?\b/g, 'stepdaughter');
    const cards = activeFilter === '18+ Scenes' ? ADULT_SCENE_CARDS : SHOWCASE_COMPANIONS;
    return cards.filter((c) => {
      const matchesQuery = !search ||
        [c.name, c.tagline, c.role, c.archetypeCategory].some((value) => value?.toLowerCase().includes(search));
      if (!matchesQuery) return false;
      if (activeFilter === 'All' || activeFilter === '18+ Scenes') return true;
      if (activeFilter === 'New arrivals') return Boolean(c.isNew);
      if (activeFilter === 'After Hours') return AFTER_DARK_CARDS.some(({ id }) => id === c.id);
      if (activeFilter === 'Private Content') return Boolean(c.hasPrivate);
      if (activeFilter === 'Blonde' || activeFilter === 'Brunette') return c.hair === activeFilter;
      return c.category === activeFilter || c.archetypeCategory === activeFilter;
    });
  }, [query, activeFilter]);

  const activeHero = HERO_SLIDES[heroIdx] ?? HERO_SLIDES[0];

  // Keep discovery promos in the unfiltered catalog.
  const gridItems = useMemo(() => {
    const out: Array<
      | { type: 'companion'; data: ShowcaseCompanion }
      | { type: 'promo-shorts' }
      | { type: 'promo-private' }
    > = [];

    const showPromos = activeFilter === 'All' && !query.trim();
    filtered.forEach((c, idx) => {
      if (showPromos && idx === 4) out.push({ type: 'promo-shorts' });
      if (showPromos && idx === 7) out.push({ type: 'promo-private' });
      out.push({ type: 'companion', data: c });
    });

    return out;
  }, [activeFilter, filtered, query]);

  const isBrowsingAll = activeFilter === 'All' && !query.trim();
  const mobileRows = isBrowsingAll ? 2 : 1;

  return (
    <div className="min-h-screen bg-[#08080e] text-[#f7f7fc] pb-16">
      {/* FULL-BLEED CINEMATIC HERO CAROUSEL */}
      <section className="relative min-h-[390px] w-full overflow-hidden rounded-b-3xl border-b border-rose-200/15 bg-[#110b14] sm:min-h-[465px]">
        <SafeImage
          key={activeHero.id}
          src={activeHero.image}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[65%_40%] motion-safe:animate-[velvet-hero-enter_650ms_ease-out_both]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#130a15_3%,rgba(19,10,21,.92)_38%,rgba(19,10,21,.52)_70%,rgba(19,10,21,.18))] sm:bg-[linear-gradient(90deg,#130a15_3%,rgba(19,10,21,.85)_36%,rgba(19,10,21,.22)_76%,transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-transparent to-[#08080e]/30" />

        <div className="relative z-10 flex min-h-[390px] max-w-2xl flex-col justify-center px-6 pb-14 pt-10 sm:min-h-[465px] sm:px-12">
          <p className="text-sm font-semibold text-rose-200">{activeHero.eyebrow}</p>
          <h1 className="mt-3 max-w-[12ch] font-display text-5xl leading-[.98] tracking-tight text-rose-50 sm:text-7xl">
            {activeHero.title}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-rose-50/80 sm:text-base">{activeHero.caption}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={activeHero.href}
              className="inline-flex items-center justify-center rounded-full bg-rose-200 px-5 py-2.5 text-sm font-bold text-[#2b1421] transition hover:bg-rose-100"
            >
              {activeHero.cta}
            </Link>
            <Link
              href="/studio/"
              className="inline-flex items-center justify-center rounded-full border border-rose-200/40 bg-black/35 px-5 py-2.5 text-sm font-semibold text-rose-100 backdrop-blur-md transition hover:bg-rose-200/15"
            >
              Open Studio
            </Link>
          </div>
        </div>

        {/* Carousel Dash Indicators */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setHeroIdx(i)}
              aria-label={s.title}
              aria-pressed={heroIdx === i}
              className={`h-1 rounded-full transition-all ${
                i === heroIdx
                  ? 'w-7 bg-[#ff1e8e] shadow-[0_0_10px_rgba(255,30,142,0.9)]'
                  : 'w-4 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        {/* EXPLORE FEATURED CHARACTERS HEADER + FILTER BAR */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-3xl tracking-tight text-rose-50 sm:text-4xl">Meet the cast</h2>
            <Link
              href="/discover/"
              className="shrink-0 text-xs font-semibold text-[#00f5ff] hover:underline"
            >
              Open Match Lounge →
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
            <div className="relative min-w-[180px] sm:min-w-[210px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search companions"
                placeholder="Name or personality"
                className="w-full rounded-full border border-white/10 bg-[#151520] py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-[#ff1e8e]"
              />
            </div>

            {FILTER_PILLS.map((pill) => {
              const active = activeFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveFilter(pill)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? 'border border-[#ff1e8e] bg-[#ff1e8e]/15 text-white shadow-[0_0_14px_rgba(255,30,142,0.45)]'
                      : 'border border-white/10 bg-[#151520] text-white/75 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {pill === 'Private Content' && <Lock className="h-3.5 w-3.5 text-[#ff4d8d]" />}
                  {pill}
                </button>
              );
            })}
          </div>

          {!gridItems.length && <p role="status" className="mt-4 text-sm text-zinc-300">No companions match that search.</p>}
          <div aria-label="Companion portraits"
            style={{ '--cast-columns': Math.max(1, Math.ceil(gridItems.length / mobileRows)) } as React.CSSProperties}
            className="mt-4 grid grid-cols-[repeat(var(--cast-columns),minmax(104px,31%))] gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 lg:grid-cols-6">
            {gridItems.map((item) => {
              if (item.type === 'promo-shorts') {
                return (
                  <Link
                    key="promo-shorts"
                    href="/shorts/"
                    className="group relative flex aspect-[2/3] snap-start flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-[#a855f7]/80 bg-gradient-to-b from-[#1a0b2e] via-[#120b24] to-[#0b0718] p-4 shadow-[0_0_24px_rgba(168,85,247,0.45)] transition hover:-translate-y-1"
                  >
                    <div className="mt-2 text-center">
                      <span className="block text-2xl font-black tracking-wider text-white drop-shadow-[0_0_14px_rgba(0,245,255,0.9)]">
                        SHORTS
                      </span>
                      <span className="mt-1 inline-block rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#00f5ff]">
                        Neon Reels
                      </span>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ff1e8e]/60 bg-[#ff1e8e]/20 shadow-[0_0_24px_rgba(255,30,142,0.65)] group-hover:scale-110 transition">
                      <Play className="h-7 w-7 fill-white text-white ml-0.5" />
                    </div>
                    <span className="w-full rounded-full bg-gradient-to-r from-[#ff4d8d] to-[#ff1e8e] py-2 text-center text-xs font-bold text-white shadow-[0_0_16px_rgba(255,30,142,0.5)]">
                      Watch
                    </span>
                  </Link>
                );
              }

              if (item.type === 'promo-private') {
                return (
                  <Link
                    key="promo-private"
                    href="/private/"
                    className="group relative flex aspect-[2/3] snap-start flex-col items-center justify-between overflow-hidden rounded-2xl border border-[#ff1e8e]/70 bg-[#140b18] p-4 shadow-[0_0_22px_rgba(255,30,142,0.35)] transition hover:-translate-y-1"
                  >
                    <SafePortrait
                      src="/portraits/scarlett.jpg"
                      alt="Private Content"
                      className="absolute inset-0 h-full w-full object-cover opacity-55 group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#08080e]/60 via-transparent to-[#08080e]/90" />
                    <div className="relative z-10 mt-3 text-center">
                      <span className="block font-serif italic text-2xl font-bold text-white drop-shadow-[0_0_14px_rgba(255,30,142,0.95)]">
                        Private
                      </span>
                      <span className="block font-serif italic text-xl font-bold text-[#ff8ac4] drop-shadow-[0_0_12px_rgba(255,30,142,0.95)]">
                        Content
                      </span>
                    </div>
                    <span className="relative z-10 w-full rounded-full bg-gradient-to-r from-[#ff4d8d] to-[#ff1e8e] py-2 text-center text-xs font-bold text-white shadow-[0_0_16px_rgba(255,30,142,0.55)]">
                      Unlock
                    </span>
                  </Link>
                );
              }

              const c = item.data;
              return (
                <article key={c.id} className="relative aspect-[2/3] snap-start">
                  <Link
                    href={`/chat/?companion=${c.id}`}
                    aria-label={`Chat with ${c.name}, ${c.age}`}
                    className="group relative block h-full overflow-hidden rounded-[1.15rem] border border-rose-100/15 bg-[#19101a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 motion-safe:transition motion-safe:hover:-translate-y-1 hover:border-rose-300/60"
                  >
                    <SafePortrait
                      src={c.portrait}
                      alt=""
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                    {c.isNew && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-[#3b1a2d]">New</span>
                    )}
                    <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate font-display text-[1.05rem] tracking-tight text-white sm:text-2xl">{c.name}</span>
                        <span className="shrink-0 text-xs text-rose-100/80">{c.age}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight text-rose-50/80 sm:text-xs">{c.role || c.tagline}</span>
                    </div>
                  </Link>
                  {c.role && (
                    <Link href={`/studio/?companion=${c.id}&mode=video`} aria-label={`Create a video with ${c.name}`}
                      className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/40 bg-[#271927]/90 text-rose-100 hover:bg-[#5a2b43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300">
                      <Film className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* VELVET EXPERIENCES — 5 TALL VERTICAL SHOWCASE CARDS */}
        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            <span className="text-[#ff4d8d]">Velvet</span>{' '}
            <span className="text-white">Experiences</span>
          </h2>
          <p className="mt-0.5 text-sm text-white/60">New ways to play beyond chat.</p>

          <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {EXPERIENCES.map((exp) => (
              <Link
                key={exp.id}
                href={exp.href}
                className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#13131d] transition duration-300 hover:-translate-y-1 hover:border-[#ff1e8e]/80 hover:shadow-[0_0_26px_rgba(255,30,142,0.35)]"
              >
                <SafePortrait
                  src={exp.image}
                  alt={exp.title}
                  className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/15 to-black/80" />

                <div
                  className={`absolute inset-x-3 z-10 text-center ${
                    exp.position === 'top' ? 'top-4' : 'bottom-4'
                  }`}
                >
                  <span
                    className={`block bg-gradient-to-r ${exp.accent} bg-clip-text text-2xl font-black uppercase tracking-tight text-transparent drop-shadow-[0_0_14px_rgba(255,30,142,0.85)]`}
                  >
                    {exp.title}
                  </span>
                  <span className="block text-xl font-black uppercase tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,245,255,0.65)]">
                    {exp.subtitle}
                  </span>
                  <p className="mt-1.5 text-[11px] font-medium text-white/85">{exp.caption}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* WATCH VELVET SHORTS HORIZONTAL RAIL */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              <span className="text-[#ff4d8d]">Watch</span>{' '}
              <span className="text-white">Velvet Shorts</span>
              <ChevronRight className="ml-1 inline h-5 w-5 text-white/50" />
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {SHORTS_EPISODES.map((ep) =>
              ep.isTeaser ? (
                <Link
                  key={ep.id}
                  href={ep.href}
                  className="group relative flex aspect-[2/3] snap-start flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#ff1e8e]/60 bg-gradient-to-b from-[#1f0c18] to-[#0e0912] p-5 text-center shadow-[0_0_24px_rgba(255,30,142,0.28)] transition hover:-translate-y-1"
                >
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#ff1e8e] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                    NEW EPISODES
                  </span>
                  <Flame className="h-9 w-9 text-white drop-shadow-[0_0_12px_rgba(255,30,142,0.9)]" />
                  <span className="mt-3 text-sm font-black uppercase tracking-wider text-white">
                    {ep.title}
                  </span>
                  <p className="mt-1.5 text-xs text-white/70">
                    Discover all interactive neon Shorts episodes — 100% free
                  </p>
                  <span className="mt-5 rounded-full bg-gradient-to-r from-[#ff4d8d] to-[#ff1e8e] px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-[0_0_16px_rgba(255,30,142,0.6)]">
                    WATCH FREE
                  </span>
                </Link>
              ) : (
                <Link
                  key={ep.id}
                  href={ep.href}
                  className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#13131d] transition hover:-translate-y-1 hover:border-[#ff1e8e]/80"
                >
                  <SafePortrait
                    src={ep.image}
                    alt={ep.title}
                    className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#ff1e8e] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                    NEW EPISODES
                  </span>
                  <div className="absolute inset-x-3 bottom-3">
                    <span className="block text-sm font-extrabold text-white">{ep.title}</span>
                    <span className="text-xs text-[#ff8ac4]">{ep.companion}</span>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
