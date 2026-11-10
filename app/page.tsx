"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CharacterChat } from "@/components/CharacterChat";
import { CharacterProfile } from "@/components/CharacterProfile";
import { CharacterRoster } from "@/components/CharacterRoster";
import { CHARACTERS, characterCategories, type Character } from "@/lib/characters";

import { HomeView as HomeScreen } from "@/components/home-view";
import { SiteHeader } from "@/components/site-header";
import { containerClass } from "@/lib/cn";
import { JoiBrowser } from "@/components/content/JoiBrowser";
import { StoryPackBrowser } from "@/components/content/StoryPackBrowser";
import { SectionView } from "@/components/section-view";
import { findSection, type ViewId } from "@/lib/sections";
import { UtilitySection } from "@/components/utility-section";
import { CoreDashboard } from "@/components/core-dashboard";
import { claimDaily } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

type HomeView =
  | "home"
  | "girls"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "room"
  | "suggest"
  | "gallery"
  | "packs";

type View = HomeView | "profile" | "chat";

export default function Home() {
  const { progress, ready, storageAvailable, update } = useProgress();
  const [view, setView] = useState<View>("home");
  const [customCharacter, setCustomCharacter] = useState<Character | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [romanceMode, setRomanceMode] = useState(false);
  const [listView, setListView] = useState<"girls" | "romance">("girls");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState<string | null>(null);

  const [adult, setAdult] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const main = document.getElementById("main");
    if (menuOpen) main?.setAttribute("inert", "");
    else main?.removeAttribute("inert");
  }, [menuOpen]);
  const toggleMenu = useCallback(() => setMenuOpen(open => !open), []);
  useEffect(() => { try { setAdult(localStorage.getItem("velvet-age") === "true"); } catch { setAdult(false); } }, []);
  const navigate = (next: ViewId) => {
    setMenuOpen(false);
    if (next === "girls" || next === "romance" || next === "tinder") openRoster(next === "romance");
    else setView(next);
    window.scrollTo({top: 0});
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const tags = useMemo(
    () => Array.from(new Set(CHARACTERS.flatMap((character) => character.tags))).sort(),
    [],
  );
  const selected = customCharacter?.id === selectedId ? customCharacter : CHARACTERS.find((character) => character.id === selectedId) ?? null;

  const openRoster = (romance: boolean) => {
    setRomanceMode(romance);
    setListView(romance ? "romance" : "girls");
    setView(romance ? "romance" : "girls");
  };

  const openProfile = (character: Character) => {
    setSelectedId(character.id);
    setView("profile");
  };

  const showRoster = view === "girls" || view === "romance";
  const resumeCharacter = CHARACTERS.find(character => character.id === progress.lastSession?.characterId);

  const openChat = () => {
    if (!selected) return;
    if (CHARACTERS.some(character => character.id === selected.id)) {
      void update(state => ({ ...state, lastSession: { characterId: selected.id, romanceMode, updatedAt: new Date().toISOString() } }));
    }
    setView("chat");
  };

  if (adult === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!adult) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-pink-900/50 bg-zinc-950 p-6">
          <h1 className="text-2xl font-bold text-pink-400 mb-2">VelvetMotion</h1>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            This is an adult fantasy site. Every character is fictional and 18 or older.
            Nothing here is for minors.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem("velvet-age", "true");
              } catch {
                /* private mode can block storage; the gate still lifts for this visit */
              }
              setAdult(true);
            }}
            className="w-full py-3 rounded-2xl bg-pink-600 font-semibold"
          >
            I am 18 or older
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <SiteHeader view={view === "profile" || view === "chat" ? listView : view} menuOpen={menuOpen} onToggleMenu={toggleMenu} onNavigate={navigate} />
      <div id="main" aria-hidden={menuOpen || undefined} className={containerClass + " py-6"}>


        {view === "home" && <>
          <Link href="/companion" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-pink-400/40 px-5 text-sm text-pink-300">Local companion · Windows setup</Link>
          <CoreDashboard
            progress={progress}
            ready={ready}
            storageAvailable={storageAvailable}
            favorites={CHARACTERS.filter(character => progress.favoriteIds.includes(character.id))}
            resumeName={resumeCharacter?.name}
            onClaim={() => update(state => claimDaily(state, new Date()))}
            onNightMode={() => { void update(state => ({ ...state, nightMode: !state.nightMode })); }}
            onFavorite={id => { setSelectedId(id); setRomanceMode(false); setListView("girls"); setView("profile"); }}
            onResume={() => {
              if (!resumeCharacter || !progress.lastSession) return;
              setSelectedId(resumeCharacter.id);
              setRomanceMode(progress.lastSession.romanceMode);
              setListView(progress.lastSession.romanceMode ? "romance" : "girls");
              setView("chat");
            }}
          />
          <HomeScreen onNavigate={navigate} />
        </>}

        {showRoster && (
          <CharacterRoster
            romanceMode={romanceMode}
            query={query}
            category={category}
            tag={tag}
            categories={categories}
            tags={tags}
            onQuery={setQuery}
            onCategory={(value) => {
              setCategory(value);
              setTag(null);
            }}
            onTag={setTag}
            onSelect={openProfile}
            onBack={() => setView("home")}
          />
        )}

        {view === "profile" && selected && (
          <CharacterProfile
            character={selected}
            romanceMode={romanceMode}
            favorite={progress.favoriteIds.includes(selected.id)}
            onToggleFavorite={() => { void update(state => ({ ...state, favoriteIds: state.favoriteIds.includes(selected.id) ? state.favoriteIds.filter(id => id !== selected.id) : [...state.favoriteIds, selected.id] })); }}
            onBack={() => setView(listView)}
            onChat={openChat}
            onTag={(nextTag) => {
              setTag(nextTag);
              setCategory("All");
              setView(listView);
            }}
          />
        )}

        {view === "chat" && selected && (
          <CharacterChat
            key={`${selected.id}:${romanceMode}`}
            character={selected}
            romanceMode={romanceMode}
            onBack={() => setView("profile")}
          />
        )}

        {view === "packs" && <><button onClick={() => setView("home")} className="mb-4 text-pink-400">← Home</button><StoryPackBrowser /></>}
        {view === "joi" && <><button onClick={() => setView("home")} className="mb-4 text-pink-400">← Home</button><JoiBrowser /></>}
        {["create", "suggest", "gallery", "room"].includes(view) && <UtilitySection view={view} onHome={() => setView("home")} onOpenCustom={(name) => {
          const character: Character = { ...CHARACTERS[0], id: `custom-${name}`, name, tagline: "Your fictional character", initialMessage: `Hello, I'm ${name}.`, personality: "Friendly", traits: ["Custom"], background: "An original fictional adult character.", figure: "Fictional adult", kink: "Not specified", reply: "I'm listening.", category: "Custom" };
          setCustomCharacter(character); setSelectedId(character.id); setRomanceMode(false); setView("chat");
        }} />}
        {view === "bnwo" && <SectionView section={findSection(view)} onHome={() => setView("home")} />}
      </div>
    </div>
  );
}
