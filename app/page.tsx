"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CharacterChat } from "@/components/CharacterChat";
import { CharacterProfile } from "@/components/CharacterProfile";
import { CharacterRoster } from "@/components/CharacterRoster";
import { CHARACTERS, characterCategories, getCharacter, type Character } from "@/lib/characters";
import { HomeView as HomeScreen } from "@/components/home-view";
import { SiteHeader } from "@/components/site-header";
import { CandySidebar } from "@/components/CandySidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AdvancedMediaSettings } from "@/components/AdvancedMediaSettings";
import { CardImport } from "@/components/CardImport";
import { ProactiveToast } from "@/components/ProactiveToast";
import { containerClass } from "@/lib/cn";
import { JoiBrowser } from "@/components/content/JoiBrowser";
import { StoryPackBrowser } from "@/components/content/StoryPackBrowser";
import { findSection, type ViewId } from "@/lib/sections";
import { TributeBrowser } from "@/components/TributeBrowser";
import { CreateGirlWizard } from "@/components/CreateGirlWizard";
import { GoonRoom } from "@/components/GoonRoom";
import { DiscoverSwipe } from "@/components/DiscoverSwipe";
import { RouletteRoom } from "@/components/RouletteRoom";
import { BlindfoldJoi } from "@/components/BlindfoldJoi";
import { Joi3DStage } from "@/components/Joi3DStage";
import { Penthouse3DSuite } from "@/components/Penthouse3DSuite";
import { SpicyScenarioSimulator } from "@/components/SpicyScenarioSimulator";
import { DualGirlChat } from "@/components/DualGirlChat";
import { GroupChat } from "@/components/GroupChat";
import { ShareImport } from "@/components/ShareImport";
import { UserLounge } from "@/components/UserLounge";
import { ShortsFeed } from "@/components/ShortsFeed";
import { LoginGate } from "@/components/LoginGate";
import { WorkspaceHub } from "@/components/WorkspaceHub";
import { VaultPanel } from "@/components/VaultPanel";
import { MyGirlsHub } from "@/components/MyGirlsHub";
import { LegalPages } from "@/components/LegalPages";
import { CoinWallet } from "@/components/CoinWallet";
import { SupportModal } from "@/components/SupportModal";
import { shouldShowSupportPromptOnLogin } from "@/lib/wallet";
import { getUser, type LocalUser } from "@/lib/auth";
import { getCoins, loadChat, saveChat } from "@/lib/storage";
import {
  startProactiveWatcher,
  dismissProactive,
  type ProactivePing,
} from "@/lib/proactiveIdle";
import { registerServiceWorker } from "@/lib/pwaProactive";

