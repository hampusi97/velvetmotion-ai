"use client";

import { useState } from "react";
import { login, type LocalUser } from "@/lib/auth";
import {
  emailPasswordSignIn,
  emailPasswordSignUp,
  googleSignIn,
  resetEmailPassword,
} from "@/lib/firebase";

export function LoginGate({ onLoggedIn }: { onLoggedIn: (u: LocalUser) => void }) {
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persistAndEnter = (u: LocalUser) => {
    try {
      localStorage.setItem("vm-user", JSON.stringify(u));
    } catch {
      /* ignore */
    }
    onLoggedIn(u);
  };

  const doEmailPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res =
        authMode === "signup"
          ? await emailPasswordSignUp(cleanEmail, password, name.trim() || undefined)
          : await emailPasswordSignIn(cleanEmail, password);

      const u: LocalUser = {
        username:
          res.user.displayName ||
          name.trim() ||
          res.user.email?.split("@")[0] ||
          "VelvetMember",
        joinedAt: Date.now(),
        uid: res.user.uid,
        email: res.user.email,
        isFirebase: true,
      };
      persistAndEnter(u);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Email/password authentication failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const doPasswordReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter your email above first to receive a password reset link.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await resetEmailPassword(cleanEmail);
      setInfo(`Password reset link sent to ${cleanEmail}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send password reset email.");
    } finally {
      setBusy(false);
    }
  };

  const doLocal = () => {
    const u = login(name || email.split("@")[0] || "");
    if (!u) {
      setError("Pick a username (at least 2 characters).");
      return;
    }
    onLoggedIn(u);
  };

  const doGoogle = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        const u: LocalUser = {
          username: res.user.displayName || res.user.email?.split("@")[0] || "User",
          joinedAt: Date.now(),
          uid: res.user.uid,
          email: res.user.email,
          isFirebase: true,
        };
        persistAndEnter(u);
      } else {
        setError("Google sign-in cancelled or unavailable. Use Email/Password or a username.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-950 to-black p-8 shadow-[0_0_80px_rgba(236,72,153,0.25)]">
        <div className="text-5xl mb-3 text-center">💋</div>
        <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
          VelvetMotion
        </h1>
        <p className="text-sm text-zinc-400 text-center mt-2 leading-relaxed">
          Sign in with Email/Password or Google to sync your companions, Coin Wallet, and Firestore vault. Fictional adults 21+ only.
        </p>

        {/* Email / Password Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setError(null);
              setInfo(null);
            }}
            className={`rounded-xl py-2 text-xs font-semibold transition ${
              authMode === "signup"
                ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Create Account (Email)
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("signin");
              setError(null);
              setInfo(null);
            }}
            className={`rounded-xl py-2 text-xs font-semibold transition ${
              authMode === "signin"
                ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign In (Email)
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {authMode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display username (e.g. VelvetVIP)"
              className="w-full rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm outline-none focus:border-pink-500"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm outline-none focus:border-pink-500"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void doEmailPassword()}
            placeholder="Password (6+ characters)"
            className="w-full rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm outline-none focus:border-pink-500"
            autoComplete={authMode === "signup" ? "new-password" : "current-password"}
          />

          {error && <p className="text-xs text-rose-300">{error}</p>}
          {info && <p className="text-xs text-emerald-300">{info}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={() => void doEmailPassword()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/30 disabled:opacity-40"
          >
            {busy
              ? "Authenticating with Firebase…"
              : authMode === "signup"
                ? "Create Email Account & Enter"
                : "Sign In with Email & Password"}
          </button>

          {authMode === "signin" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void doPasswordReset()}
              className="w-full text-center text-xs text-pink-300 hover:text-pink-200"
            >
              Forgot password? Send reset email
            </button>
          )}
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void doGoogle()}
          className="w-full py-3 rounded-2xl border border-white/20 bg-white/5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        {/* Quick Guest Username Fallback */}
        <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLocal()}
            placeholder="Or quick guest username"
            className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs outline-none focus:border-pink-500"
          />
          <button
            type="button"
            onClick={doLocal}
            disabled={(name || email.split("@")[0] || "").trim().length < 2}
            className="rounded-xl border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-xs font-semibold text-pink-100 hover:bg-pink-500/25 disabled:opacity-40"
          >
            Guest Enter
          </button>
        </div>

        <p className="mt-3 text-[11px] text-zinc-500 text-center">
          Firebase Project: <span className="font-mono text-zinc-400">ivory-sunset-mxq1s</span> · Email/Password &amp; Firestore Cloud Sync Enabled
        </p>
      </div>
    </main>
  );
}
