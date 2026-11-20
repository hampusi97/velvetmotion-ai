"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import { CHARACTERS, characterCategories, getCharacter, type Character } from "@/lib/characters";
import { containerClass } from "@/lib/cn";
import { getUser, login, type LocalUser } from "@/lib/auth";
import { useCoinsStore } from "@/lib/coinsStore";
import { decodeSharedCharacterHash } from "@/lib/shareCardUrl";
import { appendMainChatMessage, saveCustomCompanionDB } from "@/lib/db";
import { emitVaultUpdated, useFirebaseCloudSync } from "@/lib/firebaseSync";
import { dismissProactive, startProactiveWatcher, type ProactivePing } from "@/lib/proactiveIdle";
import { SiteHeader } from "@/components/site-header";
import { CandySidebar } from "@/components/CandySidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import VelvetExploreShowcase from "@/components/VelvetExploreShowcase";
import { CharacterRoster } from "@/components/CharacterRoster";
import { CharacterProfile } from "@/components/CharacterProfile";
import { CharacterChat } from "@/components/CharacterChat";
import { CreateGirlWizard } from "@/components/CreateGirlWizard";
import DiscoverSwipe from "@/components/DiscoverSwipe";
import { ShortsFeed } from "@/components/ShortsFeed";
import { GroupChat } from "@/components/GroupChat";
import { DualGirlChat } from "@/components/DualGirlChat";
import { BlindfoldJoi } from "@/components/BlindfoldJoi";
import { GoonRoom } from "@/components/GoonRoom";
import { RouletteRoom } from "@/components/RouletteRoom";
import { StripRoulette } from "@/components/StripRoulette";
import { EdgeTimer } from "@/components/EdgeTimer";
import { SpicyScenarioSimulator } from "@/components/SpicyScenarioSimulator";
import { TributeBrowser } from "@/components/TributeBrowser";
import { StoryPackBrowser } from "@/components/content/StoryPackBrowser";
import { JoiBrowser } from "@/components/content/JoiBrowser";
import { parseCompanionSessionTheme, type CompanionSessionTheme } from "@/lib/companionSessionThemes";
import { CardImport } from "@/components/CardImport";
import { ShareImport } from "@/components/ShareImport";
import { UserLounge } from "@/components/UserLounge";
import { VaultPanel } from "@/components/VaultPanel";
import { MyGirlsHub } from "@/components/MyGirlsHub";
import { CoinWallet } from "@/components/CoinWallet";
import { LegalPages } from "@/components/LegalPages";
import { AdvancedMediaSettings } from "@/components/AdvancedMediaSettings";
import MediaStudioModal from "@/components/MediaStudioModal";
import { CollectionGalleryView, PrivateContentView } from "@/components/CollectionAndPrivateViews";
import { DownloadDesktopView } from "@/components/DownloadDesktopView";
import { NeonErrorBoundary } from "@/components/NeonErrorBoundary";
import { SettingsAndBackupDrawer } from "@/components/SettingsAndBackupDrawer";
import { SupporterBanner } from "@/components/SupporterBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LiveUpdateBanner } from "@/components/LiveUpdateBanner";
import { DesktopAutoUpdater } from "@/components/DesktopAutoUpdater";
import { ProactiveToast } from "@/components/ProactiveToast";
import { Penthouse3DSuite } from "@/components/Penthouse3DSuite";
import { Joi3DStage } from "@/components/Joi3DStage";

const SHELL_VIEWS = [
  "home", "discover", "tinder", "chat", "profile", "girls", "romance", "group", "dual",
  "shorts", "collection", "gallery", "private", "create", "studio", "download", "blindfold",
  "room", "roulette", "strip", "edge", "scenario", "tribute", "packs", "joi", "import", "share",
  "lounge", "vault", "my-girls", "wallet", "advanced", "terms", "privacy", "safety", "penthouse", "joi3d",
] as const;

export type ShellRouteView = typeof SHELL_VIEWS[number];

function parseShellView(value: string | null): ShellRouteView | undefined {
  return SHELL_VIEWS.find((view) => view === value);
}

