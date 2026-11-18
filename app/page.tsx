"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { TributeBrowser } from "@/components/TributeBrowser";
import { CreateGirlWizard } from "@/components/CreateGirlWizard";
import { GoonRoom } from "@/components/GoonRoom";
import { DiscoverSwipe } from "@/components/DiscoverSwipe";
import { RouletteRoom } from "@/components/RouletteRoom";
import { BlindfoldJoi } from "@/components/BlindfoldJoi";
import { Penthouse3DSuite } from "@/components/Penthouse3DSuite";
import { getUser, type LocalUser } from "@/lib/auth";

type HomeView =
  | "home"
  | "girls"
  | "penthouse"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "room"
  | "roulette"
  | "blindfold"
  | "suggest"
  | "gallery"
  | "packs"
  | "tribute"
  | "workspace";

type View = HomeView | "profile" | "chat";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [customCharacter, setCustomCharacter] = useState<Character | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [romanceMode, setRomanceMode] = useState(false);
  const [listView, setListView] = useState<"girls" | "romance">("girls");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState<string | null>(null);
  const [adult, setAdult] = useState<boolean | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const main = document.getElementById("main");
    if (menuOpen) main?.setAttribute("inert", "");
    else main?.removeAttribute("inert");
  }, [menuOpen]);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autostart") === "1") {
        localStorage.setItem("velvet-age", "true");
        setAdult(true);
      } else {
        setAdult(localStorage.getItem("velvet-age") === "true");
      }
      const initialView = params.get("view") as View | null;
      if (initialView) {
        setView(initialView);
      }
    } catch {
      setAdult(false);
    }
    const existing = getUser();
    if (existing) {
      setUser(existing);
    } else {
      const guest: LocalUser = { username: "VIP Guest", joinedAt: Date.now() };
      try {
        localStorage.setItem("vm-user", JSON.stringify(guest));
      } catch {
        /* ignore */
      }
      setUser(guest);
    }
  }, []);

  const navigate = (next: ViewId) => {
    setMenuOpen(false);
    if (next === "girls" || next === "romance") openRoster(next === "romance");
    else setView(next);
    window.scrollTo({ top: 0 });
  };

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const tags = useMemo(
    () => Array.from(new Set(CHARACTERS.flatMap((character) => character.tags))).sort(),
    [],
  );
  const selected =
    customCharacter?.id === selectedId
      ? customCharacter
      : CHARACTERS.find((character) => character.id === selectedId) ?? null;

  const openRoster = (romance: boolean) => {
    setRomanceMode(romance);
    setListView(romance ? "romance" : "girls");
    setView(romance ? "romance" : "girls");
  };

  const openProfile = (character: Character) => {
    setSelectedId(character.id);
    setView("profile");
  };

  const openChatById = (id: string) => {
    setSelectedId(id);
    setRomanceMode(false);
    setView("chat");
  };

  const showRoster = view === "girls" || view === "romance";

  if (adult === null) return <div className="min-h-screen bg-black" />;

  if (!adult) {
    return (
      <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-pink-500/30 bg-gradient-to-b from-zinc-950 to-black p-8 shadow-[0_0_80px_rgba(236,72,153,0.2)]">
          <div className="text-5xl mb-4 text-center">💋</div>
          <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
            VelvetMotion
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6 mt-3 text-center">
            Adult fantasy companions. Chat, nudes, tributes, roulette, blindfold JOI. Fictional 21+ only.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem("velvet-age", "true");
              } catch {
                /* */
              }
              setAdult(true);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/30"
          >
            I am 18 or older — Enter
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <SiteHeader
        view={view === "profile" || view === "chat" ? listView : view}
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onNavigate={navigate}
        onUserChange={setUser}
      />
      <div id="main" aria-hidden={menuOpen || undefined} className={containerClass + " py-6"}>
        {view === "home" && <HomeScreen onNavigate={navigate} onOpenGirl={openChatById} />}

        {view === "penthouse" && (
          <Penthouse3DSuite onHome={() => setView("home")} onOpenChat={openChatById} />
        )}

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
            onBack={() => setView(listView)}
            onChat={() => setView("chat")}
            onTag={(nextTag) => {
              setTag(nextTag);
              setCategory("All");
              setView(listView);
            }}
          />
        )}

        {view === "chat" && selected && (
          <CharacterChat character={selected} romanceMode={romanceMode} onBack={() => setView("profile")} />
        )}

        {view === "create" && (
          <CreateGirlWizard
            onHome={() => setView("home")}
            onDone={(character) => {
              setCustomCharacter(character);
              setSelectedId(character.id);
              setRomanceMode(false);
              setView("chat");
            }}
          />
        )}

        {view === "room" && <GoonRoom onHome={() => setView("home")} onChat={openChatById} />}
        {view === "roulette" && <RouletteRoom onHome={() => setView("home")} onChat={openChatById} />}
        {view === "blindfold" && <BlindfoldJoi onHome={() => setView("home")} onChat={openChatById} />}

        {view === "tribute" && (
          <>
            <button onClick={() => setView("home")} className="mb-4 text-pink-400 text-sm">← Home</button>
            <TributeBrowser onStartWithGirl={openChatById} />
          </>
        )}

        {view === "packs" && (
          <>
            <button onClick={() => setView("home")} className="mb-4 text-pink-400">← Home</button>
            <StoryPackBrowser />
          </>
        )}
        {view === "joi" && (
          <>
            <button onClick={() => setView("home")} className="mb-4 text-pink-400">← Home</button>
            <JoiBrowser />
          </>
        )}
        {["suggest", "gallery"].includes(view) && (
          <UtilitySection
            view={view}
            onHome={() => setView("home")}
            onOpenCustom={(name) => {
              const character: Character = {
                ...CHARACTERS[0],
                id: `custom-${name}`,
                name,
                tagline: "Your fictional character",
                initialMessage: `Hello, I'm ${name}.`,
                personality: "Friendly",
                traits: ["Custom"],
                background: "An original fictional adult character.",
                figure: "Fictional adult",
                kink: "Not specified",
                reply: "I'm listening.",
                category: "Custom",
              };
              setCustomCharacter(character);
              setSelectedId(character.id);
              setRomanceMode(false);
              setView("chat");
            }}
          />
        )}
        {view === "bnwo" && <SectionView section={findSection(view)} onHome={() => setView("home")} />}
        {view === "workspace" && (
          <SectionView section={findSection("workspace")} onHome={() => setView("home")} />
        )}
        {view === "tinder" && (
          <DiscoverSwipe
            onHome={() => setView("home")}
            onMatch={(c) => {
              if (c.id.startsWith("custom-")) setCustomCharacter(c);
              setSelectedId(c.id);
              setRomanceMode(false);
              setView("profile");
            }}
          />
        )}
      </div>
    </div>
  );
}
