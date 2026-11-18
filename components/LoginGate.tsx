"use client";

import { useState } from "react";
import { login, type LocalUser } from "@/lib/auth";
import { googleSignIn } from "@/lib/firebase";

export function LoginGate({ onLoggedIn }: { onLoggedIn: (u: LocalUser) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doLocal = () => {
    const u = login(name);
    if (!u) {
      setError("Pick a username (at least 2 characters).");
      return;
    }
    onLoggedIn(u);
  };

  const doGoogle = async () => {
    setBusy(true);
    setError(null);
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
        try {
          localStorage.setItem("vm-user", JSON.stringify(u));
        } catch {}
        onLoggedIn(u);
      } else {
        setError("Google sign-in cancelled or unavailable. Use a local username.");
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
        <p className="text-sm text-zinc-400 text-center mt-3 leading-relaxed">
          Create an account to chat, generate, tribute, and save your girls. Fictional adults 21+ only.
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void doGoogle()}
          className="mt-6 w-full py-3 rounded-2xl border border-white/20 bg-white/5 font-medium hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          <span>or username</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doLocal()}
          placeholder="Choose a username"
          className="w-full rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm outline-none focus:border-pink-500"
          autoFocus
        />
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={doLocal}
          disabled={name.trim().length < 2}
          className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/30 disabled:opacity-40"
        >
          Create account & enter
        </button>
        <p className="mt-4 text-[11px] text-zinc-600 text-center">
          Local accounts stay on this device. Google enables cloud sync when Firebase is configured.
        </p>
      </div>
    </main>
  );
}
