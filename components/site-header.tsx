"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Settings, Volume2, VolumeX, X } from "lucide-react";
import { containerClass, cn } from "@/lib/cn";
import { type ViewId } from "@/lib/sections";
import { CloseIcon, Mark, MenuIcon } from "./icons";
import { getUser, login, logout, type LocalUser } from "@/lib/auth";
import { useCoinsStore } from "@/lib/coinsStore";
import { useLocalEngineStatus } from "@/lib/localEngineBridge";
import { isUiSoundEnabled, setUiSoundEnabled } from "@/lib/neonAudio";
import { emailPasswordSignIn, emailPasswordSignUp, googleSignIn, initAuth, signInAnonymousGuest, auth } from "@/lib/firebase";
import { emitVaultUpdated } from "@/lib/firebaseSync";

const NAV_LINKS = [
  { href: "/", label: "Explore", id: "home" },
  { href: "/discover/", label: "Discover", id: "discover" },
  { href: "/chat/", label: "Chat", id: "chat" },
  { href: "/group/", label: "Group chat", id: "group" },
  { href: "/shorts/", label: "Shorts", id: "shorts" },
  { href: "/studio/", label: "Studio", id: "studio" },
  { href: "/download/", label: "Desktop", id: "download" },
];

export function SiteHeader({
  view,
  menuOpen,
  onToggleMenu,
  onNavigate,
  onUserChange,
  onOpenSettings,
}: {
  view?: ViewId | string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate?: (view: ViewId) => void;
  onUserChange?: (user: LocalUser | null) => void;
  onOpenSettings?: () => void;
}) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const { coins } = useCoinsStore();
  const engine = useLocalEngineStatus();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setUser(getUser());
    setSoundOn(isUiSoundEnabled());
    const onSound = () => setSoundOn(isUiSoundEnabled());
    window.addEventListener("vm:ui-sound-changed", onSound);
    const unsubAuth = initAuth((fbUser) => {
      const nextUser: LocalUser = {
        username:
          fbUser.displayName ||
          (fbUser.isAnonymous ? `cloud-${fbUser.uid.slice(0, 5)}` : fbUser.email?.split("@")[0]) ||
          "VelvetMember",
        joinedAt: Date.now(),
        uid: fbUser.uid,
        email: fbUser.email,
        isFirebase: true,
      };
      try {
        localStorage.setItem("vm-user", JSON.stringify(nextUser));
      } catch {
        /* ignore */
      }
      setUser(nextUser);
      setLoginOpen(false);
      onUserChange?.(nextUser);
      emitVaultUpdated();
    });
    return () => {
      window.removeEventListener("vm:ui-sound-changed", onSound);
      unsubAuth();
    };
  }, [onUserChange]);

  // Close Auth modal or mobile menu cleanly on Escape
  useEffect(() => {
    if (!loginOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (loginOpen) setLoginOpen(false);
        else if (menuOpen) onToggleMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loginOpen, menuOpen, onToggleMenu]);

  const doLocal = () => {
    const clean = name.trim();
    if (clean.length < 2) return;
    const u = login(clean);
    if (u) {
      setUser(u);
      setLoginOpen(false);
      setName("");
      setAuthError(null);
      onUserChange?.(u);
    }
  };

  const applyFirebaseUser = (fbUser: { uid: string; displayName: string | null; email: string | null; isAnonymous: boolean }) => {
    const nextUser: LocalUser = {
      username:
        fbUser.displayName ||
        name.trim() ||
        (fbUser.isAnonymous ? `cloud-${fbUser.uid.slice(0, 5)}` : fbUser.email?.split("@")[0]) ||
        "VelvetMember",
      joinedAt: Date.now(),
      uid: fbUser.uid,
      email: fbUser.email,
      isFirebase: true,
    };
    try {
      localStorage.setItem("vm-user", JSON.stringify(nextUser));
    } catch {
      /* ignore */
    }
    setUser(nextUser);
    setLoginOpen(false);
    setAuthError(null);
    onUserChange?.(nextUser);
    emitVaultUpdated();
  };

  const doEmailAuth = async () => {
    setAuthError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || password.length < 6) {
      setAuthError("Enter a valid email and 6+ character password.");
      return;
    }
    try {
      const res =
        authMode === "signup"
          ? await emailPasswordSignUp(cleanEmail, password, name.trim() || undefined)
          : await emailPasswordSignIn(cleanEmail, password);
      applyFirebaseUser(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    }
  };

  const doGoogleAuth = async () => {
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        applyFirebaseUser(res.user);
      } else {
        setAuthError("Redirecting to Google Sign-In...");
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Google Sign-In failed.");
    }
  };

  const doAnonymousCloudSync = async () => {
    setAuthError(null);
    try {
      const res = await signInAnonymousGuest();
      applyFirebaseUser(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Anonymous Cloud Sync failed.");
    }
  };

  const displayHandle = user?.username || "guest";
  const isGuest = displayHandle.startsWith("guest");

  return (
    <div className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <header className="border-b border-white/10 bg-[#05050a]/90 backdrop-blur-xl">
        <div className={cn(containerClass, "flex h-16 items-center gap-2 sm:gap-3")}>
          <Link href="/" className="inline-flex shrink-0 items-center gap-2 pr-1">
            <Mark className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold tracking-tight text-[#f7f7fc] neon-text-glow hidden xs:inline">
              VelvetMotion
            </span>
          </Link>

          <nav aria-label="Top Navigation" className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
            {NAV_LINKS.map((item) => {
              const active = view === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    active ? "neon-btn-primary text-white" : "text-[#a6a6c4] hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Phase 5 & 8 Live Speed HUD Pill */}
            <Link
              href="/download/"
              title={engine.anyLocalOnline ? "Local GPU/RAM Engine Connected" : "Running on Cloud Free Inference"}
              className={cn(
                "hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition tabular-nums",
                engine.anyLocalOnline
                  ? "border-[#00f5ff]/60 bg-[#00f5ff]/15 text-[#00f5ff] shadow-[0_0_12px_rgba(0,245,255,0.28)]"
                  : "border-white/15 bg-white/5 text-[#a6a6c4] hover:border-[#00f5ff]/45",
              )}
            >
              {engine.anyLocalOnline
                ? `⚡ Local Ultra (${engine.ramGb} GB RAM${engine.metrics.tokPerSec ? ` · ${engine.metrics.tokPerSec} tok/s` : engine.metrics.imgSec ? ` · ${engine.metrics.imgSec}s img` : ""})`
                : `☁️ Cloud Free${engine.metrics.tokPerSec ? ` · ${engine.metrics.tokPerSec} tok/s` : engine.metrics.imgSec ? ` · ${engine.metrics.imgSec}s img` : ""}`}
            </Link>

            <button
              type="button"
              aria-label={soundOn ? "Mute UI sounds" : "Enable UI sounds"}
              title={soundOn ? "Neon UI SFX On" : "Neon UI SFX Muted"}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setUiSoundEnabled(next);
              }}
              className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0c0c16] text-[#a6a6c4] hover:border-[#00f5ff] hover:text-[#00f5ff]"
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5 text-[#00f5ff]" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <Link
              href="/?view=wallet"
              onClick={() => onNavigate?.("wallet" as ViewId)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200 tabular-nums hover:bg-amber-500/20"
            >
              🪙 {coins}
            </Link>

            {/* Bug #1: guest* pill opens non-blocking dismissible Auth Modal */}
            <button
              type="button"
              onClick={() => {
                if (isGuest || !user) {
                  setLoginOpen(true);
                } else {
                  logout();
                  void auth.signOut().catch(() => {});
                  const g = { username: `guest${Date.now().toString(36).slice(-4)}`, joinedAt: Date.now(), email: null };
                  setUser(g);
                  onUserChange?.(g);
                }
              }}
              className="inline-flex items-center gap-1.5 max-w-[9.5rem] truncate rounded-full border border-[#ff1e8e]/35 bg-[#0c0c16] px-3 py-1.5 text-xs font-semibold text-[#f7f7fc] hover:border-[#ff1e8e]"
              title={isGuest ? "Click to open optional Cloud Sync modal" : "Cloud Sync active — click to switch back to local guest"}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", user?.isFirebase ? "bg-[#00ffa3]" : "bg-[#00f5ff]")} />
              <span className="truncate">{user?.isFirebase ? `☁️ ${displayHandle}` : displayHandle}</span>
            </button>

            {onOpenSettings && (
              <button
                type="button"
                aria-label="Open Settings & Backup"
                onClick={onOpenSettings}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#0c0c16] text-[#a6a6c4] hover:border-[#00f5ff] hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
              aria-expanded={menuOpen}
              onClick={onToggleMenu}
            >
              {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/75" onClick={onToggleMenu} />
          <nav className="relative max-h-[80dvh] overflow-y-auto border-b border-white/10 bg-[#080812] p-3 space-y-1">
            {[
              { href: "/", label: "Home / Explore" },
              { href: "/discover/", label: "Discover" },
              { href: "/chat/", label: "Chat" },
              { href: "/group/", label: "Group chat" },
              { href: "/shorts/", label: "Shorts" },
              { href: "/collection/", label: "Collection" },
              { href: "/private/", label: "Private Content" },
              { href: "/create/", label: "Create Character" },
              { href: "/studio/", label: "Media Studio" },
              { href: "/download/", label: "Desktop App (⚡ ULTRA)" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggleMenu}
                className="block rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#f7f7fc] hover:bg-[#ff1e8e]/15"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Bug #1 Fixed Auth Modal: high-contrast neon X, Escape key, and backdrop close */}
      {loginOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Account Settings"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLoginOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl neon-glass bg-[#0c0c16] p-6 shadow-2xl space-y-3">
            <button
              type="button"
              aria-label="Close Auth Modal"
              onClick={() => setLoginOpen(false)}
              className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full border border-[#ff1e8e] bg-[#ff1e8e]/20 text-white hover:bg-[#ff1e8e]/40"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="font-display text-xl font-extrabold text-[#f7f7fc] neon-text-glow">Local-First &amp; Cloud Sync</h2>
            <p className="text-xs text-[#a6a6c4]">
              VelvetMotion runs offline/local in IndexedDB by default—sign in below only to sync Coins, Memory Vault, Streaks &amp; Custom Characters across Web &amp; Desktop.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void doGoogleAuth()}
                className="rounded-xl border border-white/20 bg-white/10 py-2 text-xs font-bold text-white hover:border-[#00f5ff] hover:bg-white/15"
              >
                Google Sign-In
              </button>
              <button
                type="button"
                onClick={() => void doAnonymousCloudSync()}
                className="rounded-xl border border-[#00ffa3]/45 bg-[#00ffa3]/10 py-2 text-xs font-bold text-[#00ffa3] hover:bg-[#00ffa3]/20"
              >
                Anonymous Cloud Sync
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#05050a] p-1">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={cn("rounded-lg py-1.5 text-xs font-semibold", authMode === "signin" ? "neon-btn-primary" : "text-[#a6a6c4]")}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={cn("rounded-lg py-1.5 text-xs font-semibold", authMode === "signup" ? "neon-btn-primary" : "text-[#a6a6c4]")}
              >
                Register
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#ff1e8e]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void doEmailAuth()}
                placeholder="Password (6+ chars)"
                className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#ff1e8e]"
              />
              <button
                type="button"
                onClick={() => void doEmailAuth()}
                className="w-full rounded-xl neon-btn-primary py-2.5 text-xs font-bold text-white"
              >
                {authMode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </div>

            {authError && <p className="text-xs text-rose-300">{authError}</p>}

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLocal()}
                placeholder="Custom display nickname"
                className="flex-1 rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#00f5ff]"
              />
              <button
                type="button"
                onClick={doLocal}
                disabled={name.trim().length < 2}
                className="rounded-xl border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-3 py-2 text-xs font-bold text-[#00f5ff] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
