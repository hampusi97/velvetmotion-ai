'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Camera,
  Film,
  LockKeyhole,
  Play,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import {
  AFTER_DARK_COMPANIONS,
  ARCHETYPE_COMPANIONS,
  COMPANION_ARCHETYPE_FILTERS,
  FLAGSHIP_COMPANIONS,
  type CompanionCategory,
} from '@/data/companions';
import { CHARACTERS } from '@/lib/characters';

type Appearance = {
  category?: 'Caucasian' | 'Black' | 'Latina' | 'Asian' | 'European' | 'South Asian' | 'Mixed';
  hair?: 'Blonde' | 'Brunette' | 'Black' | 'Red' | 'Colorful';
};

export interface ShowcaseCompanion extends Appearance {
  id: string;
  name: string;
  age: number;
  portrait: string;
  isNew?: boolean;
  hasPrivate?: boolean;
  tagline: string;
  role?: string;
  archetypeCategory?: CompanionCategory;
}

const FLAGSHIP_APPEARANCES: Partial<Record<string, Appearance>> = {
  'nadia-morrow': { hair: 'Red' },
  'daphne-shaw': { hair: 'Blonde' },
  'camille-laurent': { hair: 'Brunette' },
  'inez-mercado': { hair: 'Black' },
  'simone-adeyemi': { hair: 'Black' },
  'selene-vega': { hair: 'Black' },
  'romy-bell': { hair: 'Red' },
  'talia-james': { hair: 'Black' },
  'dani-reyes': { hair: 'Brunette' },
  'elara-shah': { hair: 'Black' },
  'beck-carver': { hair: 'Blonde' },
  'mara-graves': { hair: 'Black' },
  'vesna-nox': { hair: 'Red' },
  'blair-hartwell': { hair: 'Blonde' },
  'rowan-mercer': { hair: 'Black' },
  'jade-aster': { hair: 'Black' },
  'morgan-ellis': { hair: 'Red' },
  'veda-kane': { hair: 'Black' },
  'noor-mansour': { hair: 'Black' },
  'juno-aimes': { hair: 'Black' },
  'imani-reed': { category: 'Black', hair: 'Black' },
  'renata-costa': { category: 'Latina', hair: 'Brunette' },
  'celeste-voss': { hair: 'Black' },
  'chloe-parker': { category: 'Caucasian', hair: 'Brunette' },
  'sloane-kensington': { hair: 'Black' },
  'raven-vance': { hair: 'Black' },
  'sora-takahashi': { category: 'Asian' },
  'yumi-chen': { category: 'Asian' },
};

const LEGACY_APPEARANCES: Record<string, Appearance & Pick<ShowcaseCompanion, 'hasPrivate'>> = {
  priya: { category: 'South Asian', hair: 'Black', hasPrivate: true },
  elena: { category: 'European', hair: 'Brunette', hasPrivate: true },
  'anime-yumi': { category: 'Asian', hair: 'Black', hasPrivate: true },
  'blondie-m': { category: 'Caucasian', hair: 'Blonde' },
  scarlett: { category: 'Latina', hair: 'Black', hasPrivate: true },
  freya: { category: 'European', hair: 'Blonde' },
  valentina: { category: 'Latina', hair: 'Brunette', hasPrivate: true },
  nova: { hair: 'Black', hasPrivate: true },
  'sloane-v': { hair: 'Brunette', hasPrivate: true },
};

const afterHoursIds = new Set(AFTER_DARK_COMPANIONS.map(({ id }) => id));
const featuredProfiles = [...ARCHETYPE_COMPANIONS, ...AFTER_DARK_COMPANIONS];
const featuredIds = new Set(featuredProfiles.map(({ id }) => id));
const flagshipProfiles = [
  ...featuredProfiles,
  ...FLAGSHIP_COMPANIONS.filter(({ id }) => !featuredIds.has(id)),
];
const adultSceneIds = new Set(FLAGSHIP_COMPANIONS
  .filter(({ sceneSelfiePresets }) => sceneSelfiePresets.some(({ nsfw }) => nsfw))
  .map(({ id }) => id));

export const SHOWCASE_COMPANIONS: ShowcaseCompanion[] = [
  ...flagshipProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    portrait: profile.portraitUrl,
    ...FLAGSHIP_APPEARANCES[profile.id],
    isNew: profile.isNew,
    hasPrivate: profile.isPrivate,
    archetypeCategory: profile.category,
    role: profile.archetype,
    tagline: profile.tagline,
  })),
  ...CHARACTERS.filter(({ id }) => Object.hasOwn(LEGACY_APPEARANCES, id)).map((profile) => ({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    portrait: profile.avatar,
    tagline: profile.tagline,
    ...LEGACY_APPEARANCES[profile.id],
  })),
];

