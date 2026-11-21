"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Heart,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { allCharacters, CHARACTERS, type Character } from "@/lib/characters";
import {
  COMPANION_LIBRARY_EVENT,
  loadFavoriteCompanions,
  toggleFavoriteCompanion,
} from "@/lib/companionLibrary";
import {
  CONVERSATION_TYPES,
  VISUAL_STYLES,
  discoveryFor,
  discoverCompanions,
} from "@/lib/companionDiscovery";
import { CandyGirlCard } from "@/components/CandyGirlCard";
import { SafeImage } from "@/components/SafeImage";

interface CharacterRosterProps {
  romanceMode: boolean;
  query: string;
  category: string;
  tag: string | null;
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
  onTag: (value: string | null) => void;
  onSelect: (character: Character) => void;
  onBack: () => void;
}

const selectClass = "vm-field w-full py-3 text-sm";

export function CharacterRoster({
  romanceMode,
  query,
  category,
  tag,
  onQuery,
  onCategory,
  onTag,
  onSelect,
  onBack,
}: CharacterRosterProps) {
  const [characters, setCharacters] = useState<Character[]>(CHARACTERS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<"featured" | "name">("featured");
  const [expanded, setExpanded] = useState(false);
  const [interest, setInterest] = useState("");
  const [conversation, setConversation] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCharacters(allCharacters());
      setFavorites(loadFavoriteCompanions());
    };
    refresh();
    window.addEventListener(COMPANION_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COMPANION_LIBRARY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...new Set([...characters.map((c) => c.category), "BNWO", "JOI", "SPH"].sort()),
    ],
    [characters],
  );
  const interests = useMemo(
    () =>
      [...new Set(characters.flatMap((c) => discoveryFor(c).interests))].sort(),
    [characters],
  );
  const tags = useMemo(
    () =>
      [...new Set(characters.flatMap((c) => c.tags))]
        .filter((t) => t !== "NEW")
        .sort(),
    [characters],
  );
  const visible = useMemo(
    () =>
      discoverCompanions(characters, {
        query,
        category,
        tag,
        interest,
        conversation,
        visualStyle,
        favorites,
        savedOnly,
        sort,
      }),
    [
      characters,
      query,
      category,
      tag,
      interest,
      conversation,
      visualStyle,
      favorites,
      savedOnly,
      sort,
    ],
  );
  const activeCount = [
    category !== "All",
    tag,
    interest,
    conversation,
    visualStyle,
    savedOnly,
  ].filter(Boolean).length;
  const clearFilters = () => {
    onQuery("");
    onCategory("All");
    onTag(null);
    setInterest("");
    setConversation("");
    setVisualStyle("");
    setSavedOnly(false);
  };
  const toggleFavorite = (character: Character) => {
    try {
      setFavorites(toggleFavoriteCompanion(character.id));
      setNotice("");
    } catch {
      setNotice(
        "Favorites could not be saved. Your browser storage may be full or disabled.",
      );
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-7 pb-16 text-white">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="vm-text-button">
          <ArrowLeft className="h-4 w-4" /> The Atelier
        </button>
        <Link href="/?view=import" className="vm-text-button">
          Your character cards <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <header className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#17121f] px-6 py-10 sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgba(160,95,181,.24),transparent_65%)]"
        />
        <div className="relative z-10 max-w-xl sm:w-2/3">
          <p className="vm-eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> A little curiosity. A new
            connection.
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">
            {romanceMode ? "Someone to share" : "Extraordinary characters."}
            <br />
            <span className="text-[#d4b2dc]">
              {romanceMode ? "your world with." : "Your kind of connection."}
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#bfb3c7]">
            Meet fictional adults with stories of their own. Find the artist,
            the adventurer, or the person who gets your sense of humor.
          </p>
          <p className="mt-5 text-xs text-[#cbb4d8]">
            {characters.length} characters to discover{" "}
            <span className="mx-2 text-white/20">/</span> Make the story yours
          </p>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 bottom-0 hidden h-[90%] w-[36%] gap-3 opacity-50 sm:flex lg:opacity-90"
        >
          {CHARACTERS.slice(0, 2).map((c, index) => (
            <div
              key={c.id}
              className={
                "h-full w-1/2 overflow-hidden rounded-t-[100px] " +
                (index ? "translate-y-12" : "translate-y-3")
              }
            >
              <SafeImage
                src={c.avatar}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#17121f] via-transparent to-transparent" />
        </div>
      </header>

      <section aria-label="Filter companions" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-[180px] flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <span className="sr-only">Search companions</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="A name, an interest, a little intrigue…"
              className="vm-field w-full py-3.5 text-sm"
              style={{ paddingLeft: "2.75rem" }}
            />
          </label>
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((v) => !v)}
            className={
              "vm-secondary-button " +
              (savedOnly
                ? "!border-[#caa4d5] !bg-[#846196]/20 !text-white"
                : "")
            }
          >
            <Heart className={"h-4 w-4 " + (savedOnly ? "fill-current" : "")} />{" "}
            Saved <span className="text-xs opacity-65">{favorites.length}</span>
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="companion-filters"
            onClick={() => setExpanded((v) => !v)}
            className="vm-secondary-button"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters{" "}
            {activeCount > 0 && (
              <span className="rounded-full bg-violet-300/20 px-1.5 text-xs">
                {activeCount}
              </span>
            )}
          </button>
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Personality"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => onCategory(item)}
              className={
                "vm-filter-chip " +
                (category === item ? "vm-filter-active" : "")
              }
            >
              {item === "All" ? "All personalities" : item}
            </button>
          ))}
        </div>
        {expanded && (
          <div
            id="companion-filters"
            className="grid gap-4 rounded-2xl border border-white/10 bg-[#17121f] p-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="vm-field-label">
              Interests
              <select
                aria-label="Interests"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className={selectClass}
              >
                <option value="">Any interest</option>
                {interests.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="vm-field-label">
              Conversation
              <select
                aria-label="Conversation"
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
                className={selectClass}
              >
                <option value="">Any conversation</option>
                {CONVERSATION_TYPES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="vm-field-label">
              Visual style
              <select
                aria-label="Visual style"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className={selectClass}
              >
                <option value="">Any style</option>
                {VISUAL_STYLES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="vm-field-label">
              Mood
              <select
                aria-label="Mood"
                value={tag || ""}
                onChange={(e) => onTag(e.target.value || null)}
                className={selectClass}
              >
                <option value="">Any mood</option>
                {tags.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {(activeCount > 0 || query) && (
          <button
            type="button"
            onClick={clearFilters}
            className="vm-text-button text-xs"
          >
            <X className="h-3.5 w-3.5" /> Clear all filters
          </button>
        )}
        {notice && (
          <p role="alert" className="text-sm text-amber-200">
            {notice}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p role="status" aria-live="polite" className="text-sm text-[#bfb3c7]">
          <strong className="font-medium text-white">{visible.length}</strong>{" "}
          fictional adult companions
        </p>
        <label className="flex items-center gap-2 text-xs text-[#bfb3c7]">
          Sort by
          <select
            aria-label="Sort companions"
            value={sort}
            onChange={(e) => setSort(e.target.value as "featured" | "name")}
            className="rounded-lg border border-white/10 bg-[#17121f] px-3 py-2 text-xs text-white"
          >
            <option value="featured">Featured</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((character) => (
            <CandyGirlCard
              key={character.id}
              character={character}
              onSelect={onSelect}
              isNew={character.tags.some((t) => t.toUpperCase() === "NEW")}
              isFavorite={favorites.includes(character.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/15 bg-[#17121f] px-6 py-16 text-center">
          <Search className="mx-auto mb-4 h-7 w-7 text-[#bd9cc9]" />
          <h2 className="font-display text-2xl">
            A different kind of connection?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#bfb3c7]">
            {savedOnly && !favorites.length
              ? "Save a character with the heart button to build your collection."
              : "No characters match this combination. Open up the filters and see who you find."}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="vm-secondary-button mx-auto mt-6"
          >
            Explore all companions
          </button>
        </div>
      )}
    </main>
  );
}
