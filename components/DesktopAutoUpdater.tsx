"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, X } from "lucide-react";

const PREF_KEY = "vm:auto-signed-desktop-updates";
const RELEASES = "https://github.com/hampusi97/velvetmotion-ai/releases";

/**
 * On startup, automatically checks and installs ONLY cryptographically signed
 * desktop updates. Runs only inside a native build with the signed-updater
 * feature; unsigned builds never attempt to install updates.
 *
 * The Tauri updater cryptographically verifies artifacts. Existing app state is
 * not interrupted mid-session by periodic forced restarts; on Windows Tauri may
 * exit during installation, so this runs only as the app starts.
 */
export function DesktopAutoUpdater() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.__TAURI_INTERNALS__?.invoke) return;
    let active = true;
    const run = async () => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return;
      try {
        const signed = await invoke<boolean>("desktop_signed_updates_enabled");
        if (!active || !signed) return;
        // Default on for fully signed builds; opt out on the Download page.
        if (localStorage.getItem(PREF_KEY) === "off") return;
        const outcome = await invoke<string>("install_signed_desktop_update");
        if (active && outcome.startsWith("Installed signed")) setStatus(outcome);
      } catch (error) {
        // Network outages and unsigned/missing manifests should not disrupt use.
        // The Download page always offers official manual installers.
        if (active && /signature|invalid public key/i.test(String(error))) {
          setStatus("The latest desktop update could not be verified. No update was installed.");
        }
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  if (!status) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[96] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-[#e9c0cb]/35 bg-[#211724]/95 p-4 text-[#f6e8ed] shadow-xl backdrop-blur-xl md:bottom-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#e6b2c0]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">VelvetMotion desktop update</p>
          <p className="mt-1 text-xs leading-relaxed text-[#e5d4df]">{status}</p>
          <a href={RELEASES} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#f3c1d1] hover:text-white">
            Official releases <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button type="button" onClick={() => setStatus(null)} aria-label="Dismiss update notice" className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export const DESKTOP_AUTO_UPDATE_PREF = PREF_KEY;
