"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Portrait } from "@/components/portrait";
import { CharacterGridSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/providers";
import { allTags, characters, getCharacter, type Character } from "@/lib/characters";
import { loadFavorites, loadRecentChat, saveFavorites } from "@/lib/storage";

type GenderFilter = "all" | "woman" | "man" | "nonbinary";

const GENDERS: { id: GenderFilter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "woman", label: "Women" },
  { id: "man", label: "Men" },
  { id: "nonbinary", label: "Nonbinary" },
];

export function CharacterBrowser() {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [tag, setTag] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<Character | null>(null);

  useEffect(() => {
    setFavorites(loadFavorites());
    const stored = loadRecentChat();
    setRecent(stored ? getCharacter(stored.id) ?? null : null);
    setReady(true);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return characters
      .filter((character) => {
        if (favoritesOnly && !favorites.includes(character.id)) return false;
        if (gender !== "all" && character.gender !== gender) return false;
        if (tag !== "all" && !character.tags.includes(tag)) return false;
        if (!needle) return true;
        const haystack = [character.name, character.role, character.city, character.tagline, character.bio, character.personality, ...character.tags]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [favorites, favoritesOnly, gender, query, tag]);

  function toggleFavorite(character: Character) {
    const next = favorites.includes(character.id)
      ? favorites.filter((id) => id !== character.id)
      : [...favorites, character.id];
    setFavorites(next);
    saveFavorites(next);
    toast(next.includes(character.id) ? `Saved ${character.name}` : `Removed ${character.name} from favorites`);
  }

  function clearFilters() {
    setQuery("");
    setGender("all");
    setTag("all");
    setFavoritesOnly(false);
  }

  if (!ready) return <CharacterGridSkeleton />;

  return (
    <main id="content" className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Fictional adults · 18+</p>
          <h1 className="font-display text-5xl text-rose-50 sm:text-6xl">VelvetMotion</h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-rose-100/70">
          Private conversations with invented people, each written as 21 or older. Speech stays on your device.
        </p>
      </header>

      <section className="mt-8" aria-label="Find a character">
        <label htmlFor="character-search" className="sr-only">
          Search characters
        </label>
        <input
          id="character-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, role, or mood"
          className="field"
        />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Filter characters">
          <FilterChip pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
            Favorites{favorites.length ? ` (${favorites.length})` : ""}
          </FilterChip>
          {GENDERS.map((item) => (
            <FilterChip key={item.id} pressed={gender === item.id} onClick={() => setGender(item.id)}>
              {item.label}
            </FilterChip>
          ))}
          <FilterChip pressed={tag === "all"} onClick={() => setTag("all")}>
            Any mood
          </FilterChip>
          {allTags.map((item) => (
            <FilterChip key={item} pressed={tag === item} onClick={() => setTag(item)}>
              {item}
            </FilterChip>
          ))}
        </div>
        <p className="mt-3 text-sm text-rose-100/60" aria-live="polite">
          {filtered.length} fictional {filtered.length === 1 ? "adult" : "adults"}
        </p>
      </section>

      {recent && (
        <Link href={`/chat/${recent.id}`} className="continue-banner mt-4">
          <span className="eyebrow">Last conversation</span>
          <span className="font-display text-2xl text-rose-50">Continue with {recent.name}</span>
        </Link>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state mt-8">
          <h2 className="font-display text-3xl">No one matches</h2>
          <p className="mt-2 text-sm text-rose-100/70">Try another name, mood, or clear the filters.</p>
          <button type="button" className="button-quiet mt-4" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((character, index) => {
            const saved = favorites.includes(character.id);
            return (
              <li key={character.id} className="character-card rise-in" style={{ animationDelay: `${index * 40}ms` }}>
                <Link href={`/chat/${character.id}`} className="flex h-full flex-col">
                  <Portrait id={character.id} name={character.name} palette={character.palette} className="h-44 w-full" />
                  <div className="flex flex-1 flex-col p-4 pr-14">
                    <h2 className="font-display text-3xl text-rose-50">{character.name}</h2>
                    <p className="mt-1 text-sm text-gold">
                      Age {character.age} · {character.role}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-rose-100/75">{character.tagline}</p>
                    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Moods">
                      {character.tags.map((item) => (
                        <li key={item} className="tag">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
                <button
                  type="button"
                  className={`favorite-button ${saved ? "text-rose-300" : "text-rose-100/70"}`}
                  aria-pressed={saved}
                  aria-label={saved ? `Remove ${character.name} from favorites` : `Save ${character.name} to favorites`}
                  onClick={() => toggleFavorite(character)}
                >
                  <Heart filled={saved} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-12 border-t border-white/10 pt-6 text-sm leading-relaxed text-rose-100/60">
        VelvetMotion is fantasy. Characters are fictional adults. Messages can be read aloud with your browser&apos;s own voices. This app does not clone voices or make images from photographs.
      </footer>
    </main>
  );
}

function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 20s-7-4.4-9.2-8.4C1 8.8 2.2 5.6 5.2 4.8 7.2 4.2 9 5.1 12 8c3-2.9 4.8-3.8 6.8-3.2 3 .8 4.2 4 2.4 6.8C19 15.6 12 20 12 20z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
