"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Cpu, Download, Laptop, RefreshCw, Shield, Smartphone, Sparkles, Volume2 } from "lucide-react";
import { getRecommendedPresetsForRam, VOICE_ENGINE_OPTIONS } from "@/data/localModelCatalog";
import { useLocalEngineStatus } from "@/lib/localEngineBridge";
import { SafeImage } from "@/components/SafeImage";

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

const RELEASES_INDEX = "https://github.com/hampusi97/velvetmotion-ai/releases";
const RELEASE_API = "https://api.github.com/repos/hampusi97/velvetmotion-ai/releases/latest";

interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

function matchAssetUrl(assets: GithubReleaseAsset[], os: DetectedOs): string | null {
  const lower = (s: string) => s.toLowerCase();
  if (os === "windows") {
    return (
      assets.find((a) => lower(a.name).endsWith(".exe"))?.browser_download_url ||
      assets.find((a) => lower(a.name).endsWith(".msi"))?.browser_download_url ||
      null
    );
  }
  if (os === "mac-arm") {
    return (
      assets.find((a) => /aarch64|arm64/.test(lower(a.name)) && lower(a.name).endsWith(".dmg"))?.browser_download_url ||
      assets.find((a) => lower(a.name).endsWith(".dmg"))?.browser_download_url ||
      null
    );
  }
  if (os === "mac-intel") {
    return (
      assets.find((a) => /x64|x86_64/.test(lower(a.name)) && lower(a.name).endsWith(".dmg"))?.browser_download_url ||
      assets.find((a) => lower(a.name).endsWith(".dmg"))?.browser_download_url ||
      null
    );
  }
  if (os === "linux") {
    return (
      assets.find((a) => lower(a.name).endsWith(".appimage"))?.browser_download_url ||
      assets.find((a) => lower(a.name).endsWith(".deb"))?.browser_download_url ||
      null
    );
  }
  return null;
}

const OS_OPTIONS: Record<DetectedOs, { label: string; installer: string; note: string; href: string }> = {
  windows: {
    label: "Download for Windows (x64 .exe / .msi)",
    installer: ".exe Installer",
    note: "Windows 10/11 64-bit · Auto-updates daily via GitHub Releases",
    href: RELEASES_INDEX,
  },
  "mac-arm": {
    label: "Download for macOS Apple Silicon (.dmg)",
    installer: "M1/M2/M3/M4 .dmg",
    note: "Universal & Metal-ready · Auto-updates daily via GitHub Releases",
    href: RELEASES_INDEX,
  },
  "mac-intel": {
    label: "Download for macOS Intel (.dmg)",
    installer: "x64 .dmg",
    note: "macOS 12+ · Auto-updates daily via GitHub Releases",
    href: RELEASES_INDEX,
  },
  linux: {
    label: "Download for Linux (.AppImage / .deb)",
    installer: "AppImage & .deb",
    note: "Ubuntu, Debian, Fedora, Arch · Auto-updates daily via GitHub Releases",
    href: RELEASES_INDEX,
  },
  mobile: {
    label: "Install Mobile PWA App (1-Tap)",
    installer: "Home Screen App",
    note: "iOS Safari → Share → Add to Home Screen · Android Chrome → Install",
    href: "/",
  },
};

