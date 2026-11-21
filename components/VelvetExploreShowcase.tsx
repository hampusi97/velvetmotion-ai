'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clapperboard, Heart, LockKeyhole, Play, Search, X } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { FLAGSHIP_COMPANIONS } from '@/data/companions';
import { safeCompanionAvatarUrl } from '@/lib/avatarOptimize';
import { allCharacters, CHARACTERS, type Character } from '@/lib/characters';
import { discoverCompanions, discoveryFor } from '@/lib/companionDiscovery';
import {
  COMPANION_LIBRARY_EVENT,
  loadFavoriteCompanions,
  toggleFavoriteCompanion,
} from '@/lib/companionLibrary';
import { staticPortraitUrl } from '@/lib/portraitFallback';

const PAGE_SIZE = 8;
const flagshipProfiles = new Map(FLAGSHIP_COMPANIONS.map((profile) => [profile.id, profile]));

const heroSlides = [
  {
    tab: 'Discover',
    title: 'Good company after hours',
    description: 'Meet fictional AI companions with different personalities, stories, and styles.',
    action: 'Find a match',
    href: '/discover/',
    companionId: 'nadine-okoye',
  },
  {
    tab: 'Chat',
    title: 'An evening with Chloe',
    description: 'Start a conversation with a warm, witty companion who feels right at home after midnight.',
    action: 'Chat with Chloe',
    href: '/chat/?companion=chloe-parker',
    companionId: 'chloe-parker',
  },
  {
    tab: 'Studio',
    title: 'Make a scene your own',
    description: 'Create a portrait or animate a still in Studio. AI video uses a connected video model.',
    action: 'Open Studio',
    href: '/studio/',
    companionId: 'nova-park',
  },
] as const;

const quickFilters = ['All', 'New arrivals', 'Saved', 'Private Content'] as const;
const styleFilters = ['Anime', 'Goth', 'Cyberpunk', 'Caucasian', 'Latina', 'Asian', 'European', 'Blonde', 'Brunette'] as const;
type Filter = (typeof quickFilters)[number] | (typeof styleFilters)[number];

// Appearance filters read the character's authored description.
const appearanceFilters = {
  Caucasian: /\b(?:caucasian|white woman)\b/i,
  Latina: /\b(?:latina|latino|latinx|mexican|colombian|brazilian|puerto rican|argentine|chilean)\b/i,
  Asian: /\b(?:asian|japanese|korean|chinese|filipina|vietnamese|thai|indian|taiwanese)\b/i,
  European: /\b(?:european|french|italian|scandinavian|nordic|swedish|british|german|portuguese|spanish)\b/i,
  Blonde: /\b(?:blonde|blond|platinum hair)\b/i,
  Brunette: /\b(?:brunette|chestnut|(?:brown|espresso) (?:hair|bob|curls|waves))\b/i,
};

function matchesFilter(character: Character, filter: Filter, favorites: string[]): boolean {
  switch (filter) {
    case 'All': return true;
    case 'New arrivals': return character.tags.some((tag) => tag.toLowerCase() === 'new');
    case 'Saved': return favorites.includes(character.id);
    case 'Private Content': return flagshipProfiles.get(character.id)?.isPrivate === true;
    case 'Anime': return character.category === 'Anime' || discoveryFor(character).visualStyle === 'Anime';
    case 'Goth':
    case 'Cyberpunk': return character.category === filter;
    default: return appearanceFilters[filter].test(character.visualDna || character.figure);
  }
}

function portraitFor(character: Character): string {
  return safeCompanionAvatarUrl(character.avatar) || staticPortraitUrl(character.id);
}

