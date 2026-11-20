"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { checkDesktopUpdate } from "@/lib/localEngineBridge";

const PREF_KEY = "vm:auto-signed-desktop-updates";
const RELEASES = "https://github.com/hampusi97/velvetmotion-ai/releases";
const POLL_MS = 30 * 60 * 1000;
const FOCUS_THROTTLE_MS = 60 * 1000;

type SignedStatus = { enabled: boolean; available: boolean; version?: string | null };
type UpdateNotice =
  | { kind: "ready"; version?: string }
  | { kind: "signed"; version?: string }
  | { kind: "manual"; version?: string }
  | { kind: "error"; message: string };

/**
 * The bundled native UI remains local. The desktop connects over HTTPS to
 * GitHub releases and Tauri's signature-verified update feed, not directly to
 * untrusted repository source or arbitrary remote JavaScript.
 *
 * On startup, signed builds may install a verified update automatically.
 * During a session we check every 30 minutes or when the app gains focus, but
 * never auto-install/restart over the top of an active conversation.
 */
export function DesktopAutoUpdater() {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const [working, setWorking] = useState(false);
  const activeRef = useRef(false);
  const installedRef = useRef(false);
  const checkingRef = useRef(false);
  const lastCheckedRef = useRef(0);

  useEffect(() => {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke) return;
    let active = true;
    activeRef.current = true;

    const install = async (version?: string) => {
      if (installedRef.current || !active) return;
      installedRef.current = true;
      setWorking(true);
      try {
        const outcome = await invoke<string>("install_signed_desktop_update");
        if (active && outcome.startsWith("Installed signed")) {
          setNotice({ kind: "ready", version });
        } else if (active) {
          installedRef.current = false;
          setNotice(null);
        }
      } catch (error) {
        installedRef.current = false;
        if (active) {
          setNotice({ kind: "error", message: "The update could not be installed. No unverified code was applied. Open the official releases page or retry online." });
        }
        console.warn("[VelvetMotion] Signed update installation failed", error);
      } finally {
        if (active) setWorking(false);
      }
    };

    const check = async (startOfSession = false) => {
      if (checkingRef.current || installedRef.current || !active) return;
      if (!startOfSession && Date.now() - lastCheckedRef.current < FOCUS_THROTTLE_MS) return;
      checkingRef.current = true;
      lastCheckedRef.current = Date.now();
      try {
        const status = await invoke<SignedStatus>("check_signed_desktop_update");
        if (!active) return;
        if (status.enabled) {
          if (status.available) {
            setNotice({ kind: "signed", version: status.version || undefined });
            let autoEnabled = true;
            try { autoEnabled = localStorage.getItem(PREF_KEY) !== "off"; } catch { /* disabled storage */ }
            if (startOfSession && autoEnabled) await install(status.version || undefined);
          } else {
            setNotice(null);
          }
        } else {
          // Legacy/unsigned builds cannot self-install; inform the user when
          // GitHub has a newer public installer instead of pretending otherwise.
          const result = await checkDesktopUpdate();
          if (active && result.available) setNotice({ kind: "manual", version: result.version });
        }
      } catch {
        // Offline is not a fatal error. Try again on focus / online / interval.
        if (active && startOfSession) setNotice(null);
      } finally {
        checkingRef.current = false;
      }
    };

    const firstCheck = window.setTimeout(() => { void check(true); }, 1800);
    const periodic = window.setInterval(() => { void check(); }, POLL_MS);
    const onFocus = () => { void check(); };
    const onOnline = () => { void check(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      activeRef.current = false;
      window.clearTimeout(firstCheck);
      window.clearInterval(periodic);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!notice) return null;
  const isReady = notice.kind === "ready";
  const isSigned = notice.kind === "signed";
  return (
    <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[96] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-[#e9c0cb]/35 bg-[#211724]/95 p-4 text-[#f6e8ed] shadow-xl backdrop-blur-xl md:bottom-6">
      <div className="flex items-start gap-3">
        {isReady ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> : <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-[#e6b2c0]" />}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">VelvetMotion desktop update {notice.version || ""}</p>
          <p className="text-xs leading-relaxed text-[#e5d4df]">
            {isReady ? "The verified update was installed. Restart when you're ready to use it."
              : isSigned ? "A signed update is online. You can install it now or continue your current conversation."
                : notice.kind === "manual" ? "A new desktop installer is available. This older app must be upgraded manually before in-app signed updates can work."
                  : notice.message}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {isReady ? (
              <button type="button" onClick={() => {
                void window.__TAURI_INTERNALS__?.invoke?.("restart_desktop_after_update");
              }} className="inline-flex items-center gap-1.5 rounded-full bg-[#b66584] px-4 py-2 text-xs font-bold text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Restart desktop app
              </button>
            ) : isSigned ? (
              <button type="button" disabled={working} onClick={() => {
                const invoke = window.__TAURI_INTERNALS__?.invoke;
                if (!invoke || installedRef.current) return;
                installedRef.current = true;
                setWorking(true);
                void invoke<string>("install_signed_desktop_update").then((result) => {
                  if (activeRef.current && result.startsWith("Installed signed")) setNotice({ kind: "ready", version: notice.version });
                  else installedRef.current = false;
                }).catch(() => {
                  installedRef.current = false;
                  if (activeRef.current) setNotice({ kind: "error", message: "Unable to install the signed update. Retry or use official releases." });
                }).finally(() => { if (activeRef.current) setWorking(false); });
              }} className="inline-flex items-center gap-1.5 rounded-full bg-[#b66584] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                <Download className="h-3.5 w-3.5" /> {working ? "Installing..." : "Install verified update"}
              </button>
            ) : null}
            <a href={RELEASES} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#f3c1d1] hover:text-white">
              GitHub releases <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss update notice" className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export const DESKTOP_AUTO_UPDATE_PREF = PREF_KEY;