const ENABLE_3D = process.env.NEXT_PUBLIC_ENABLE_3D === "true";

function ComingSoon3DCard({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto my-8 max-w-md neon-border-sweep">
      <div className="neon-sweep-inner p-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 text-[#00f5ff]">
          <Cpu className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-[#f7f7fc] neon-text-glow">
          3D Penthouse — Coming Soon for Desktop GPU
        </h2>
        <p className="text-xs text-[#a6a6c4] leading-relaxed">
          Real-time WebGPU 3D suites and volumetric companions require Local Ultra hardware acceleration.
          Download the VelvetMotion Desktop App for early GPU access.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Link href="/download/" className="rounded-full neon-btn-primary px-5 py-2.5 text-xs font-bold text-white">
            ⚡ Get Desktop App
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-[#a6a6c4] hover:text-white"
          >
            Back to Explore
          </button>
        </div>
      </div>
    </div>
  );
}

function StartupStatus() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#100c13] text-rose-100">
      <p role="status" className="text-sm">Opening VelvetMotion…</p>
    </main>
  );
}

export function AppShell(props: { initialView?: ShellRouteView }) {
  return (
    <Suspense fallback={<StartupStatus />}>
      <AppShellContent {...props} />
    </Suspense>
  );
}

function AppShellContent({ initialView = "home" }: { initialView?: ShellRouteView }) {
  const pathname = usePathname() || "/";
  const search = useSearchParams()?.toString() || "";
  const [view, setView] = useState<ShellRouteView>(initialView);
  const [studioInitialTab, setStudioInitialTab] = useState<"photo" | "video">("photo");
  const [joiTheme, setJoiTheme] = useState<CompanionSessionTheme | null>(null);
  const [storyPackId, setStoryPackId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatRevision, setChatRevision] = useState(0);
  const [chatDraft, setChatDraft] = useState<{ characterId: string; text: string } | null>(null);
  const [customCharacter, setCustomCharacter] = useState<Character | null>(null);
  const [romanceMode, setRomanceMode] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState<string | null>(null);
  const [adult, setAdult] = useState<boolean | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [proactive, setProactive] = useState<ProactivePing | null>(null);
  const [dualPair, setDualPair] = useState<{ a: string; b: string } | null>(null);
  const [sharedImportPreview, setSharedImportPreview] = useState<{
    character?: Character;
    error?: string;
  } | null>(null);

  const { refresh: refreshCoins } = useCoinsStore();
  useFirebaseCloudSync();
  const [bossPinLocked, setBossPinLocked] = useState(false);
  const [bossPinInput, setBossPinInput] = useState("");
  const [bossPinError, setBossPinError] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  useEffect(() => {
    const checkPinLock = () => {
      try {
        const pin = localStorage.getItem("vm-boss-pin") || "";
        if (pin.length === 4) {
          setBossPinInput("");
          setBossPinError(false);
          setBossPinLocked(true);
        }
      } catch {
        /* ignore */
      }
    };
    const onRestore = () => checkPinLock();
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        window.dispatchEvent(new Event("vm:boss-key-mute"));
        checkPinLock();
      }
    };
    window.addEventListener("vm:boss-key-restore", onRestore);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("vm:boss-key-restore", onRestore);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const qView = pathname === "/" ? parseShellView(params.get("view")) : undefined;
    setView(qView ?? initialView);
    setStoryPackId(qView === "packs" ? params.get("pack") : null);
    setStudioInitialTab(pathname.startsWith("/studio") && params.get("mode") === "video" ? "video" : "photo");
    setJoiTheme(pathname.startsWith("/joi") ? parseCompanionSessionTheme(params.get("theme")) : null);
    const qId = params.get("companion") || params.get("id");
    setSelectedId(qId ? getCharacter(qId)?.id ?? qId : null);
    setChatDraft(null);
  }, [initialView, pathname, search]);

  useEffect(() => {
    try {
      setAdult(localStorage.getItem("velvet-age") === "true");

      // Phase 8 #8: Auto-open import preview modal if URL hash contains #import=<compressed>
      if (window.location.hash && window.location.hash.includes("import=")) {
        const hashPart = window.location.hash.split("import=")[1] || "";
        void decodeSharedCharacterHash(hashPart).then((res) => {
          if (res.ok) setSharedImportPreview({ character: res.character });
          else setSharedImportPreview({ error: res.error });
        });
      }
    } catch {
      setAdult(false);
    }

    // Never trap visitors on an auth gate — create instant silent guest session if none exists
    const existing = getUser();
    if (existing) {
      setUser(existing);
    } else {
      const guest = login(`guest${Date.now().toString(36).slice(-4)}`);
      setUser(guest);
    }
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    return startProactiveWatcher(
      () => {
        if (selectedId) {
          const found = customCharacter?.id === selectedId ? customCharacter : getCharacter(selectedId);
          if (found) return found;
        }
        return CHARACTERS[0] || null;
      },
      (ping) => setProactive(ping),
    );
  }, [customCharacter, selectedId, user]);

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const tags = useMemo(() => Array.from(new Set(CHARACTERS.flatMap((c) => c.tags))).sort(), []);

  const selected =
    customCharacter?.id === selectedId
      ? customCharacter
      : (selectedId ? getCharacter(selectedId) : undefined) ?? CHARACTERS[0] ?? null;

  const openChatById = async (id: string, scenarioPrompt?: string, incomingNote?: string) => {
    setChatDraft(null);
    const found = getCharacter(id);
    const scenario = scenarioPrompt?.trim();
    const content = scenario ? `*Scenario:* ${scenario}\n\n“Right here inside the scene with you.”` : incomingNote?.trim();
    if (content) {
      await appendMainChatMessage(id, { role: "assistant", content }, { initialMessage: found?.initialMessage, once: !scenario });
      setChatRevision((value) => value + 1);
    }
    if (found) setCustomCharacter(found);
    setSelectedId(id);
    setRomanceMode(false);
    setView("chat");
  };

  const handleStudioDrop = async (id: string, imageUrl: string, content: string) => {
    await appendMainChatMessage(id, { role: "assistant", content, imageUrl });
    setChatRevision((value) => value + 1);
    setStudioModalOpen(false);
    await openChatById(id);
  };

  const navigate = (next: string) => {
    setMenuOpen(false);
    if (next === "gallery") setView("collection");
    else if (next === "tinder") setView("discover");
    else setView(parseShellView(next) ?? "home");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  if (adult === null) return <StartupStatus />;

  if (!adult) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#120d15] text-rose-50">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[url('/promos/match-lounge.webp')] bg-cover bg-[70%_center] opacity-55" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#120d15] via-[#120d15]/70 to-[#120d15]/45" />
        <div className="mx-auto flex min-h-[100dvh] max-w-6xl items-center p-6 sm:p-12">
          <div className="w-full max-w-md rounded-[2rem] border border-rose-200/25 bg-[#1b121c]/85 p-7 shadow-2xl backdrop-blur-md sm:p-9">
              <p className="mb-3 text-sm font-semibold text-rose-200">Adults only</p>
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">VelvetMotion AI</h1>
              <p className="mt-4 text-sm leading-relaxed text-rose-50/80">
                Explore fictional AI companions and create your own scenes. You must be 18 or older to enter.
              </p>
              <div className="my-5 flex gap-4 text-xs text-rose-100/80">
                <Link href="/terms/" className="underline underline-offset-2 hover:text-white">Terms</Link>
                <Link href="/privacy/" className="underline underline-offset-2 hover:text-white">Privacy</Link>
                <Link href="/policy/" className="underline underline-offset-2 hover:text-white">18+ Policy</Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem("velvet-age", "true");
                  } catch {
                    /* ignore */
                  }
                  setAdult(true);
                }}
                className="w-full rounded-full bg-rose-200 py-3.5 text-sm font-bold text-[#281423] hover:bg-rose-100"
              >
                I am 18+ — Enter VelvetMotion
              </button>
          </div>
        </div>
      </main>
    );
  }

  const suppressFooter =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/group") ||
    view === "chat" ||
    view === "group";

  return (
    <div className="min-h-screen bg-[#08080e] text-[#f7f7fc] pb-16 lg:pb-0">
      <SiteHeader
        view={view}
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onNavigate={navigate}
        onUserChange={setUser}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex">
        <CandySidebar active={view} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} />

        <main
          id="main"
          aria-hidden={menuOpen || undefined}
          className={
            view === "home"
              ? "flex-1 min-w-0"
              : containerClass + (suppressFooter ? " flex-1 py-2 min-w-0" : " flex-1 py-6 min-w-0")
          }
        >
          {view === "home" && <VelvetExploreShowcase />}

          {(view === "girls" || view === "romance") && (
            <CharacterRoster
              romanceMode={romanceMode}
              query={query}
              category={category}
              tag={tag}
              categories={categories}
              tags={tags}
              onQuery={setQuery}
              onCategory={(v) => {
                setCategory(v);
                setTag(null);
              }}
              onTag={setTag}
              onSelect={(c) => {
                setCustomCharacter(c);
                setSelectedId(c.id);
                setView("chat");
              }}
              onBack={() => setView("home")}
            />
          )}

          {view === "profile" && selected && (
            <CharacterProfile
              character={selected}
              romanceMode={romanceMode}
              onBack={() => setView("home")}
              onChat={() => setView("chat")}
              onTag={(t) => {
                setTag(t);
                setCategory("All");
                setView("girls");
              }}
            />
          )}

          {view === "chat" && selected && (
            <NeonErrorBoundary label="Chat Command Center" onReset={() => setView("home")}>
              <CharacterChat
                key={`${selected.id}:${chatRevision}`}
                character={selected}
                initialDraft={chatDraft?.characterId === selected.id ? chatDraft.text : undefined}
                romanceMode={romanceMode}
                onBack={() => {
                  setChatDraft(null);
                  setView("home");
                }}
                onSelectCompanion={(c) => {
                  setChatDraft(null);
                  setCustomCharacter(c);
                  setSelectedId(c.id);
                }}
              />
            </NeonErrorBoundary>
          )}

          {(view === "discover" || view === "tinder") && (
            <NeonErrorBoundary label="Discover" onReset={() => setView("home")}>
              <DiscoverSwipe
                onHome={() => setView("home")}
                onMatch={(c) => {
                  setCustomCharacter(c);
                  setSelectedId(c.id);
                  setView("chat");
                }}
                onStartChat={(profile, openingLine) => {
                  void openChatById(profile.id);
                  if (openingLine) setChatDraft({ characterId: profile.id, text: openingLine });
                }}
              />
            </NeonErrorBoundary>
          )}

          {view === "group" && (
            <NeonErrorBoundary label="2-on-1 Group Drama" onReset={() => setView("home")}>
              <GroupChat onHome={() => setView("home")} />
            </NeonErrorBoundary>
          )}

          {view === "dual" && (
            <DualGirlChat onHome={() => setView("home")} initialGirlAId={dualPair?.a} initialGirlBId={dualPair?.b} />
          )}

          {view === "shorts" && (
            <NeonErrorBoundary label="Velvet Shorts 2.0" onReset={() => setView("home")}>
              <ShortsFeed onHome={() => setView("home")} onChat={(id) => openChatById(id)} />
            </NeonErrorBoundary>
          )}

          {(view === "collection" || view === "gallery") && (
            <CollectionGalleryView onHome={() => setView("home")} onOpenStudio={() => setView("studio")} />
          )}

          {view === "private" && (
            <PrivateContentView onHome={() => setView("home")} onOpenChat={(id) => openChatById(id)} />
          )}

          {view === "create" && (
            <CreateGirlWizard
              onHome={() => setView("home")}
              onDone={(c) => {
                setCustomCharacter(c);
                setSelectedId(c.id);
                setView("chat");
              }}
            />
          )}

          {view === "studio" && (
            <NeonErrorBoundary label="Pro Media Studio" onReset={() => setView("home")}>
              <MediaStudioModal
                isOpen={true}
                standalone={true}
                key={`${selected?.id || ""}:${studioInitialTab}`}
                initialTab={studioInitialTab}
                activeChatCompanionId={selectedId ?? undefined}
                onClose={() => setView("home")}
                onDropIntoChat={handleStudioDrop}
              />
            </NeonErrorBoundary>
          )}

          {view === "download" && <DownloadDesktopView />}
          {view === "blindfold" && <BlindfoldJoi onHome={() => setView("home")} onChat={(id) => openChatById(id)} />}
          {view === "room" && <GoonRoom onHome={() => setView("home")} onChat={openChatById} onOpenDual={(a, b) => { setDualPair({ a, b }); setView("dual"); }} />}
          {view === "roulette" && <RouletteRoom onHome={() => setView("home")} onChat={openChatById} />}
          {view === "strip" && <StripRoulette onHome={() => setView("home")} onChat={openChatById} />}
          {view === "edge" && <EdgeTimer onHome={() => setView("home")} />}
          {view === "scenario" && <SpicyScenarioSimulator onHome={() => setView("home")} onStartChat={(id, p) => openChatById(id, p)} />}
          {view === "tribute" && <TributeBrowser />}
          {view === "packs" && <StoryPackBrowser key={storyPackId || "stories"} initialPackId={storyPackId} />}
          {view === "joi" && <JoiBrowser key={`${selected?.id}:${joiTheme}`} initialCompanionId={selected?.id} initialTheme={joiTheme} />}
          {view === "import" && <CardImport onHome={() => setView("home")} onOpen={(c) => { setCustomCharacter(c); setSelectedId(c.id); setView("chat"); }} />}
          {view === "share" && <ShareImport onHome={() => setView("home")} onImport={(c) => { setCustomCharacter(c); setSelectedId(c.id); setView("chat"); }} />}
          {view === "lounge" && <UserLounge onHome={() => setView("home")} />}
          {view === "vault" && <VaultPanel onHome={() => setView("home")} />}
          {view === "my-girls" && <MyGirlsHub onHome={() => setView("home")} onOpenChat={(c) => openChatById(c.id)} />}
          {view === "wallet" && <CoinWallet onHome={() => setView("home")} onCoinsChanged={refreshCoins} />}
          {view === "advanced" && <AdvancedMediaSettings onHome={() => setView("home")} />}
          {(view === "terms" || view === "privacy" || view === "safety") && <LegalPages page={view} onHome={() => setView("home")} />}

          {(view === "penthouse" || view === "joi3d") &&
            (ENABLE_3D ? (
              view === "penthouse" ? (
                <Penthouse3DSuite onHome={() => setView("home")} onOpenChat={openChatById} />
              ) : (
                <Joi3DStage onHome={() => setView("home")} onChat={openChatById} />
              )
            ) : (
              <ComingSoon3DCard onBack={() => setView("home")} />
            ))}

          {!suppressFooter && (
            <div className={view === "home" ? "mx-auto max-w-[1440px] px-4 sm:px-6 pb-8" : ""}>
              <div className={view === "home" ? "mt-2" : "mt-10"}>
                <SupporterBanner onOpenWallet={() => navigate("wallet")} />
              </div>
              <footer className="mt-6 border-t border-white/[0.08] pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <span>VelvetMotion.ai · 100% Free Companion Studio · Fictional adults 18+ only · Local-First</span>
                <div className="flex flex-wrap gap-4">
                  <Link href="/download/" className="text-[#ff5678] font-semibold hover:underline">Desktop App</Link>
                  <Link href="/terms/" className="hover:text-[#ff5678]">Terms</Link>
                  <Link href="/privacy/" className="hover:text-[#ff5678]">Privacy</Link>
                  <Link href="/policy/" className="hover:text-[#ff5678]">Safety &amp; 18+</Link>
                </div>
              </footer>
            </div>
          )}
        </main>
      </div>

      <MobileBottomNav active={view} onNavigate={navigate} />
      <InstallPrompt />
      <LiveUpdateBanner />
      <DesktopAutoUpdater />
      <SettingsAndBackupDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <NeonErrorBoundary label="Studio Modal" onReset={() => setStudioModalOpen(false)}>
        <MediaStudioModal isOpen={studioModalOpen} onClose={() => setStudioModalOpen(false)} onDropIntoChat={handleStudioDrop} />
      </NeonErrorBoundary>

      {sharedImportPreview && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm neon-border-sweep">
            <div className="neon-sweep-inner p-6 text-center space-y-4">
              {sharedImportPreview.error ? (
                <>
                  <h2 className="text-lg font-extrabold text-rose-400">Share Link Blocked / Invalid</h2>
                  <p className="text-xs text-[#a6a6c4]">{sharedImportPreview.error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSharedImportPreview(null);
                      window.history.replaceState(null, "", window.location.pathname);
                    }}
                    className="w-full rounded-full border border-white/15 py-2.5 text-xs font-bold text-white"
                  >
                    Dismiss
                  </button>
                </>
              ) : sharedImportPreview.character ? (
                <>
                  <span className="inline-block rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-3 py-0.5 text-[10px] font-black text-[#00f5ff]">
                    SHARED FICTIONAL 18+ COMPANION
                  </span>
                  <img
                    src={sharedImportPreview.character.avatar}
                    alt={sharedImportPreview.character.name}
                    className="mx-auto h-28 w-24 rounded-2xl object-cover object-top border border-[#ff1e8e]/60"
                  />
                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      {sharedImportPreview.character.name}, {sharedImportPreview.character.age}
                    </h2>
                    <p className="text-xs text-pink-200 mt-1">{sharedImportPreview.character.tagline}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const c = sharedImportPreview.character!;
                        try {
                          const raw = localStorage.getItem("velvet-custom-girls");
                          const prev = raw ? JSON.parse(raw) : [];
                          localStorage.setItem("velvet-custom-girls", JSON.stringify([c, ...prev].slice(0, 40)));
                        } catch {}
                        void saveCustomCompanionDB(c.id, c as unknown as Record<string, unknown>);
                        emitVaultUpdated();
                        setCustomCharacter(c);
                        setSelectedId(c.id);
                        setSharedImportPreview(null);
                        window.history.replaceState(null, "", window.location.pathname);
                        setView("chat");
                      }}
                      className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-extrabold text-white"
                    >
                      Import Companion &amp; Start Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedImportPreview(null);
                        window.history.replaceState(null, "", window.location.pathname);
                      }}
                      className="w-full rounded-full border border-white/15 py-2 text-xs text-[#a6a6c4]"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
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

      {bossPinLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workspace Locked"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#05050a]/98 backdrop-blur-2xl p-6"
        >
          <div className="w-full max-w-xs rounded-3xl neon-glass p-6 text-center space-y-4">
            <h2 className="font-display text-lg font-extrabold text-[#f7f7fc]">VelvetMotion Locked</h2>
            <p className="text-xs text-[#a6a6c4]">Enter your 4-digit Boss-Key PIN to restore workspace.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={bossPinInput}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                setBossPinInput(next);
                setBossPinError(false);
                if (next.length === 4) {
                  try {
                    const expected = localStorage.getItem("vm-boss-pin") || "";
                    if (!expected || next === expected) {
                      setBossPinLocked(false);
                      setBossPinInput("");
                    } else {
                      setBossPinError(true);
                    }
                  } catch {
                    setBossPinLocked(false);
                  }
                }
              }}
              placeholder="••••"
              className="w-full rounded-2xl border border-[#00f5ff]/50 bg-[#05050a] px-4 py-3 text-center text-xl tracking-[0.6em] font-mono text-white outline-none"
            />
            {bossPinError && <p className="text-xs text-rose-400">Incorrect PIN</p>}
          </div>
        </div>
      )}
    </div>
  );
}
