"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

interface BuildMeta {
  version?: string;
  commitSha?: string;
  builtAt?: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function LiveUpdateBanner() {
  const initialRef = useRef<BuildMeta | null>(null);
  const [availableMeta, setAvailableMeta] = useState<BuildMeta | null>(null);
  const [dismissedSha, setDismissedSha] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    const checkMeta = async () => {
      try {
        const res = await fetch(`/build-meta.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const meta = (await res.json()) as BuildMeta;
        if (!active || !meta?.builtAt) return;

        if (!initialRef.current) {
          initialRef.current = meta;
          return;
        }

        const prev = initialRef.current;
        const changed =
          (meta.commitSha && prev.commitSha && meta.commitSha !== prev.commitSha) ||
          (meta.builtAt && prev.builtAt && meta.builtAt !== prev.builtAt);

        if (changed) {
          setAvailableMeta(meta);
        }
      } catch {
        // Offline or network hiccup; silently skip until next poll
      }
    };

    void checkMeta();
    const timer = window.setInterval(() => void checkMeta(), POLL_INTERVAL_MS);
    const onFocus = () => void checkMeta();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!availableMeta) return null;
  const sig = `${availableMeta.commitSha || ""}:${availableMeta.builtAt || ""}`;
  if (dismissedSha === sig) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#ff5678]/40 bg-[#18181c]/95 px-4 py-3 text-white shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-white hover:text-[#ff7894] transition"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5678]/20 text-[#ff5678]">
            <RefreshCw className="h-3.5 w-3.5" />
          </span>
          <span>
            ⚡ New VelvetMotion Update Live — Tap to Refresh
            {availableMeta.version ? (
              <span className="ml-1.5 text-[11px] font-normal text-zinc-400">v{availableMeta.version}</span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          aria-label="Dismiss update notification"
          onClick={() => setDismissedSha(sig)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