const HERO_SLIDES = [
  {
    label: 'Match Lounge',
    eyebrow: 'The Private Atelier',
    title: 'Companions after dark',
    caption: 'Chat with fictional AI companions, find a match, or create a scene of your own.',
    cta: 'Find a match',
    href: '/discover/',
    image: '/promos/match-lounge.webp',
    position: 'object-[87%_42%] sm:object-[70%_38%]',
  },
  {
    label: 'Chloe',
    eyebrow: 'Featured companion',
    title: 'An evening with Chloe',
    caption: 'Pick up a conversation with a warm, playful late-night confidante.',
    cta: 'Chat with Chloe',
    href: '/chat/?companion=chloe-parker',
    image: '/portraits/chloe-parker.webp',
    position: 'object-[64%_32%] sm:object-[center_32%]',
  },
  {
    label: 'Group chat',
    eyebrow: 'Group chat',
    title: 'Priya & Maya',
    caption: 'Start a shared scene with two distinct companion personalities.',
    cta: 'Enter group chat',
    href: '/group/',
    image: '/portraits/priya-v.jpg',
    position: 'object-[66%_28%] sm:object-[center_28%]',
  },
];

const studioTools = [
  { title: 'Photo Studio', caption: 'Create portraits and scene stills.', href: '/studio/', image: '/portraits/veda-kane.webp', icon: Camera },
  { title: 'Video Studio', caption: 'Animate a still or connect a video model.', href: '/studio/?mode=video', image: '/portraits/elara-shah.webp', icon: Film },
  { title: 'Guided audio', caption: 'Play a session or write your own script.', href: '/joi/', image: '/portraits/imani-reed.webp', icon: AudioLines },
];

const moreToExplore = [
  { title: 'Create a companion', href: '/create/', icon: Plus },
  { title: 'Private Content', href: '/private/', icon: LockKeyhole },
  { title: 'Velvet Shorts', href: '/shorts/', icon: Play },
];

const PRIMARY_FILTERS = [
  'All', 'New arrivals', '18+ Scenes', 'After Hours', ...COMPANION_ARCHETYPE_FILTERS, 'Private Content',
];
const MORE_FILTERS = ['Anime', 'Caucasian', 'Black', 'Latina', 'Asian', 'European', 'Blonde', 'Brunette'];
const PAGE_SIZE = 12;

