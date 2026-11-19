"use client";

import { useEffect, useState } from "react";
import { Smartphone, Tablet, Download, Share, X, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppModal({ onClose }: { onClose: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [isInstalled, setIsInstalled] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIpad = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/i.test(ua) || isIpad) {
      setPlatform("ios");
    } else if (/Android/i.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      setStatusNote(
        platform === "ios"
          ? "On iPhone/iPad Safari, tap the Share button (⬆️) below, then tap 'Add to Home Screen'."
          : "Open your browser menu (⋮) and tap 'Install app' or 'Add to Home screen'.",
      );
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setStatusNote("VelvetMotion AI installed! Launch it from your Home Screen like a native app.");
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 shadow-[0_0_80px_rgba(236,72,153,0.3)] space-y-4 max-h-[90dvh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close app installer"
          className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1 text-xs font-medium text-pink-200">
          <Smartphone className="h-3.5 w-3.5" />
          <Tablet className="h-3.5 w-3.5" />
          Android &amp; Apple (iPhone + iPad)
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-white">
            Get the VelvetMotion App 📱
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Run VelvetMotion AI full-screen on <strong className="text-pink-300">Android phones &amp; tablets</strong> and{" "}
            <strong className="text-amber-300">Apple iPhones &amp; iPads</strong> — zero App Store censorship, instant updates,
            WebRTC voice calls, and 3D Penthouse/JOI Stage support.
          </p>
        </div>

        {isInstalled && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            You are already running VelvetMotion in standalone App Mode!
          </div>
        )}

        {/* Instant Install Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-300">🤖 Android Phone &amp; Tablet</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                1-Tap / APK
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Install directly from Chrome/Edge for full-screen standalone mode, or build the native Kotlin APK from{" "}
              <code className="text-emerald-200">mobile/android</code>.
            </p>
            <button
              type="button"
              onClick={() => void triggerInstall()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
            >
              <Download className="h-3.5 w-3.5" />
              {deferredPrompt ? "Install Android App Now" : "Install on Android"}
            </button>
          </div>

          <div className="rounded-2xl border border-pink-500/30 bg-zinc-900/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-pink-200">🍎 Apple iPhone &amp; iPad</span>
              <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] text-pink-200">
                iOS / iPadOS
              </span>
            </div>
            <ol className="text-xs text-zinc-300 space-y-1 list-decimal list-inside">
              <li>
                Open in Safari &amp; tap <Share className="inline h-3 w-3 text-pink-300" /> <strong>Share</strong>
              </li>
              <li>
                Tap <strong>Add to Home Screen</strong>
              </li>
              <li>Launch full-screen on iPhone or iPad (supports Split View &amp; Landscape)</li>
            </ol>
            <div className="text-[11px] text-zinc-400 pt-1">
              Native SwiftUI Universal App included in <code className="text-pink-200">mobile/ios</code>.
            </div>
          </div>
        </div>

        {statusNote && (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            {statusNote}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/50 p-3.5 text-[11px] text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-200">Developer Native Build Commands</div>
          <div className="font-mono text-pink-300">
            ./scripts/build-mobile.sh android &nbsp;# Android Kotlin APK (Phone &amp; Tablet)
          </div>
          <div className="font-mono text-amber-200">
            ./scripts/build-mobile.sh ios &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Apple SwiftUI Xcode (iPhone &amp; iPad)
          </div>
          <div className="font-mono text-emerald-300">
            ./scripts/build-mobile.sh cap &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Capacitor sync (capacitor.config.ts)
          </div>
        </div>
      </div>
    </div>
  );
}
