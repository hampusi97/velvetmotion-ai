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
import { SectionView } from "@/components/section-view";
import { findSection, type ViewId } from "@/lib/sections";
import { UtilitySection } from "@/components/utility-section";
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
import { InstallAppModal } from "@/components/InstallAppModal";
import { SuggestionsHub } from "@/components/SuggestionsHub";
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
  | "home"
  | "girls"
  | "penthouse"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "joi3d"
  | "room"
  | "roulette"
  | "blindfold"
  | "scenario"
  | "suggest"
  | "gallery"
  | "packs"
  | "tribute"
  | "workspace"
  | "dual"
  | "group"
  | "share"
  | "lounge"
  | "shorts"
  | "advanced"
  | "import"
  | "vault"
  | "my-girls"
  | "wallet"
  | "roadmap"
  | "terms"
  | "privacy"
  | "safety";

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
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [activeJoiId, setActiveJoiId] = useState<string | null>(null);
  const [dualPair, setDualPair] = useState<{ a: string; b: string } | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [installAppOpen, setInstallAppOpen] = useState(false);
  const [stageGirlId, setStageGirlId] = useState<string | null>(null);
  const [stageFromMatch, setStageFromMatch] = useState(false);

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
    if (existingUser && shouldShowSupportPromptOnLogin()) {
      setSupportModalOpen(true);
    }

    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const nextView = (params.get("view") as View | null) || "home";
        const nextId = params.get("id");
        setView(nextView);
        if (nextId) setSelectedId(nextId);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // NOTE: truncated restore — full page continues in next commit if needed
  if (adult === null || !authReady) return <div className="min-h-screen bg-black" />;

  if (!adult) {
    return (
      <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-pink-500/30 bg-gradient-to-b from-zinc-950 to-black p-8">
          <h1 className="text-3xl font-extrabold text-center text-pink-400">VelvetMotion</h1>
          <p className="text-sm text-zinc-400 text-center mt-3 mb-6">Adult fantasy companions. Fictional 21+ only.</p>
          <label className="flex items-start gap-3 text-sm text-zinc-300 mb-4">
            <input type="checkbox" className="mt-1" id="age-ok" />
            <span>I confirm I am 18 or older and want adult fictional content.</span>
          </label>
          <button
            onClick={() => {
              const el = document.getElementById("age-ok") as HTMLInputElement | null;
              if (!el?.checked) return;
              try { localStorage.setItem("velvet-age", "true"); } catch { /* */ }
              setAdult(true);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold"
          >
            Enter
          </button>
          <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-500">
            <button type="button" onClick={() => setView("terms")}>Terms</button>
            <button type="button" onClick={() => setView("privacy")}>Privacy</button>
            <button type="button" onClick={() => setView("safety")}>Safety</button>
          </div>
        </div>
      </main>
    );
  }

  if (view === "terms" || view === "privacy" || view === "safety") {
    return <LegalPages page={view} onBack={() => setView("home")} />;
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

  const openChatById = (id: string, scenarioPrompt?: string, incomingAssistantNote?: string) => {
    const found = getCharacter(id);
    if (found) setCustomCharacter(found);
    setSelectedId(id);
    setRomanceMode(false);
    setView("chat");
  };

  const selected =
    customCharacter?.id === selectedId
      ? customCharacter
      : (selectedId ? getCharacter(selectedId) : undefined) ?? null;

  return (
    <div className="min-h-screen bg-ink-950 text-white pb-16 lg:pb-0">
      <SiteHeader
        view={view === "chat" || view === "profile" ? listView : (view as ViewId)}
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onNavigate={(v) => { setMenuOpen(false); setView(v as View); }}
        onUserChange={setUser}
      />
      <div className="flex">
        <CandySidebar active={view === "chat" ? "girls" : (view as string)} onNavigate={(v) => setView(v as View)} coins={coins} />
        <div id="main" className={containerClass + " flex-1 py-6 min-w-0"}>
          {view === "home" && (
            <HomeScreen
              onNavigate={(v) => setView(v as View)}
              onOpenGirl={(id, note) => openChatById(id, undefined, note)}
              onOpenDual={(a, b) => { setDualPair({ a, b }); setView("dual"); }}
            />
          )}
          {view === "create" && (
            <CreateGirlWizard
              onHome={() => setView("home")}
              onDone={(character) => {
                setCustomCharacter(character);
                setSelectedId(character.id);
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
          {view === "chat" && selected && (
            <CharacterChat character={selected} romanceMode={romanceMode} onBack={() => setView("home")} />
          )}
          {view === "joi3d" && (
            <Joi3DStage
              onHome={() => { setStageFromMatch(false); setView("home"); }}
              onChat={openChatById}
              initialGirlId={stageGirlId}
              fromMatch={stageFromMatch}
            />
          )}
          {view === "tinder" && (
            <DiscoverSwipe
              onHome={() => setView("home")}
              onChat={openChatById}
              onMeet3D={(c) => {
                setStageGirlId(c.id);
                setStageFromMatch(true);
                setView("joi3d");
              }}
            />
          )}
          {view === "room" && <GoonRoom onHome={() => setView("home")} onChat={openChatById} onOpenDual={(a,b)=>{setDualPair({a,b});setView("dual");}} />}
          {view === "blindfold" && <BlindfoldJoi onHome={() => setView("home")} onChat={openChatById} />}
          {view === "dual" && <DualGirlChat onHome={() => setView("home")} initialGirlAId={dualPair?.a} initialGirlBId={dualPair?.b} />}
          {view === "vault" && <VaultPanel onHome={() => setView("home")} />}
          {view === "wallet" && <CoinWallet onHome={() => setView("home")} />}
          {view === "my-girls" && <MyGirlsHub onHome={() => setView("home")} onOpenGirl={openChatById} />}
          {view === "shorts" && <ShortsFeed onHome={() => setView("home")} onChat={openChatById} />}
          {view === "lounge" && <UserLounge onHome={() => setView("home")} />}
          {view === "workspace" && <WorkspaceHub onHome={() => setView("home")} />}
          {view === "advanced" && <AdvancedMediaSettings onHome={() => setView("home")} />}
          {(view === "girls" || view === "romance") && (
            <CharacterRoster
              romanceMode={view === "romance"}
              query={query}
              category={category}
              tag={tag}
              categories={["All", ...characterCategories()]}
              tags={[]}
              onQuery={setQuery}
              onCategory={setCategory}
              onTag={setTag}
              onSelect={(c) => { setCustomCharacter(c); setSelectedId(c.id); setView("profile"); }}
              onBack={() => setView("home")}
            />
          )}
          {view === "profile" && selected && (
            <CharacterProfile character={selected} romanceMode={romanceMode} onBack={() => setView("girls")} onChat={() => setView("chat")} onTag={() => {}} />
          )}
        </div>
      </div>
      <MobileBottomNav active={view as string} onNavigate={(v) => setView(v as View)} />
      {supportModalOpen && <SupportModal onClose={() => setSupportModalOpen(false)} />}
      {installAppOpen && <InstallAppModal onClose={() => setInstallAppOpen(false)} />}
      {proactive && (
        <ProactiveToast
          ping={proactive}
          onOpen={() => {
            openChatById(proactive.characterId, undefined, proactive.text);
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
