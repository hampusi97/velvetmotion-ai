"use client";

import { useEffect, useRef, useState } from "react";
import { containerClass, cn } from "@/lib/cn";
import { sections, type ViewId } from "@/lib/sections";
import { CloseIcon, Mark, MenuIcon } from "./icons";
import { getUser, login, logout, type LocalUser } from "@/lib/auth";
import { getCoins } from "@/lib/storage";
import {
  emailPasswordSignIn,
  emailPasswordSignUp,
  googleSignIn,
  initAuth,
  refreshFirebaseUser,
  resendVerificationEmail,
  subscribeAuthState,
} from "@/lib/firebase";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    setCoins(getCoins());
    const unsubInit = initAuth();
    const unsubState = subscribeAuthState((fbUser) => {
      if (fbUser) {
        setNeedsEmailVerify(!fbUser.isAnonymous && !fbUser.emailVerified);
        const nextUser: LocalUser = {
          username: fbUser.displayName || fbUser.email?.split("@")[0] || "VelvetMember",
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
        onUserChange?.(nextUser);
      } else {
        setNeedsEmailVerify(false);
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

  const doEmailAuth = async () => {
    setAuthError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || password.length < 6) {
      setAuthError("Enter a valid email and a 6+ character password.");
      return;
    }
    try {
      const res =
        authMode === "signup"
          ? await emailPasswordSignUp(cleanEmail, password, name.trim() || undefined)
          : await emailPasswordSignIn(cleanEmail, password);
      const nextUser: LocalUser = {
        username:
          res.user.displayName || name.trim() || res.user.email?.split("@")[0] || "VelvetMember",
        joinedAt: Date.now(),
        uid: res.user.uid,
        email: res.user.email,
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
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Email authentication failed.");
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
                className="hidden sm:inline-flex items-center gap-1.5 max-w-[11rem] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream hover:bg-white/10"
                title={user.isFirebase ? "Firebase Cloud Sync Active — Click to log out" : "Local session — Click to log out"}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    user.isFirebase ? "bg-emerald-400" : "bg-amber-400",
                  )}
                />
                <span className="truncate">{user.username}</span>
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
      {needsEmailVerify && (
        <div className="border-b border-amber-500/30 bg-amber-950/60 px-4 py-1.5 text-center text-xs text-amber-100 flex flex-wrap items-center justify-center gap-2">
          <span>
            📧 Verify your email ({user?.email}) to activate full Firestore Cloud Sync for your vault &amp; coins.
          </span>
          <button
            type="button"
            onClick={async () => {
              try {
                await resendVerificationEmail();
                setVerifyNotice("Verification email resent!");
              } catch {
                setVerifyNotice("Wait a moment before resending.");
              }
            }}
            className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 font-semibold hover:bg-amber-500/30"
          >
            Resend Link
          </button>
          <button
            type="button"
            onClick={async () => {
              const refreshed = await refreshFirebaseUser();
              if (refreshed?.emailVerified) {
                setNeedsEmailVerify(false);
                setVerifyNotice(null);
              } else {
                setVerifyNotice("Not verified yet — click the link in your inbox first.");
              }
            }}
            className="rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-100 hover:bg-emerald-500/30"
          >
            I Verified — Refresh
          </button>
          {verifyNotice && <span className="text-emerald-300">{verifyNotice}</span>}
        </div>
      )}
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
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl space-y-3">
            <h2 className="font-display text-xl text-cream">Log in to VelvetMotion</h2>
            <p className="text-xs text-mist">
              Sign in with Email/Password or Google for Firebase Cloud Sync (`ivory-sunset-mxq1s`), or use a local username.
            </p>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-ink-950 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium",
                  authMode === "signin" ? "bg-rose-600 text-white" : "text-zinc-400",
                )}
              >
                Sign In (Email)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium",
                  authMode === "signup" ? "bg-rose-600 text-white" : "text-zinc-400",
                )}
              >
                Create Account
              </button>
            </div>

            <div className="space-y-2">
              {authMode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display username"
                  className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs outline-none focus:border-rose-500"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs outline-none focus:border-rose-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void doEmailAuth()}
                placeholder="Password (6+ characters)"
                className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => void doEmailAuth()}
                className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                {authMode === "signup" ? "Create Email Account" : "Sign In with Email"}
              </button>
            </div>

            <div className="flex justify-center pt-1">
              <GoogleSignInButton onClick={doGoogleLogin} />
            </div>
            {authError && <p className="text-xs text-rose-300">{authError}</p>}
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>or quick username</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                placeholder="Choose a name"
                aria-label="Local username"
                className="flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={doLogin}
                disabled={name.trim().length < 2}
                className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100 disabled:opacity-40"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
