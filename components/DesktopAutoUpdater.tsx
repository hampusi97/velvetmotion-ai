"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { checkDesktopUpdate } from "@/lib/localEngineBridge";
import { RELEASES_PAGE } from "@/lib/desktopRelease";

export const DESKTOP_AUTO_UPDATE_PREF = "vm:auto-signed-desktop-updates";
const POLL_MS = 30 * 60 * 1000;
const FOCUS_THROTTLE_MS = 60 * 1000;

type SignedStatus = { enabled: boolean; available: boolean; version?: string | null };
type UpdateNotice =
  | { kind: "ready"; version?: string }
  | { kind: "signed"; version?: string }
  | { kind: "manual"; version?: string };

const DesktopUpdateContext = createContext<() => Promise<string>>(
  async () => "The desktop update service is unavailable.",
);

export function useDesktopUpdateCheck() {
  return useContext(DesktopUpdateContext);
}

/** Keep startup, periodic and manual checks on the same native update flow. */
export function DesktopUpdateProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const activeRef = useRef(false);
  const installedRef = useRef<Extract<UpdateNotice, { kind: "ready" }> | null>(null);
  const installingRef = useRef(false);
  const restartRef = useRef(false);
  const checkRef = useRef<Promise<string> | null>(null);
  const lastCheckedRef = useRef(0);

  const install = useCallback(async (version?: string) => {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke || installedRef.current || installingRef.current || !activeRef.current) return;
    installingRef.current = true;
    setWorking(true);
    setError("");
    try {
      const outcome = await invoke<string>("install_signed_desktop_update");
      if (!activeRef.current) return;
      const installed = /^Installed signed VelvetMotion update (\S+)\./.exec(outcome);
      if (installed) {
        const ready = { kind: "ready" as const, version: installed[1] || version };
        installedRef.current = ready;
        setNotice(ready);
      } else {
        setNotice(null);
      }
    } catch {
      if (activeRef.current) setError("Could not install the signed update. Retry online or open official releases.");
    } finally {
      installingRef.current = false;
      if (activeRef.current) setWorking(false);
    }
  }, []);

  const check = useCallback((startup = false, manual = false): Promise<string> => {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke) return Promise.resolve("Open the desktop app to check its installed version.");
    if (installedRef.current) {
      if (manual) setNotice(installedRef.current);
      return Promise.resolve("Restart the desktop app to use the installed update.");
    }
    if (installingRef.current) return Promise.resolve("A verified update is being installed.");
    if (checkRef.current) return checkRef.current;
    if (!manual && !startup && Date.now() - lastCheckedRef.current < FOCUS_THROTTLE_MS) {
      return Promise.resolve("");
    }

    lastCheckedRef.current = Date.now();
    const pending = (async () => {
      try {
        const status = await invoke<SignedStatus>("check_signed_desktop_update");
        if (!activeRef.current) return "";
        if (installedRef.current) return "Restart the desktop app to use the installed update.";
        if (installingRef.current) return "A verified update is being installed.";
        if (status.enabled) {
          if (!status.available) {
            setNotice(null);
            setError("");
            return "No newer signed desktop release is available.";
          }
          const version = status.version || undefined;
          setNotice({ kind: "signed", version });
          let autoEnabled = true;
          try {
            autoEnabled = localStorage.getItem(DESKTOP_AUTO_UPDATE_PREF) !== "off";
          } catch {
            // Preference storage is unavailable. Use the default launch policy.
          }
          if (startup && autoEnabled) await install(version);
          return installedRef.current
            ? "Restart the desktop app to use the installed update."
            : `A signed update${version ? ` ${version}` : ""} is available.`;
        }
        const result = await checkDesktopUpdate();
        if (activeRef.current && result.available) {
          setError("");
          setNotice({ kind: "manual", version: result.version });
        }
        return result.note;
      } catch {
        return "Could not reach the secure release feed. Check your internet connection and try again.";
      }
    })();
    checkRef.current = pending;
    void pending.finally(() => {
      if (checkRef.current === pending) checkRef.current = null;
    });
    return pending;
  }, [install]);

  const checkNow = useCallback(() => check(false, true), [check]);

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__?.invoke) return;
    activeRef.current = true;
    const firstCheck = window.setTimeout(() => { void check(true); }, 1800);
    const periodic = window.setInterval(() => { void check(); }, POLL_MS);
    const onFocus = () => { void check(); };
    const onOnline = () => { void check(false, true); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      activeRef.current = false;
      window.clearTimeout(firstCheck);
      window.clearInterval(periodic);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  const restart = async () => {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke || restartRef.current) return;
    restartRef.current = true;
    setWorking(true);
    setError("");
    try {
      await invoke("restart_desktop_after_update");
    } catch {
      if (activeRef.current) setError("Could not restart automatically. Close and reopen the desktop app to use the update.");
    } finally {
      restartRef.current = false;
      if (activeRef.current) setWorking(false);
    }
  };

  return (
    <DesktopUpdateContext.Provider value={checkNow}>
      {children}
      {notice && (
        <div className="fixed bottom-24 left-1/2 z-[96] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-[#e9c0cb]/35 bg-[#211724]/95 p-4 text-[#f6e8ed] shadow-xl backdrop-blur-xl md:bottom-6">
          <div className="flex items-start gap-3">
            {notice.kind === "ready"
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              : <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-[#e6b2c0]" />}
            <div className="min-w-0 flex-1 space-y-2">
              <div role="status">
                <p className="text-sm font-semibold">VelvetMotion desktop update {notice.version || ""}</p>
                <p className="text-xs leading-relaxed text-[#e5d4df]">
                  {notice.kind === "ready" ? "The verified update was installed. Restart when you're ready to use it."
                    : notice.kind === "signed" ? "A signed update is available."
                      : "A new desktop installer is available. Download it manually from GitHub Releases."}
                </p>
              </div>
              {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
              <div className="flex flex-wrap items-center gap-3">
                {notice.kind === "ready" && (
                  <button type="button" disabled={working} onClick={() => void restart()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#b66584] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                    <RefreshCw className="h-3.5 w-3.5" /> {working ? "Restarting…" : "Restart desktop app"}
                  </button>
                )}
                {notice.kind === "signed" && (
                  <button type="button" disabled={working} onClick={() => void install(notice.version)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#b66584] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                    <Download className="h-3.5 w-3.5" /> {working ? "Installing…" : error ? "Retry verified update" : "Install verified update"}
                  </button>
                )}
                <a href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#f3c1d1] hover:text-white">
                  GitHub releases <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <button type="button" disabled={working} onClick={() => {
              setNotice(null);
              setError("");
            }} aria-label="Dismiss update notice" className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </DesktopUpdateContext.Provider>
  );
}