const focusStyle = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edbfae]';
const primaryAction = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f1c9b7] px-5 py-2.5 text-sm font-semibold text-[#291720] hover:bg-[#ffe1d4] motion-safe:transition-colors ${focusStyle}`;
const secondaryAction = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f6d9cc]/25 bg-[#1a1017]/80 px-5 py-2.5 text-sm font-medium text-[#f8e7de] hover:border-[#edbfae]/60 hover:bg-[#302029] motion-safe:transition-colors ${focusStyle}`;

export default function VelvetExploreShowcase() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const onStyleTab = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      if (tab === 'anime' || tab === 'all' || tab === 'girls') {
        setActiveFilter(tab === 'anime' ? 'Anime' : 'All');
        setVisibleCount(PAGE_SIZE);
      }
    };
    window.addEventListener('vm:style-tab', onStyleTab);
    return () => window.removeEventListener('vm:style-tab', onStyleTab);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase().replace(/\bstep[- ]*daughters?\b/g, 'stepdaughter');
    return SHOWCASE_COMPANIONS.filter((companion) => {
      const matchesQuery = !search ||
        [companion.name, companion.tagline, companion.role, companion.archetypeCategory]
          .some((value) => value?.toLowerCase().includes(search));
      if (!matchesQuery) return false;
      if (activeFilter === 'All') return true;
      if (activeFilter === '18+ Scenes') return adultSceneIds.has(companion.id);
      if (activeFilter === 'New arrivals') return Boolean(companion.isNew);
      if (activeFilter === 'After Hours') return afterHoursIds.has(companion.id);
      if (activeFilter === 'Private Content') return Boolean(companion.hasPrivate);
      if (activeFilter === 'Blonde' || activeFilter === 'Brunette') return companion.hair === activeFilter;
      return companion.category === activeFilter || companion.archetypeCategory === activeFilter;
    });
  }, [query, activeFilter]);

  const selectFilter = (filter: string) => {
    setActiveFilter(filter);
    setVisibleCount(PAGE_SIZE);
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  const hero = HERO_SLIDES[heroIndex];
  const visibleCast = filtered.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-[#100c12] text-[#f8eeeb]">
      <div className="mx-auto max-w-[1500px] px-4 pb-14 pt-4 sm:px-7 sm:pt-6 xl:px-9">
        <section aria-label="Featured experiences" className="relative isolate overflow-hidden rounded-[1.35rem] border border-[#e5baa8]/20 bg-[#1a1018] shadow-[0_24px_60px_-34px_#000] sm:rounded-[1.8rem]">
          <SafeImage
            key={hero.image}
            src={hero.image}
            fallbackSrc="/promos/match-lounge.webp"
            alt=""
            fetchPriority={heroIndex === 0 ? 'high' : 'auto'}
            className={`absolute inset-y-0 right-0 -z-20 h-full w-full object-cover sm:w-[68%] ${hero.position}`}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#1a1018_0%,#1a1018_28%,rgba(26,16,24,.89)_43%,rgba(26,16,24,.18)_77%),linear-gradient(0deg,#1a1018_1%,transparent_48%)] max-sm:bg-[linear-gradient(90deg,rgba(26,16,24,.96),rgba(26,16,24,.76)_46%,rgba(26,16,24,.2)),linear-gradient(0deg,#1a1018_1%,transparent_60%)]" />

          <div className="flex min-h-[390px] flex-col justify-between px-5 pb-4 pt-10 sm:min-h-[440px] sm:px-9 sm:pb-5 sm:pt-14 xl:min-h-[475px] xl:px-12">
            <div className="max-w-full">
              <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e7b3a3]">{hero.eyebrow}</p>
              <h1 className="mt-3 max-w-[11ch] font-display text-[clamp(2.7rem,6vw,5.3rem)] font-normal leading-[.97] tracking-[-.065em] text-[#fff1ec]">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-[#ead8d6] sm:mt-5 sm:text-base">{hero.caption}</p>
              <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6">
                <Link href={hero.href} className={primaryAction}>
                  {hero.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/studio/" className={secondaryAction}>
                  Open Studio
                </Link>
              </div>
            </div>

            <div role="group" aria-label="Choose a featured experience" className="mt-5 flex w-max max-w-full divide-x divide-[#e5baa8]/15 overflow-hidden rounded-full border border-[#e5baa8]/20 bg-[#1a1018]/85">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  aria-pressed={heroIndex === index}
                  onClick={() => setHeroIndex(index)}
                  className={`min-h-11 shrink-0 px-3 text-xs motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#edbfae] sm:px-5 ${heroIndex === index
                    ? 'bg-[#dfb2a3]/15 font-semibold text-[#ffe0d2]'
                    : 'text-[#d4bfbe] hover:bg-[#dfb2a3]/10 hover:text-[#ffe0d2]'}`}
                >
                  {slide.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cast-heading" className="mt-9 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[#e5baa8]/15 pb-4">
            <h2 id="cast-heading" className="font-display text-[2rem] font-normal leading-none tracking-[-.055em] text-[#fff1ec] sm:text-[2.85rem]">Meet the cast</h2>
            <Link href="/discover/" className={`inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-[#f0bbaa] hover:text-[#ffded1] sm:text-sm ${focusStyle}`}>
              Open Match Lounge
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2 xl:flex-row xl:items-start">
            <div role="search" className="relative min-w-0 xl:w-52 xl:shrink-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c9aaa9]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                aria-label="Search companions"
                inputMode="search"
                placeholder="Name or personality"
                className="h-11 w-full rounded-xl border border-[#e5baa8]/20 bg-[#1a121b] pl-10 pr-10 text-sm text-[#fff1ec] placeholder:text-[#baa4a7] focus:border-[#edbfae] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#edbfae]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#e5c4bb] hover:bg-[#33212c] focus-visible:outline focus-visible:outline-[#edbfae]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div role="group" aria-label="Filter companions" className="flex w-full min-w-0 items-center gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap">
              {PRIMARY_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={activeFilter === filter}
                  onClick={() => selectFilter(filter)}
                  className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium motion-safe:transition-colors ${focusStyle} ${activeFilter === filter
                    ? 'border-[#edbfae]/55 bg-[#edbfae]/15 text-[#ffe3d7]'
                    : 'border-[#e5baa8]/15 bg-[#1b121c] text-[#dcc9ca] hover:border-[#edbfae]/40 hover:text-[#fff1ec]'}`}
                >
                  {filter}
                </button>
              ))}
              <select
                aria-label="More companion filters"
                value={MORE_FILTERS.includes(activeFilter) ? activeFilter : ''}
                onChange={(event) => selectFilter(event.target.value || 'All')}
                className={`min-h-10 shrink-0 rounded-full border border-[#e5baa8]/20 bg-[#1b121c] px-3 text-xs font-medium text-[#dcc9ca] ${focusStyle}`}
              >
                <option value="">More filters</option>
                {MORE_FILTERS.map((filter) => <option value={filter} key={filter}>{filter}</option>)}
              </select>
            </div>
          </div>

          <p role="status" className="mt-3 text-xs text-[#c4aeb3]">
            {filtered.length === 0
              ? 'No companions match your search.'
              : `Showing ${visibleCast.length} of ${filtered.length} ${filtered.length === 1 ? 'companion' : 'companions'}`}
          </p>
          {filtered.length > 0 && (
            <ul aria-label="Companion portraits" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
              {visibleCast.map((companion) => (
                <li key={companion.id} className="relative min-w-0">
                  <Link
                    href={`/chat/?companion=${companion.id}`}
                    aria-label={`Chat with ${companion.name}, ${companion.age}`}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5baa8]/15 bg-[#1d131d] hover:border-[#edbfae]/50 motion-safe:transition-colors ${focusStyle}`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#221720]">
                      <SafeImage
                        src={companion.portrait}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
                      />
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#150c16]/55 via-transparent to-transparent" />
                    </div>
                    {companion.isNew && (
                      <span className="absolute left-2.5 top-2.5 rounded-full border border-[#edbfae]/35 bg-[#241423]/95 px-2.5 py-1 text-[10px] font-semibold text-[#fde0d4]">
                        New
                      </span>
                    )}
                    <div className="flex flex-1 items-start justify-between gap-1.5 px-3 pb-3 pt-2.5">
                      <div className="min-w-0">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate font-display text-[1.2rem] leading-tight tracking-[-.035em] text-[#fff1ec]">{companion.name}</span>
                          <span className="shrink-0 text-[11px] text-[#d9b9b5]">{companion.age}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-[1.35] text-[#cbb8bc]">{companion.role || companion.tagline}</span>
                      </div>
                      <ArrowUpRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ddb4a6] group-hover:text-[#fff1ec]" />
                    </div>
                  </Link>
                  {companion.role && (
                    <Link
                      href={`/studio/?companion=${companion.id}&mode=video`}
                      aria-label={`Create a video with ${companion.name}`}
                      className={`absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#edbfae]/35 bg-[#241423]/95 text-[#ffe0d2] hover:border-[#edbfae]/65 hover:bg-[#412538] ${focusStyle}`}
                    >
                      <Film className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {filtered.length > visibleCount && (
            <div className="mt-5 flex justify-center">
              <button type="button" className={secondaryAction} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more companions
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="studio-heading" className="mt-12 sm:mt-16">
          <h2 id="studio-heading" className="border-b border-[#e5baa8]/15 pb-4 font-display text-[2rem] font-normal leading-none tracking-[-.055em] text-[#fff1ec] sm:text-[2.85rem]">Studio & audio</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
            {studioTools.map(({ title, caption, href, image, icon: Icon }) => (
              <Link key={title} href={href} className={`group relative isolate flex min-h-[9rem] min-w-0 items-end overflow-hidden rounded-2xl border border-[#e5baa8]/15 bg-[#20141f] p-4 hover:border-[#edbfae]/50 motion-safe:transition-colors sm:min-h-[11rem] ${focusStyle}`}>
                <SafeImage
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-y-0 right-0 -z-20 h-full w-[56%] object-cover object-[center_27%] motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
                />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#20141f_30%,rgba(32,20,31,.9)_54%,rgba(32,20,31,.25)),linear-gradient(0deg,#20141f_0%,transparent_70%)]" />
                <div className="min-w-0">
                  <Icon className="mb-2 h-4 w-4 text-[#edbfae]" aria-hidden="true" />
                  <h3 className="font-display text-xl leading-tight tracking-[-.035em] text-[#fff1ec]">{title}</h3>
                  <p className="mt-1 max-w-[23ch] text-xs leading-relaxed text-[#dfc9c7]">{caption}</p>
                </div>
                <ArrowUpRight className="absolute right-3.5 top-3.5 h-4 w-4 text-[#f1c9b7]" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div aria-label="More experiences" className="mt-4 grid gap-2 sm:grid-cols-3">
            {moreToExplore.map(({ title, href, icon: Icon }) => (
              <Link key={title} href={href} className={`flex min-h-11 items-center gap-2.5 rounded-xl border border-[#e5baa8]/15 bg-[#1a121b] px-3.5 py-2 text-sm text-[#f0ddda] hover:border-[#edbfae]/45 motion-safe:transition-colors ${focusStyle}`}>
                <Icon className="h-4 w-4 shrink-0 text-[#edbfae]" aria-hidden="true" />
                {title}
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#d8a99c]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