export function DownloadDesktopView() {
  const [os, setOs] = useState<DetectedOs>("windows");
  const [releaseTag, setReleaseTag] = useState<string | null>(null);
  const [releaseAssets, setReleaseAssets] = useState<GithubReleaseAsset[]>([]);
  const [releaseState, setReleaseState] = useState<"checking" | "live" | "pending">("checking");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [probeToast, setProbeToast] = useState<string | null>(null);
  const engine = useLocalEngineStatus();
  const ramCatalog = getRecommendedPresetsForRam(engine.ramGb);

  useEffect(() => {
    setOs(detectOs());
    let active = true;
    fetch(RELEASE_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tag_name?: string; assets?: GithubReleaseAsset[] } | null) => {
        if (!active) return;
        if (data && data.tag_name && Array.isArray(data.assets) && data.assets.length > 0) {
          setReleaseTag(data.tag_name);
          setReleaseAssets(data.assets);
          setReleaseState("live");
        } else {
          setReleaseState("pending");
        }
      })
      .catch(() => {
        if (active) setReleaseState("pending");
      });
    return () => {
      active = false;
    };
  }, []);

  const rec = OS_OPTIONS[os];
  const resolvedHref = os === "mobile" ? "/" : matchAssetUrl(releaseAssets, os) || RELEASES_INDEX;

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

          {/* Hyper-Neon Desktop Preview Showcase */}
          <div className="mx-auto max-w-xl rounded-2xl border border-[#ff1e8e]/35 bg-[#05050a]/90 p-3 flex items-center justify-center gap-3">
            <img src="/icon-512.png" alt="VelvetMotion Icon" className="h-14 w-14 rounded-2xl border border-[#00f5ff]/50 shadow-[0_0_20px_rgba(0,245,255,0.3)]" />
            <div className="flex -space-x-3">
              <img src="/portraits/nova-park.webp" alt="Nova Park" className="h-14 w-14 rounded-full object-cover object-top border-2 border-[#ff1e8e]" />
              <img src="/portraits/chloe-parker.webp" alt="Chloe Parker" className="h-14 w-14 rounded-full object-cover object-top border-2 border-[#00f5ff]" />
              <img src="/portraits/aria-montgomery.webp" alt="Aria Montgomery" className="h-14 w-14 rounded-full object-cover object-top border-2 border-[#a855f7]" />
            </div>
            <div className="text-left text-[11px] leading-tight">
              <p className="font-extrabold text-[#00ffa3]">● Tauri v2 Native Bridge</p>
              <p className="text-[#a6a6c4]">CORS-free :5001 · :11434 · :8188</p>
              <p className="text-[#00f5ff]">Firebase + Cloudflare Synced</p>
            </div>
          </div>

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
                href={resolvedHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full neon-btn-primary px-7 py-3.5 text-sm font-extrabold text-white"
              >
                <Download className="h-4 w-4" /> {releaseTag ? `${rec.label} · ${releaseTag}` : rec.label}
              </a>
            )}
            <span className="text-xs text-[#00ffa3] font-semibold">
              {releaseState === "live" && releaseTag
                ? `${releaseTag} Live Installer Ready · ${rec.note}`
                : releaseState === "pending"
                  ? "Installers build automatically once v1.0.0 tag is pushed · Full Web & PWA works now"
                  : rec.note}
            </span>
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
                href={matchAssetUrl(releaseAssets, k) || RELEASES_INDEX}
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

      {/* Detected RAM SOTA Nov 2026 Models + Port Tester */}
      <section className="rounded-3xl neon-glass p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#ff5678]" /> Recommended for Your Hardware · {ramCatalog.label} ({engine.ramGb} GB RAM)
            </h2>
            <p className="text-xs text-[#a6a6c4]">
              One-click launch commands for KoboldCpp (:5001), Fish Audio Drama 3 (:5002), Ollama (:11434), and ComfyUI (:8188).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void engine.refresh().then(() => setProbeToast("Probed :5001, :5002, :11434, and :8188."))}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ff5678]/45 bg-[#ff5678]/15 px-3.5 py-1.5 text-xs font-bold text-[#ff8aa1] hover:bg-[#ff5678]/25"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Test Local Connection
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            ["KoboldCpp :5001", engine.koboldOnline],
            ["Fish Drama :5002", engine.fishOnline],
            ["Ollama :11434", engine.ollamaOnline],
            ["ComfyUI :8188", engine.comfyOnline],
          ].map(([lbl, on]) => (
            <div
              key={String(lbl)}
              className={`rounded-xl border px-3 py-2 text-center font-semibold ${
                on ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-[#141418] text-zinc-400"
              }`}
            >
              ● {lbl}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ramCatalog.presets.map((preset) => (
            <div key={preset.id} className="rounded-2xl border border-white/10 bg-[#141418] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{preset.name}</span>
                <span className="shrink-0 rounded-full bg-[#ff5678]/20 border border-[#ff5678]/40 px-2 py-0.5 text-[10px] font-bold text-[#ff8aa1]">
                  {preset.badge}
                </span>
              </div>
              <p className="text-xs text-[#a6a6c4] leading-relaxed">{preset.description}</p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d0d11] px-3 py-2 font-mono text-[11px] text-zinc-300">
                <span className="truncate">{preset.launchCommand}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(preset.launchCommand);
                    setCopiedId(preset.id);
                    setProbeToast(`Copied ${preset.name} command.`);
                    setTimeout(() => setCopiedId(null), 1500);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#ff5678]/45 bg-[#ff5678]/15 px-2.5 py-1 text-[11px] font-sans font-bold text-white"
                >
                  {copiedId === preset.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId === preset.id ? "Copied" : "Copy Launch Command"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {probeToast && <p className="text-xs font-semibold text-emerald-300">{probeToast}</p>}
      </section>

      {/* SOTA Voice Engines */}
      <section className="rounded-3xl neon-glass p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-[#ff5678]" /> Neural Voice Engines (Browser WebGPU &amp; Local Audio.cpp)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VOICE_ENGINE_OPTIONS.map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-[#141418] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{v.label}</span>
                <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-bold text-[#ff8aa1]">
                  {v.footprint}
                </span>
              </div>
              <div className="text-[10px] font-bold text-emerald-300">{v.badge}</div>
              <p className="text-[11px] text-[#a6a6c4] leading-snug">{v.description}</p>
            </div>
          ))}
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