const experiences = [
  { title: 'Media Studio', description: 'Create portraits and motion clips.', href: '/studio/', companionId: 'nova-park', Icon: Clapperboard },
  { title: 'Velvet Shorts', description: 'Watch scenes and jump into chat.', href: '/shorts/', companionId: 'raven-vance', Icon: Play },
  { title: 'Private Content', description: 'Browse the 18+ collection.', href: '/private/', companionId: 'sloane-kensington', Icon: LockKeyhole },
] as const;

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4bcaa]';
const primaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f3c5b3] px-5 py-2.5 text-sm font-semibold text-[#301923] hover:bg-[#ffdbcc] motion-safe:transition-colors ${focusRing}`;
const secondaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#edbcac]/30 bg-[#211623]/75 px-5 py-2.5 text-sm font-semibold text-[#fae5dd] hover:border-[#edbcac]/70 hover:bg-[#372331] motion-safe:transition-colors ${focusRing}`;

export default function VelvetExploreShowcase({ returning }: { returning?: ReactNode }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [characters, setCharacters] = useState(CHARACTERS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const refreshLibrary = () => {
      setCharacters(allCharacters());
      setFavorites(loadFavoriteCompanions());
    };
    const onStyleTab = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      if (tab === 'anime') setActiveFilter('Anime');
      else if (tab === 'all' || tab === 'girls') setActiveFilter('All');
      else return;
      setVisibleCount(PAGE_SIZE);
    };
    refreshLibrary();
    window.addEventListener(COMPANION_LIBRARY_EVENT, refreshLibrary);
    window.addEventListener('storage', refreshLibrary);
    window.addEventListener('vm:style-tab', onStyleTab);
    return () => {
      window.removeEventListener(COMPANION_LIBRARY_EVENT, refreshLibrary);
      window.removeEventListener('storage', refreshLibrary);
      window.removeEventListener('vm:style-tab', onStyleTab);
    };
  }, []);

  const filtered = useMemo(
    () => discoverCompanions(characters, { query }).filter((character) => matchesFilter(character, activeFilter, favorites)),
    [characters, query, activeFilter, favorites],
  );
  const visible = filtered.slice(0, visibleCount);
  const hero = heroSlides[heroIndex] ?? heroSlides[0];
  const heroCharacter = characters.find((character) => character.id === hero.companionId);
  const selectFilter = (filter: Filter) => {
    setActiveFilter(filter);
    setVisibleCount(PAGE_SIZE);
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  };
  const saveCompanion = (id: string) => {
    try {
      setFavorites(toggleFavoriteCompanion(id));
      setSaveError('');
    } catch {
      setSaveError('Could not update saved companions. Check your browser storage and try again.');
    }
  };

  return (
    <div className="bg-[#100d14] pb-12 text-[#fff3ed]">
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-7 sm:pt-6">
        <section aria-label="Featured experiences" className="relative isolate overflow-hidden rounded-[1.4rem] border border-[#e9b5a5]/20 bg-[#211421] shadow-[0_18px_42px_-29px_#000] sm:rounded-[1.8rem]">
          <SafeImage
            key={hero.companionId}
            src={heroCharacter ? portraitFor(heroCharacter) : staticPortraitUrl(hero.companionId)}
            alt=""
            fetchPriority={heroIndex === 0 ? 'high' : 'auto'}
            className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[58%_30%] sm:w-[58%] sm:object-[center_31%]"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(33,20,33,.97)_1%,rgba(33,20,33,.8)_30%,rgba(33,20,33,.15)_96%),linear-gradient(0deg,#211421_0%,transparent_54%)] sm:bg-[linear-gradient(90deg,#211421_0%,#211421_32%,rgba(33,20,33,.92)_43%,rgba(33,20,33,.17)_77%),linear-gradient(0deg,#211421_0%,transparent_44%)]" />

          <div className="flex min-h-[340px] flex-col justify-between px-5 pb-4 pt-8 sm:min-h-[395px] sm:px-9 sm:pb-6 sm:pt-12 xl:min-h-[430px] xl:px-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.2em] text-[#f1baa6]">VelvetMotion</p>
              <h1 className="mt-3 max-w-[12ch] text-balance font-display text-[clamp(2.55rem,5.5vw,5rem)] font-normal leading-[.97] tracking-[-.055em]">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-[31ch] text-sm leading-relaxed text-[#f0d9d7] sm:text-base">{hero.description}</p>
              <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
                <Link href={hero.href} className={primaryButton}>
                  {hero.action}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
                <Link href={hero.tab === 'Studio' ? '/shorts/' : '/studio/'} className={secondaryButton}>
                  {hero.tab === 'Studio' ? 'Watch Shorts' : 'Open Studio'}
                </Link>
              </div>
            </div>

            <div role="group" aria-label="Choose a featured experience" className="mt-5 flex w-fit max-w-full divide-x divide-[#f4bcaa]/20 rounded-full border border-[#f4bcaa]/25 bg-[#211421]/85">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.tab}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  aria-pressed={index === heroIndex}
                  className={`min-h-10 px-3.5 text-xs first:rounded-l-full last:rounded-r-full sm:px-5 ${focusRing} ${index === heroIndex ? 'bg-[#f3c5b3]/20 font-semibold text-[#fff1e7]' : 'text-[#e4c8ca] hover:bg-[#f3c5b3]/10'}`}
                >
                  {slide.tab}
                </button>
              ))}
            </div>
          </div>
        </section>

        {returning}

        <section aria-labelledby="explore-cast-heading" className="mt-9 sm:mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#ebbaac]/15 pb-3">
            <h2 id="explore-cast-heading" className="font-display text-3xl font-normal tracking-[-.04em] sm:text-4xl">Find your companion</h2>
            <Link href="/companions/" className={`inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-[#f1b9aa] hover:text-[#ffe0d4] ${focusRing}`}>
              Companion Library
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-2.5 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c59da6]" />
              <input
                type="search"
                aria-label="Search companions"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Name, personality, or interest"
                className={`h-11 w-full min-w-0 rounded-xl border border-[#e6b5a4]/20 bg-[#211623] pl-10 pr-10 text-sm text-[#fff3ee] placeholder:text-[#c6a2ad] [&::-webkit-search-cancel-button]:hidden ${focusRing}`}
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => updateQuery('')} className={`absolute inset-y-0 right-1.5 my-1 inline-flex w-8 items-center justify-center rounded-lg text-[#edc1bb] hover:bg-[#f1c5b6]/10 ${focusRing}`}>
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={activeFilter === filter}
                  onClick={() => selectFilter(filter)}
                  className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold sm:px-4 ${focusRing} ${activeFilter === filter ? 'border-[#f3c5b3]/55 bg-[#f3c5b3]/15 text-[#ffe6dc]' : 'border-[#e6b5a4]/20 bg-[#211623] text-[#edd1cf] hover:border-[#edbcac]/60'}`}
                >
                  {filter}
                </button>
              ))}
              <select
                aria-label="More companion filters"
                value={styleFilters.find((filter) => filter === activeFilter) ?? ''}
                onChange={(event) => selectFilter(styleFilters.find((filter) => filter === event.target.value) ?? 'All')}
                className={`min-h-10 max-w-full rounded-full border border-[#e6b5a4]/25 bg-[#211623] px-3 text-xs font-semibold text-[#edd1cf] ${focusRing}`}
              >
                <option value="">More filters</option>
                {styleFilters.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
              </select>
            </div>
          </div>

          <p role="status" className="mt-3.5 text-xs text-[#d3afb8]">
            {visible.length === filtered.length ? `${filtered.length} companions` : `Showing ${visible.length} of ${filtered.length} companions`}
          </p>
          {saveError && <p role="alert" className="mt-2 text-sm text-rose-200">{saveError}</p>}

          {visible.length ? (
            <>
              <ul aria-label="Companion portraits" className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
                {visible.map((character) => {
                  const saved = favorites.includes(character.id);
                  const isNew = character.tags.some((tag) => tag.toLowerCase() === 'new');
                  return (
                    <li key={character.id} className="group relative min-w-0">
                      <Link
                        href={`/chat/?companion=${encodeURIComponent(character.id)}`}
                        aria-label={`Chat with ${character.name}, ${character.age}`}
                        className={`block h-full overflow-hidden rounded-2xl border border-[#edbcac]/15 bg-[#211623] hover:border-[#edbcac]/45 motion-safe:transition-colors ${focusRing}`}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden bg-[#2b1a2a] sm:aspect-[4/5]">
                          <SafeImage src={portraitFor(character)} alt="" fallbackId={character.id} loading="lazy" className="h-full w-full object-cover object-top motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.035]" />
                          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1b0f19]/45 via-transparent to-[#180d1a]/20" />
                          {isNew && <span className="absolute left-2 top-2 rounded-full bg-[#2c1b27]/90 px-2 py-1 text-[10px] font-semibold text-[#fff0e8]">New</span>}
                        </div>
                        <div className="min-h-[5.2rem] px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex min-w-0 items-baseline gap-1.5">
                            <span className="truncate font-display text-[1.1rem] tracking-tight sm:text-xl">{character.name}</span>
                            <span className="shrink-0 text-xs text-[#ddb1b7]">{character.age}</span>
                            <ArrowUpRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 shrink-0 text-[#eac1ad]" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#d9b8bd]">{character.tagline}</p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        aria-label={saved ? `Remove ${character.name} from favorites` : `Save ${character.name} to favorites`}
                        aria-pressed={saved}
                        onClick={() => saveCompanion(character.id)}
                        className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#efd1c5]/30 bg-[#281824]/90 text-[#ffeddf] hover:bg-[#542b3e] ${focusRing}`}
                      >
                        <Heart aria-hidden="true" className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {visible.length < filtered.length && (
                <div className="mt-5 text-center">
                  <button className={secondaryButton} type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    Show more companions
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3.5 rounded-2xl border border-dashed border-[#edbcac]/25 bg-[#211623] px-5 py-8 text-center">
              <h3 className="font-display text-xl">{activeFilter === 'Saved' && !favorites.length ? 'No saved companions yet' : 'No companions match these filters'}</h3>
              {activeFilter === 'Saved' && !favorites.length && <p className="mt-1 text-sm text-[#dfbec2]">Save a companion with the heart on their card.</p>}
              <button type="button" className={`mt-4 ${secondaryButton}`} onClick={() => { updateQuery(''); selectFilter('All'); }}>Clear filters</button>
            </div>
          )}
        </section>

        <section aria-labelledby="explore-tools-heading" className="mt-12 sm:mt-16">
          <h2 id="explore-tools-heading" className="font-display text-3xl font-normal tracking-[-.04em] sm:text-4xl">Make it yours</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {experiences.map(({ title, description, href, companionId, Icon }) => (
              <Link key={href} href={href} className={`relative isolate flex min-h-36 min-w-0 items-end overflow-hidden rounded-2xl border border-[#edbcac]/20 bg-[#241625] p-4 hover:border-[#edbcac]/55 motion-safe:transition-colors sm:min-h-44 ${focusRing}`}>
                <SafeImage src={staticPortraitUrl(companionId)} alt="" loading="lazy" className="absolute inset-y-0 right-0 -z-20 h-full w-[68%] object-cover object-[center_31%]" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#241625_8%,rgba(36,22,37,.9)_39%,rgba(36,22,37,.16)),linear-gradient(0deg,#241625_1%,transparent_69%)]" />
                <div>
                  <Icon aria-hidden="true" className="mb-2 h-4 w-4 text-[#f3c5b3]" />
                  <span className="block font-display text-xl tracking-tight">{title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#f0d6d8]">{description}</span>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-[#ffe2d8]" />
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            {([
              ['Create a companion', '/create/'],
              ['Interracial stories', '/?view=packs&theme=interracial'],
              ['Guided audio', '/joi/'],
              ['Group chat', '/group/'],
            ] as const).map(([label, href]) => (
              <Link key={href} href={href} className={`inline-flex min-h-10 items-center gap-1.5 rounded text-sm font-medium text-[#ebbcaf] hover:text-[#ffe1d3] ${focusRing}`}>
                {label}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
