"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import { CHARACTERS, characterCategories, getCharacter, type Character } from "@/lib/characters";
import { containerClass } from "@/lib/cn";
import { getUser, login, type LocalUser } from "@/lib/auth";
import { loadChat, saveChat } from "@/lib/storage";
import { useCoinsStore } from "@/lib/coinsStore";
import { dismissProactive, startProactiveWatcher, type ProactivePing } from "@/lib/proactiveIdle";
import { SiteHeader } from "@/components/site-header";
import { CandySidebar } from "@/components/CandySidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { HomeView } from "@/components/home-view";
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
import { InstallPrompt } from "@/components/InstallPrompt";
import { ProactiveToast } from "@/components/ProactiveToast";
import { Penthouse3DSuite } from "@/components/Penthouse3DSuite";
import { Joi3DStage } from "@/components/Joi3DStage";

export type ShellRouteView =
  | "home"
  | "discover"
  | "tinder"
  | "chat"
  | "profile"
  | "girls"
  | "romance"
  | "group"
  | "dual"
  | "shorts"
  | "collection"
  | "gallery"
  | "private"
  | "create"
  | "studio"
  | "download"
  | "blindfold"
  | "room"
  | "roulette"
  | "strip"
  | "edge"
  | "scenario"
  | "tribute"
  | "packs"
  | "joi"
  | "import"
  | "share"
  | "lounge"
  | "vault"
  | "my-girls"
  | "wallet"
  | "advanced"
  | "terms"
  | "privacy"
  | "safety"
  | "penthouse"
  | "joi3d";

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

export function AppShell({ initialView = "home" }: { initialView?: ShellRouteView }) {
  const pathname = usePathname() || "/";
  const [view, setView] = useState<ShellRouteView>(initialView);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const { refresh: refreshCoins } = useCoinsStore();
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autostart") === "1") {
        localStorage.setItem("velvet-age", "true");
        setAdult(true);
      } else {
        setAdult(localStorage.getItem("velvet-age") === "true");
      }
      const qView = params.get("view") as ShellRouteView | null;
      if (qView && pathname === "/") setView(qView);
      const qId = params.get("id");
      if (qId) setSelectedId(qId);
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

  const openChatById = (id: string, scenarioPrompt?: string, incomingNote?: string) => {
    const found = getCharacter(id);
    if (found) setCustomCharacter(found);
    if (scenarioPrompt?.trim()) {
      const prev = loadChat(id);
      const base = prev.length ? prev : found ? [{ role: "assistant" as const, content: found.initialMessage }] : [];
      saveChat(id, [
        ...base,
        { role: "assistant", content: `*Scenario:* ${scenarioPrompt.trim()}\n\n“Right here inside the scene with you.”` },
      ]);
    } else if (incomingNote?.trim()) {
      const prev = loadChat(id);
      if (!prev.some((m) => m.content === incomingNote.trim())) {
        const base = prev.length ? prev : found ? [{ role: "assistant" as const, content: found.initialMessage }] : [];
        saveChat(id, [...base, { role: "assistant", content: incomingNote.trim() }]);
      }
    }
    setSelectedId(id);
    setRomanceMode(false);
    setView("chat");
  };

  const navigate = (next: string) => {
    setMenuOpen(false);
    if (next === "gallery") setView("collection");
    else if (next === "tinder") setView("discover");
    else setView(next as ShellRouteView);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  if (adult === null) return <div className="min-h-screen bg-[#05050a]" />;

  if (!adult) {
    return (
      <main className="min-h-screen bg-[#05050a] text-white relative overflow-hidden">
        <div className="absolute inset-0 blur-md scale-105 opacity-60 pointer-events-none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
            {CHARACTERS.slice(0, 8).map((c) => (
              <img key={c.id} src={c.avatar} alt="" className="aspect-[2/3] w-full object-cover object-top rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-[#05050a]/75 backdrop-blur-md" />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="max-w-md w-full neon-border-sweep">
            <div className="neon-sweep-inner p-8 text-center space-y-4">
              <div className="text-5xl font-display font-black bg-gradient-to-r from-[#ff1e8e] to-[#00f5ff] bg-clip-text text-transparent neon-text-glow">
                V
              </div>
              <h1 className="text-3xl font-black text-white neon-text-glow">VelvetMotion AI</h1>
              <p className="text-sm text-[#a6a6c4] leading-relaxed">
                Hyper-Neon uncensored companion studio. Fictional consenting adults 18+ only. Zero server logging.
              </p>
              <div className="flex gap-4 justify-center text-xs text-[#a6a6c4]">
                <Link href="/terms/" className="underline hover:text-[#00f5ff]">Terms</Link>
                <Link href="/privacy/" className="underline hover:text-[#00f5ff]">Privacy</Link>
                <Link href="/policy/" className="underline hover:text-[#00f5ff]">18+ Policy</Link>
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
                className="w-full py-3.5 rounded-2xl neon-btn-primary text-sm font-extrabold text-white"
              >
                I am 18+ — Enter VelvetMotion
              </button>
            </div>
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
    <div className="min-h-screen bg-[#05050a] text-[#f7f7fc] pb-16 lg:pb-0">
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
          className={containerClass + (suppressFooter ? " flex-1 py-2 min-w-0" : " flex-1 py-6 min-w-0")}
        >
          {view === "home" && (
            <HomeView
              onNavigate={navigate}
              onOpenGirl={(id, note) => openChatById(id, undefined, note)}
              onOpenDual={(a, b) => {
                setDualPair({ a, b });
                setView("dual");
              }}
            />
          )}

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
                character={selected}
                romanceMode={romanceMode}
                onBack={() => setView("home")}
                onSelectCompanion={(c) => {
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
                onStartChat={(profile, opener) => openChatById(profile.id, undefined, opener)}
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
                activeChatCompanionId={selected?.id}
                onClose={() => setView("home")}
                onDropIntoChat={(id, imgUrl, cap) => {
                  const prev = loadChat(id);
                  saveChat(id, [...prev, { role: "assistant", content: cap, imageUrl: imgUrl }]);
                  openChatById(id);
                }}
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
          {view === "packs" && <StoryPackBrowser />}
          {view === "joi" && <JoiBrowser />}
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
            <footer className="mt-12 border-t border-white/10 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#a6a6c4]">
              <span>VelvetMotion AI · Hyper-Neon Noir · Fictional adults 18+ only · Local-First</span>
              <div className="flex flex-wrap gap-4">
                <Link href="/download/" className="text-[#00f5ff] font-semibold hover:underline">Desktop App</Link>
                <Link href="/terms/" className="hover:text-[#ff1e8e]">Terms</Link>
                <Link href="/privacy/" className="hover:text-[#ff1e8e]">Privacy</Link>
                <Link href="/policy/" className="hover:text-[#ff1e8e]">Safety &amp; 18+</Link>
              </div>
            </footer>
          )}
        </main>
      </div>

      <MobileBottomNav active={view} onNavigate={navigate} />
      <InstallPrompt />
      <SettingsAndBackupDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <NeonErrorBoundary label="Studio Modal" onReset={() => setStudioModalOpen(false)}>
        <MediaStudioModal isOpen={studioModalOpen} onClose={() => setStudioModalOpen(false)} />
      </NeonErrorBoundary>

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
