'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Lock,
  Flame,
  Play,
  ChevronRight,
  Check,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { LivePortraitVideo } from '@/components/LivePortraitVideo';

export interface ShowcaseCompanion {
  id: string;
  name: string;
  age: number;
  portrait: string;
  videoUrl?: string;
  fallbackPortrait?: string;
  category: 'Caucasian' | 'Latina' | 'Asian' | 'European' | 'South Asian' | 'Mixed';
  hair: 'Blonde' | 'Brunette' | 'Black' | 'Red' | 'Colorful';
  isNew?: boolean;
  isLive?: boolean;
  verified?: boolean;
  hasPrivate?: boolean;
  hasVideo?: boolean;
  hasVoice?: boolean;
  tagline: string;
  likes?: string;
  messages?: string;
  handle?: string;
}

const FALLBACK_PORTRAIT = '/portraits/nova.jpg';

/** Verified files confirmed inside `public/portraits/` in hampusi97/velvetmotion-ai */
export const SHOWCASE_COMPANIONS: ShowcaseCompanion[] = [
  {
    id: 'chloe',
    name: 'Chloe',
    age: 23,
    portrait: '/portraits/chloe.jpg',
    videoUrl: '/videos/chloe.mp4',
    category: 'Caucasian',
    hair: 'Brunette',
    isNew: true,
    isLive: true,
    verified: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'Your bubbly 23-year-old penthouse neighbor caught up late in silk loungewear...',
    likes: '543',
    messages: '158K',
    handle: '@velvet_ai',
  },
  {
    id: 'priya',
    name: 'Priya',
    age: 25,
    portrait: '/portraits/priya-v.jpg',
    videoUrl: '/videos/priya.mp4',
    category: 'South Asian',
    hair: 'Black',
    isNew: true,
    isLive: true,
    verified: true,
    hasVideo: true,
    hasPrivate: true,
    tagline: 'Playful, bold & unforgettable—waiting by the bedroom door after midnight...',
    likes: '412',
    messages: '94K',
    handle: '@velvet_ai',
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 27,
    portrait: '/portraits/elena.jpg',
    videoUrl: '/videos/elena.mp4',
    category: 'European',
    hair: 'Brunette',
    isNew: true,
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    tagline: 'Sultry velvet lounge regular who answers the door in only a towel and a smirk...',
    likes: '629',
    messages: '182K',
    handle: '@velvet_ai',
  },
  {
    id: 'delilah',
    name: 'Delilah',
    age: 21,
    portrait: '/portraits/delilah-v.jpg',
    videoUrl: '/videos/delilah.mp4',
    category: 'Mixed',
    hair: 'Colorful',
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'Neon café rebel who texts you daring mirror videos when she cannot sleep...',
    likes: '380',
    messages: '76K',
    handle: '@velvet_ai',
  },
  {
    id: 'suzu',
    name: 'Suzu',
    age: 21,
    portrait: '/portraits/suzu-m.jpg',
    videoUrl: '/videos/suzu.mp4',
    category: 'Asian',
    hair: 'Black',
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'Tokyo midnight arcade crush who pulls you into a private booth after hours...',
    likes: '495',
    messages: '124K',
    handle: '@velvet_ai',
  },
  {
    id: 'mia',
    name: 'Mia',
    age: 24,
    portrait: '/portraits/mia.jpg',
    videoUrl: '/videos/mia.mp4',
    category: 'Caucasian',
    hair: 'Blonde',
    isLive: true,
    verified: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'Sun-kissed blonde tease who flags you down for a spontaneous late-night ride...',
    likes: '718',
    messages: '210K',
    handle: '@velvet_ai',
  },
  {
    id: 'scarlett',
    name: 'Scarlett',
    age: 26,
    portrait: '/portraits/scarlett.jpg',
    videoUrl: '/videos/scarlett.mp4',
    category: 'Latina',
    hair: 'Black',
    isNew: true,
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    tagline: 'Midnight rooftop drinks turn into a private suite confession with zero filter...',
    likes: '512',
    messages: '143K',
    handle: '@velvet_ai',
  },
  {
    id: 'freya',
    name: 'Freya',
    age: 24,
    portrait: '/portraits/freya.jpg',
    videoUrl: '/videos/freya.mp4',
    category: 'European',
    hair: 'Blonde',
    isNew: true,
    isLive: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'Nordic charm after dark—soft whispers and bold eyes locked straight on yours...',
    likes: '344',
    messages: '68K',
    handle: '@velvet_ai',
  },
  {
    id: 'valentina',
    name: 'Valentina',
    age: 27,
    portrait: '/portraits/valentina.jpg',
    videoUrl: '/videos/valentina.mp4',
    category: 'Latina',
    hair: 'Brunette',
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    tagline: 'VIP lounge regular with a dangerous smile and a habit of getting her way...',
    likes: '467',
    messages: '119K',
    handle: '@velvet_ai',
  },
  {
    id: 'mila',
    name: 'Mila',
    age: 22,
    portrait: '/portraits/mila-s.jpg',
    videoUrl: '/videos/mila.mp4',
    category: 'European',
    hair: 'Blonde',
    isLive: true,
    hasPrivate: true,
    hasVideo: true,
    hasVoice: true,
    tagline: 'After-party whisperer who stays behind after everyone else leaves the loft...',
    likes: '391',
    messages: '89K',
    handle: '@velvet_ai',
  },
  {
    id: 'nova',
    name: 'Nova',
    age: 24,
    portrait: '/portraits/nova.jpg',
    videoUrl: '/videos/nova.mp4',
    category: 'Asian',
    hair: 'Black',
    isLive: true,
    verified: true,
    hasVideo: true,
    hasPrivate: true,
    tagline: 'Cyber-neon muse streaming live from her rain-lit high-rise bedroom...',
    likes: '842',
    messages: '264K',
    handle: '@velvet_ai',
  },
  {
    id: 'sloane',
    name: 'Sloane',
    age: 26,
    portrait: '/portraits/sloane.jpg',
    videoUrl: '/videos/sloane.mp4',
    category: 'Caucasian',
    hair: 'Brunette',
    isLive: true,
    hasPrivate: true,
    hasVoice: true,
    tagline: 'Sharp wit in public, completely unguarded the second the door clicks shut...',
    likes: '428',
    messages: '105K',
    handle: '@velvet_ai',
  },
];