type HomeView =
  | "home" | "girls" | "penthouse" | "create" | "romance" | "bnwo" | "tinder"
  | "joi" | "joi3d" | "room" | "roulette" | "blindfold" | "scenario" | "suggest"
  | "gallery" | "packs" | "tribute" | "workspace" | "dual" | "group" | "share"
  | "lounge" | "shorts" | "advanced" | "import" | "vault" | "my-girls" | "wallet"
  | "terms" | "privacy" | "safety";

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
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [proactive, setProactive] = useState<ProactivePing | null>(null);
  const [dualPair, setDualPair] = useState<{ a: string; b: string } | null>(null);
  const [stageGirlId, setStageGirlId] = useState<string | null>(null);
  const [stageFromMatch, setStageFromMatch] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

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
      if (initialView) setView(initialView);
      const initialId = params.get("id");
      if (initialId) setSelectedId(initialId);
    } catch {
      setAdult(false);
    }
    const existingUser = getUser();
    setUser(existingUser);
    setCoins(getCoins());
    setAuthReady(true);
    registerServiceWorker();
    if (existingUser && shouldShowSupportPromptOnLogin()) setSupportModalOpen(true);
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    return startProactiveWatcher(
      () => {
        if (selectedId) {
          const c =
            customCharacter?.id === selectedId
              ? customCharacter
              : CHARACTERS.find((x) => x.id === selectedId);
          if (c) return c;
        }
        return CHARACTERS[Math.floor(Math.random() * Math.min(8, CHARACTERS.length))] || null;
      },
      (ping) => setProactive(ping),
    );
  }, [authReady, user, selectedId, customCharacter]);

  const navigate = (next: string) => {
    setMenuOpen(false);
    if (next === "girls" || next === "romance") openRoster(next === "romance");
    else setView(next as View);
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
      : (selectedId ? getCharacter(selectedId) : undefined) ??
        ((view === "chat" || view === "profile") ? (CHARACTERS[0] ?? null) : null);

  const openRoster = (romance: boolean) => {
    setRomanceMode(romance);
    setListView(romance ? "romance" : "girls");
    setView(romance ? "romance" : "girls");
  };

  const openProfile = (character: Character) => {
    setCustomCharacter(character);
    setSelectedId(character.id);
    setView("profile");
  };

  const openChatById = (id: string, scenarioPrompt?: string, incomingAssistantNote?: string) => {
    const found = getCharacter(id);
    if (found) setCustomCharacter(found);
    if (scenarioPrompt && scenarioPrompt.trim()) {
      const existing = loadChat(id);
      const base =
        existing.length > 0
          ? existing
          : found
            ? [{ role: "assistant" as const, content: found.initialMessage }]
            : [];
      saveChat(id, [
        ...base,
        {
          role: "assistant",
          content: `*Scenario:* ${scenarioPrompt.trim()}\n\n\"We're right here inside the scene. Tell me your next move.\"`,
        },
      ]);
    } else if (incomingAssistantNote && incomingAssistantNote.trim()) {
      const existing = loadChat(id);
      const note = incomingAssistantNote.trim();
      if (!existing.some((m) => m.content === note)) {
        const base =
          existing.length > 0
            ? existing
            : found
              ? [{ role: "assistant" as const, content: found.initialMessage }]
              : [];
        saveChat(id, [...base, { role: "assistant", content: note }]);
      }
    }
    setSelectedId(id);
    setRomanceMode(false);
    setView("chat");
  };

  const openDualWithPair = (aId: string, bId: string) => {
    setDualPair({ a: aId, b: bId });
    setView("dual");
  };

  const showRoster = view === "girls" || view === "romance";

  if (adult === null || !authReady) return <div className="min-h-screen bg-black" />;

  if (!adult) {
    return (
      <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-pink-500/30 bg-gradient-to-b from-zinc-950 to-black p-8 shadow-[0_0_80px_rgba(236,72,153,0.2)]">
          <div className="text-5xl mb-4 text-center">💋</div>
          <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
            VelvetMotion
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6 mt-3 text-center">
            Match → chat → 3D. Private uncensored companions. Fictional adults 21+ only.
          </p>
          <div className="flex gap-3 justify-center text-xs text-zinc-500 mb-4">
            <button type="button" className="underline hover:text-pink-300" onClick={() => setView("terms")}>Terms</button>
            <button type="button" className="underline hover:text-pink-300" onClick={() => setView("privacy")}>Privacy</button>
            <button type="button" className="underline hover:text-pink-300" onClick={() => setView("safety")}>18+ Policy</button>
          </div>
          <button
            onClick={() => {
              try { localStorage.setItem("velvet-age", "true"); } catch { /* */ }
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

  if ((view === "terms" || view === "privacy" || view === "safety") && !user) {
    return <LegalPages page={view} onHome={() => setView("home")} />;
  }

  if (!user) {
    return (
      <LoginGate
        onLoggedIn={(u) => {
          setUser(u);
          if (shouldShowSupportPromptOnLogin()) setSupportModalOpen(true);
        }}
      />
    );
  }

  const sidebarActive =
    view === "profile" || view === "chat"
      ? "girls"
      : view === "dual" || view === "group"
        ? view
        : (view as string);

  return (
    <div className="min-h-screen bg-ink-950 text-white pb-16 lg:pb-0">
      <SiteHeader
        view={
          view === "profile" || view === "chat" || view === "joi3d" || view === "vault"
            ? listView
            : (view as ViewId)
        }
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onNavigate={navigate as (v: ViewId) => void}
        onUserChange={setUser}
      />
      <div className="flex">
        <CandySidebar active={sidebarActive} onNavigate={navigate} coins={coins} />
        <div id="main" aria-hidden={menuOpen || undefined} className={containerClass + " flex-1 py-6 min-w-0"}>
          {view === "home" && (
            <HomeScreen
              onNavigate={navigate}
              onOpenGirl={(id, note) => openChatById(id, undefined, note)}
              onOpenDual={openDualWithPair}
            />
          )}
          {view === "shorts" && <ShortsFeed onHome={() => setView("home")} onChat={openChatById} />}
          {view === "advanced" && <AdvancedMediaSettings onHome={() => setView("home")} />}
          {view === "import" && (
            <CardImport
              onHome={() => setView("home")}
              onOpen={(c) => {
                setCustomCharacter(c);
                setSelectedId(c.id);
                setView("chat");
              }}
            />
          )}
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
              onOpen3D={(character) => {
                setCustomCharacter(character);
                setSelectedId(character.id);
                setStageGirlId(character.id);
                setStageFromMatch(false);
                setView("joi3d");
              }}
            />
          )}
          {view === "dual" && (
            <DualGirlChat onHome={() => setView("home")} initialGirlAId={dualPair?.a} initialGirlBId={dualPair?.b} />
          )}
          {view === "group" && <GroupChat onHome={() => setView("home")} />}
          {view === "lounge" && <UserLounge onHome={() => setView("home")} />}
          {view === "share" && (
            <ShareImport
              onHome={() => setView("home")}
              onImport={(girl) => {
                setCustomCharacter(girl);
                setSelectedId(girl.id);
                setView("chat");
              }}
            />
          )}
          {view === "room" && (
            <GoonRoom onHome={() => setView("home")} onChat={openChatById} onOpenDual={openDualWithPair} />
          )}
          {view === "roulette" && <RouletteRoom onHome={() => setView("home")} onChat={openChatById} />}
          {view === "blindfold" && <BlindfoldJoi onHome={() => setView("home")} onChat={openChatById} />}
          {view === "joi3d" && (
            <Joi3DStage
              onHome={() => {
                setStageFromMatch(false);
                setView("home");
              }}
              onChat={openChatById}
              initialGirlId={stageGirlId}
              fromMatch={stageFromMatch}
            />
          )}
          {view === "scenario" && (
            <SpicyScenarioSimulator
              onHome={() => setView("home")}
              onStartChat={(id, customPrompt) => openChatById(id, customPrompt)}
            />
          )}
          {view === "tribute" && (
            <>
              <button onClick={() => setView("home")} className="mb-4 text-pink-400 text-sm">← Home</button>
              <TributeBrowser onStartWithGirl={openChatById} />
            </>
          )}
          {view === "packs" && (
            <>
              <button onClick={() => setView("home")} className="mb-4 text-pink-400 text-sm">← Home</button>
              <StoryPackBrowser onStartWithGirl={openChatById} />
            </>
          )}
          {view === "joi" && (
            <>
              <button onClick={() => setView("home")} className="mb-4 text-pink-400 text-sm">← Home</button>
              <JoiBrowser onStartWithGirl={openChatById} />
            </>
          )}
          {view === "gallery" && (
            <WorkspaceHub onHome={() => setView("home")} />
          )}
          {view === "workspace" && <WorkspaceHub onHome={() => setView("home")} />}
          {view === "vault" && <VaultPanel onHome={() => setView("home")} />}
          {view === "my-girls" && (
            <MyGirlsHub
              onHome={() => setView("home")}
              onChat={openChatById}
              onOpen3D={(id) => {
                setStageGirlId(id);
                setStageFromMatch(false);
                setView("joi3d");
              }}
            />
          )}
          {view === "wallet" && <CoinWallet onHome={() => setView("home")} onCoinsChanged={setCoins} />}
          {(view === "terms" || view === "privacy" || view === "safety") && (
            <LegalPages page={view} onHome={() => setView("home")} />
          )}
          {view === "tinder" && (
            <DiscoverSwipe
              onHome={() => setView("home")}
              onMeet3D={(c) => {
                setStageGirlId(c.id);
                setStageFromMatch(true);
                setView("joi3d");
              }}
              onMatch={(c) => {
                if (c.id.startsWith("custom-")) setCustomCharacter(c);
                setSelectedId(c.id);
                setRomanceMode(false);
                setView("profile");
              }}
            />
          )}
          <footer className="mt-12 border-t border-white/10 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <span>VelvetMotion AI · Match → chat → 3D · Fictional adults 21+ only · Free</span>
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => navigate("wallet")} className="text-amber-300 hover:text-amber-200 font-medium">
                Coin Wallet
              </button>
              <button type="button" onClick={() => navigate("terms")} className="hover:text-pink-300">Terms</button>
              <button type="button" onClick={() => navigate("privacy")} className="hover:text-pink-300">Privacy</button>
              <button type="button" onClick={() => navigate("safety")} className="hover:text-pink-300">Safety &amp; 18+</button>
            </div>
          </footer>
        </div>
      </div>
      <MobileBottomNav active={sidebarActive} onNavigate={navigate} />
      {supportModalOpen && (
        <SupportModal
          onClose={() => setSupportModalOpen(false)}
          onOpenWallet={() => setView("wallet")}
          onCoinsChanged={setCoins}
        />
      )}
      {proactive && (
        <ProactiveToast
          ping={proactive}
          onOpen={() => {
            openChatById(proactive.characterId, undefined, proactive.text);
            dismissProactive(proactive.at);
            setProactive(null);
          }}
          onDismiss={() => {
            dismissProactive(proactive.at);
            setProactive(null);
          }}
        />
      )}
    </div>
  );
}
