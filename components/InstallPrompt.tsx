"use client";
import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = Number(localStorage.getItem("vm-install-dismissed") || 0);
    if (Date.now() - dismissed < 7 * 86400000) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      // Delay so it doesn't cover the first interaction
      setTimeout(() => setShow(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm lg:bottom-6 rounded-2xl border border-pink-500/40 bg-zinc-950 p-4 shadow-2xl">
      <p className="text-sm font-medium text-white">Add VelvetMotion to your home screen</p>
      <p className="mt-1 text-xs text-zinc-400">Full screen, faster, no browser bar.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            deferred?.prompt();
            setShow(false);
          }}
          className="flex-1 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-2 text-sm font-semibold"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("vm-install-dismissed", String(Date.now()));
            setShow(false);
          }}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-400"
        >
          Later
        </button>
      </div>
    </div>
  );
}
