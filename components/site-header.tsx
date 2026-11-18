"use client";

import { useEffect, useRef, useState } from "react";
import { containerClass, cn } from "@/lib/cn";
import { sections, type ViewId } from "@/lib/sections";
import { CloseIcon, Mark, MenuIcon } from "./icons";
import { getUser, login, logout, type LocalUser } from "@/lib/auth";
import { getCoins } from "@/lib/storage";
import { googleSignIn, initAuth, subscribeAuthState } from "@/lib/firebase";
import { GoogleSignInButton } from "./WorkspaceHub";
import { GoonStreakWidget } from "./GoonStreakWidget";

export function SiteHeader({
  view,
  menuOpen,
  onToggleMenu,
  onNavigate,
  onUserChange,
}: {
  view: ViewId;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (view: ViewId) => void;
  onUserChange?: (user: LocalUser | null) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [coins, setCoins] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    setCoins(getCoins());
    const unsubInit = initAuth();
    const unsubState = subscribeAuthState((fbUser) => {
      if (fbUser) {
        const nextUser: LocalUser = {
          username: fbUser.displayName || fbUser.email?.split("@")[0] || "Google User",
          joinedAt: Date.now(),
          uid: fbUser.uid,
          email: fbUser.email,
          isFirebase: true,
        };
        setUser(nextUser);
        onUserChange?.(nextUser);
      } else {
        const local = getUser();
        setUser(local);
        onUserChange?.(local);
      }
    });
    const t = setInterval(() => setCoins(getCoins()), 2000);
    return () => {
      clearInterval(t);
      unsubInit();
      unsubState();
    };
  }, [onUserChange]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("button");
    first?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, onToggleMenu]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches && menuOpen) onToggleMenu();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [menuOpen, onToggleMenu]);

  const doLogin = () => {
    const u = login(name);
    if (u) {
      setUser(u);
      setLoginOpen(false);
      setName("");
      setAuthError(null);
      onUserChange?.(u);
    }
  };

  const doGoogleLogin = async () => {
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        const nextUser: LocalUser = {
          username: res.user.displayName || res.user.email?.split("@")[0] || "Google User",
          joinedAt: Date.now(),
          uid: res.user.uid,
          email: res.user.email,
          isFirebase: true,
        };
        setUser(nextUser);
        setLoginOpen(false);
        onUserChange?.(nextUser);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Google Sign-In failed.");
    }
  };

  const doLogout = () => {
    logout();
    setUser(null);
    onUserChange?.(null);
  };

  return (
    <div className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <header className="border-b border-white/10 bg-ink-950/90 backdrop-blur-md">
        <div className={cn(containerClass, "flex h-16 items-center gap-2 sm:gap-3")}>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            aria-label="VelvetMotion Home"
            aria-current={view === "home" ? "page" : undefined}
            className="press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full pr-1"
          >
            <Mark className="h-8 w-8" />
            <span className="font-display text-lg sm:text-xl tracking-[-0.03em] text-cream hidden xs:inline">
              VelvetMotion
            </span>
          </button>
          <nav aria-label="Sections" className="hidden min-w-0 flex-1 md:block">
            <ul className="flex items-center gap-1 overflow-x-auto px-1 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.slice(0, 8).map((section) => {
                const active = view === section.id;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(section.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium",
                        active ? "bg-rose-600 text-white" : "text-mist hover:bg-white/5 hover:text-cream"
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <GoonStreakWidget />
            <button
              type="button"
              onClick={() => onNavigate("wallet" as ViewId)}
              title="Open Coin Wallet & Support ($5 optional)"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 transition"
            >
              <span aria-hidden>🪙</span>
              <span>{coins}</span>
            </button>
            {user ? (
              <button
                type="button"
                onClick={doLogout}
                className="hidden sm:inline-flex max-w-[9rem] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream hover:bg-white/10"
                title="Log out"
              >
                {user.username}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="hidden sm:inline-flex rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
              >
                Log in
              </button>
            )}
            <button
              type="button"
              className="press inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cream md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={onToggleMenu}
            >
              {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            </button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 md:hidden"
          style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/65"
            onClick={onToggleMenu}
          />
          <nav
            id="mobile-menu"
            ref={panelRef}
            aria-label="Sections"
            role="dialog"
            aria-modal="true"
            className="relative max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-b border-white/10 bg-ink-900/95 backdrop-blur-md"
          >
            <ul className="flex flex-col gap-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <li className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs text-amber-200">Coins: {coins}</span>
                <GoonStreakWidget />
              </li>
              <li className="px-3 pb-2">
                {user ? (
                  <button type="button" onClick={doLogout} className="text-sm text-mist">
                    {user.username} · Log out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu();
                      setLoginOpen(true);
                    }}
                    className="text-sm text-rose-300"
                  >
                    Log in to chat & generate
                  </button>
                )}
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("home")}
                  aria-current={view === "home" ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-base font-medium",
                    view === "home" ? "bg-rose-600 text-white" : "text-cream hover:bg-white/5"
                  )}
                >
                  Home
                </button>
              </li>
              {sections.map((section) => {
                const active = view === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(section.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-base",
                        active ? "bg-rose-600 font-medium text-white" : "text-cream hover:bg-white/5"
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}

      {loginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setLoginOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <h2 className="font-display text-xl text-cream">Log in</h2>
            <p className="mt-1 text-sm text-mist">
              Sign in with Google for Firebase & Workspace sync, or choose a local username on this device.
            </p>
            <div className="mt-4 flex justify-center">
              <GoogleSignInButton onClick={doGoogleLogin} />
            </div>
            {authError && <p className="mt-2 text-xs text-rose-300">{authError}</p>}
            <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>or local username</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              placeholder="Choose a name"
              aria-label="Local username"
              className="w-full rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm outline-none focus:border-rose-500"
              autoFocus
            />
            <button
              type="button"
              onClick={doLogin}
              disabled={name.trim().length < 2}
              className="mt-4 w-full rounded-2xl bg-rose-600 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