const HERO_SLIDES = [
  {
    id: 'nova',
    eyebrow: 'VELVETMOTION ORIGINAL',
    title: 'Nova',
    subtitle: 'IS ONLINE NOW',
    caption: '100% Free · Editable Memory · Local RAM Ultra Mode',
    cta: 'Show me',
    href: '/chat/?companion=nova',
    image: '/portraits/nova.jpg',
  },
  {
    id: 'chloe',
    eyebrow: 'FEATURED TONIGHT',
    title: 'Chloe',
    subtitle: 'NEW SCENE DROPPED',
    caption: 'Instant selfies, live neural voice calls & zero message caps',
    cta: 'Chat now',
    href: '/chat/?companion=chloe',
    image: '/portraits/chloe.jpg',
  },
  {
    id: 'priya',
    eyebrow: '2-ON-1 GROUP DRAMA',
    title: 'Priya × Mia',
    subtitle: 'DOUBLE THE TROUBLE',
    caption: 'Drop into a live 3-way room where they compete for you',
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
    caption: 'Custom neon motion clips. Scene by scene.',
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
    title: 'LIVE VOICE',
    subtitle: '& CALLS',
    caption: 'Real-time neural voice calls & Guided Audio Studio.',
    href: '/chat/?companion=nova&call=1',
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

const FILTER_PILLS = ['All', 'Private Content', 'Caucasian', 'Latina', 'Asian', 'European', 'Blonde', 'Brunette'];

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
  const [filterSheet, setFilterSheet] = useState(false);

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
    return SHOWCASE_COMPANIONS.filter((c) => {
      const matchesQuery =
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.tagline.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Private Content') return Boolean(c.hasPrivate);
      if (activeFilter === 'Blonde' || activeFilter === 'Brunette') return c.hair === activeFilter;
      return c.category === activeFilter;
    });
  }, [query, activeFilter]);

  const activeHero = HERO_SLIDES[heroIdx] ?? HERO_SLIDES[0];

  // Build interleaved grid with Neon SHORTS card at index 2 and Private Content card at index 9
  const gridItems = useMemo(() => {
    const out: Array<
      | { type: 'companion'; data: ShowcaseCompanion }
      | { type: 'promo-shorts' }
      | { type: 'promo-private' }
    > = [];

    filtered.forEach((c, idx) => {
      if (idx === 2) out.push({ type: 'promo-shorts' });
      if (idx === 8) out.push({ type: 'promo-private' });
      out.push({ type: 'companion', data: c });
    });

    if (filtered.length > 0 && filtered.length <= 2) {
      out.push({ type: 'promo-shorts' });
    }
    return out;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#08080e] text-[#f7f7fc] pb-16">
      {/* FULL-BLEED CINEMATIC HERO CAROUSEL */}
      <section className="relative h-[300px] sm:h-[360px] w-full overflow-hidden rounded-b-3xl border-b border-white/5">
        <SafePortrait
          src={activeHero.image}
          alt={activeHero.title}
          className="absolute inset-0 h-full w-full object-cover object-top scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080e] via-[#08080e]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-transparent to-[#08080e]/30" />

        <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 max-w-xl pb-4">
          <span className="text-[11px] font-semibold tracking-[0.25em] text-[#00f5ff] drop-shadow-[0_0_8px_rgba(0,245,255,0.7)]">
            {activeHero.eyebrow}
          </span>
          <h1 className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,30,142,0.65)]">
            {activeHero.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-bold tracking-[0.28em] text-[#ff4d8d]">
            {activeHero.subtitle}
          </p>
          <p className="mt-2 text-sm text-[#c8c8de]">{activeHero.caption}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={activeHero.href}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#ff1e8e] to-[#ff4d8d] px-7 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,30,142,0.6)] hover:brightness-110 transition"
            >
              {activeHero.cta}
            </Link>
            <Link
              href="/download/"
              className="inline-flex items-center justify-center rounded-full border border-[#00f5ff]/40 bg-[#0d0d18]/75 px-5 py-2.5 text-xs font-semibold text-[#00f5ff] backdrop-blur-md hover:border-[#00f5ff] transition"
            >
              ⚡ Desktop Local Ultra
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
              aria-label={`Slide ${i + 1}`}
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
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              <span className="text-[#ff4d8d]">Explore</span>{' '}
              <span className="text-white">Featured Characters</span>
              <ChevronRight className="ml-1 inline h-5 w-5 text-white/50" />
            </h2>
            <Link
              href="/discover/"
              className="shrink-0 text-xs font-semibold text-[#00f5ff] hover:underline"
            >
              Play Discover Swipe →
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <button type="button" onClick={() => setFilterSheet(true)} className="lg:hidden shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white">Filters</button>
            <div className="hidden lg:flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar flex-1">
            <div className="relative min-w-[180px] sm:min-w-[210px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-white/10 bg-[#151520] py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-[#ff1e8e]"
              />
            </div>

            {FILTER_PILLS.map((pill) => {
              const active = activeFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
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
          </div>

          {/* 6-COLUMN PORTRAIT GRID WITH INTERLEAVED NEON PROMO TILES */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {gridItems.map((item) => {
              if (item.type === 'promo-shorts') {
                return (
                  <Link
                    key="promo-shorts"
                    href="/shorts/"
                    className="group relative flex aspect-[2/3] flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-[#a855f7]/80 bg-gradient-to-b from-[#1a0b2e] via-[#120b24] to-[#0b0718] p-4 shadow-[0_0_24px_rgba(168,85,247,0.45)] transition hover:-translate-y-1"
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
                    className="group relative flex aspect-[2/3] flex-col items-center justify-between overflow-hidden rounded-2xl border border-[#ff1e8e]/70 bg-[#140b18] p-4 shadow-[0_0_22px_rgba(255,30,142,0.35)] transition hover:-translate-y-1"
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
                <Link
                  key={c.id}
                  href={`/chat/?companion=${c.id}`}
                  className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#13131d] transition duration-300 hover:-translate-y-1 hover:border-[#ff1e8e]/75 hover:shadow-[0_0_24px_rgba(255,30,142,0.32)]"
                >
                  <LivePortraitVideo
                    src={c.portrait}
                    companionId={c.id}
                    videoUrl={c.videoUrl}
                    alt={`${c.name}, ${c.age}`}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                  {/* Top-Left LIVE Video Pill */}
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#ff2a7a]/95 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_0_12px_rgba(255,42,122,0.75)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>

                  {/* Top-Right Circular Pink Video Play Badge */}
                  <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#ff2a7a] text-white shadow-[0_0_14px_rgba(255,42,122,0.8)] transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
                  </span>

                  {/* Bottom Identity + Story Teaser + Engagement Stats Bar */}
                  <div className="absolute inset-x-3 bottom-2.5 space-y-1">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="truncate text-lg font-extrabold tracking-tight text-white">
                        {c.name}
                      </span>
                      <span className="text-base font-extrabold text-[#ff3b8b]">{c.age}</span>
                      {c.verified && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff1e8e] text-white self-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-2 text-[11px] leading-snug text-white/80">
                      {c.tagline}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-white/75">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3 text-white/80" /> {c.likes || '420'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-white/80" /> {c.messages || '95K'}
                        </span>
                      </div>
                      <span className="truncate text-[10px] text-white/55">{c.handle || '@velvet_ai'}</span>
                    </div>
                  </div>
                </Link>
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
                  className="group relative flex aspect-[2/3] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#ff1e8e]/60 bg-gradient-to-b from-[#1f0c18] to-[#0e0912] p-5 text-center shadow-[0_0_24px_rgba(255,30,142,0.28)] transition hover:-translate-y-1"
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
                  <LivePortraitVideo
                    src={ep.image}
                    alt={ep.title}
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
      {filterSheet && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setFilterSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-[#141418] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filters</p>
              <button type="button" onClick={() => setFilterSheet(false)} className="text-zinc-400">✕</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_PILLS.map((pill) => (
                <button key={pill} type="button" onClick={() => { setActiveFilter(pill); setFilterSheet(false); }} className={`rounded-full px-4 py-2 text-xs font-semibold ${activeFilter === pill ? 'bg-pink-500 text-white' : 'border border-white/15 text-zinc-300'}`}>{pill}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
