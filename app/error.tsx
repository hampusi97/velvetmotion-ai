"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VelvetMotion UI boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-950 to-black p-8 text-center space-y-4 shadow-[0_0_80px_rgba(236,72,153,0.25)]">
        <div className="text-4xl">💋</div>
        <h1 className="font-display text-2xl text-white">Momentary Glitch</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Something unexpected happened in your session. Your local chats, coins, and Firestore cloud data are safe.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 text-sm font-semibold text-white"
          >
            Recover Session
          </button>
          <Link
            href="/"
            className="w-full rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs text-zinc-300 hover:bg-white/10"
          >
            Return to VelvetMotion Home
          </Link>
        </div>
      </div>
    </main>
  );
}
