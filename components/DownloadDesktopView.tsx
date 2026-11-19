"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Cpu, Download, Laptop, Shield, Smartphone, Sparkles } from "lucide-react";

type DetectedOs = "mac-arm" | "mac-intel" | "windows" | "linux" | "mobile";

function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return "mobile";
  if (/macintosh|mac os x/.test(ua)) {
    // Heuristic for Apple Silicon vs Intel
    return /arm|m1|m2|m3|m4/.test(ua) || (navigator.maxTouchPoints || 0) > 1 ? "mac-arm" : "mac-arm";
  }
  if (/linux/.test(ua)) return "linux";
  return "windows";
}

const RELEASE_BASE = "https://github.com/hampusi97/velvetmotion-ai/releases/latest";

const OS_OPTIONS: Record<DetectedOs, { label: string; installer: string; note: string }> = {
  windows: { label: "Download for Windows (x64 .exe / .msi)", installer: ".exe Installer", note: "Windows 10/11 64-bit · Auto-updates daily" },
  "mac-arm": { label: "Download for macOS Apple Silicon (.dmg)", installer: "M1/M2/M3/M4 .dmg", note: "Universal & Metal-ready · Auto-updates daily" },
  "mac-intel": { label: "Download for macOS Intel (.dmg)", installer: "x64 .dmg", note: "macOS 12+ · Auto-updates daily" },
  linux: { label: "Download for Linux (.AppImage / .deb)", installer: "AppImage & .deb", note: "Ubuntu, Debian, Fedora, Arch · Auto-updates daily" },
  mobile: { label: "Install Mobile PWA App (1-Tap)", installer: "Home Screen App", note: "iOS Safari → Share → Add to Home Screen · Android Chrome → Install" },
};

export function DownloadDesktopView() {
  const [os, setOs] = useState<DetectedOs>("windows");

  useEffect(() => {
    setOs(detectOs());
  }, []);

  const rec = OS_OPTIONS[os];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <Link href="/" className="text-xs text-[#00f5ff] hover:underline">
          ← Back to Explore
        </Link>
      </div>

      {/* Hero Card */}
      <section className="neon-border-sweep">
        <div className="neon-sweep-inner p-6 sm:p-10 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#00f5ff]">
            <Sparkles className="h-3.5 w-3.5" /> HYBRID TAURI v2 DESKTOP + LOCAL ULTRA MODE
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white neon-text-glow">
            VelvetMotion Desktop App
          </h1>
          <p className="mx-auto max-w-xl text-sm text-[#a6a6c4]">
            Same zero-cost companion experience—supercharged with Local RAM/GPU inference (KoboldCpp, Ollama, ComfyUI),
            Cmd/Ctrl+Shift+H Boss-Key tray stealth, Offline Airplane Mode, and two-layer daily auto-updates.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {os === "mobile" ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full neon-btn-primary px-7 py-3.5 text-sm font-extrabold text-white"
              >
                <Smartphone className="h-4 w-4" /> {rec.label}
              </Link>
            ) : (
              <a
                href={RELEASE_BASE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full neon-btn-primary px-7 py-3.5 text-sm font-extrabold text-white"
              >
                <Download className="h-4 w-4" /> {rec.label}
              </a>
            )}
            <span className="text-xs text-[#00ffa3] font-semibold">{rec.note}</span>
          </div>

          {/* All OS Download Pills */}
          <div className="pt-3 flex flex-wrap justify-center gap-2 text-xs">
            {(
              [
                ["windows", "Windows (.exe / .msi)"],
                ["mac-arm", "macOS Apple Silicon"],
                ["mac-intel", "macOS Intel"],
                ["linux", "Linux (.AppImage / .deb)"],
              ] as const
            ).map(([k, lbl]) => (
              <a
                key={k}
                href={RELEASE_BASE}
                target="_blank"
                rel="noreferrer"
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${
                  os === k
                    ? "border-[#00f5ff] bg-[#00f5ff]/15 text-[#00f5ff]"
                    : "border-white/15 text-[#a6a6c4] hover:border-[#ff1e8e]/50 hover:text-white"
                }`}
              >
                {lbl}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Web Free vs Desktop Local Ultra Table */}
      <section className="rounded-3xl neon-glass p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-[#f7f7fc] flex items-center gap-2">
          <Laptop className="h-5 w-5 text-[#ff1e8e]" /> Web Free vs Desktop Local Ultra
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#a6a6c4]">
                <th className="py-2.5 pr-4">Capability</th>
                <th className="py-2.5 px-4 text-white">Web Free (Browser)</th>
                <th className="py-2.5 pl-4 text-[#00f5ff]">Desktop Local Ultra (Tauri v2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[
                ["Chat LLM Inference", "Cloud Free / BYOK / Localhost", "Auto-connects KoboldCpp & Ollama (zero wait)"],
                ["Selfie & Image Quality", "Cloudflare Flux + AI Horde", "Local ComfyUI FLUX/SDXL + Cloud fallback"],
                ["Boss-Key & Tray Stealth", "Tab switch", "Global CmdOrCtrl+Shift+H instant hide + audio mute + PIN lock"],
                ["Offline Airplane Mode", "Cached static UI shell", "100% offline bundled build + local GGUF models"],
                ["Daily App Updates", "Instant on page refresh", "Layer 1 live web sync + Layer 2 signed binary updater"],
              ].map(([cap, web, desktop]) => (
                <tr key={cap}>
                  <td className="py-3 pr-4 font-bold text-[#f7f7fc]">{cap}</td>
                  <td className="py-3 px-4 text-[#a6a6c4]">{web}</td>
                  <td className="py-3 pl-4 text-[#00ffa3] font-medium flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0" /> {desktop}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3-Step Local RAM Guide */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            tier: "8 GB Lite",
            color: "border-white/15",
            steps: "Install Ollama or KoboldCpp with a 4B–8B Q4_K_M GGUF chat model and keep Cloud Free enabled for portraits.",
          },
          {
            tier: "16 GB Balanced",
            color: "border-[#ff1e8e]/45",
            steps: "Run 12B Q4_K_M GGUF unfiltered chat alongside local SDXL / FLUX GGUF portraits via ComfyUI on port 8188.",
          },
          {
            tier: "32 GB+ Ultra",
            color: "border-[#00f5ff]/55",
            steps: "Unlock 24B–32B GGUF chat, full-precision FLUX Dev portraits, Kokoro-82M neural TTS, and local FramePack/Wan 2.2 video.",
          },
        ].map((card, i) => (
          <div key={card.tier} className={`rounded-3xl neon-glass border ${card.color} p-5 space-y-2`}>
            <div className="text-[10px] font-black uppercase tracking-wider text-[#00f5ff] flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" /> Step {i + 1} · {card.tier}
            </div>
            <p className="text-xs text-[#f7f7fc] leading-relaxed">{card.steps}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-white/10 bg-[#0c0c16] p-4 flex items-center gap-3 text-xs text-[#a6a6c4]">
        <Shield className="h-5 w-5 text-[#00ffa3] shrink-0" />
        <span>
          Mobile PWA users on iOS or Android can install directly from their browser Share/Install menu for an edge-to-edge full-screen OLED experience.
        </span>
      </div>
    </div>
  );
}
