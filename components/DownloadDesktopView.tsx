"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowLeft, ArrowUpRight, CheckCircle2, ChevronRight,
  Cpu, Download, ExternalLink, Film, HardDrive, Laptop, Mic2, Monitor,
  Pause, Play, RefreshCw, ShieldCheck, Sparkles, Waves,
} from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { LocalSetupWizard } from "@/components/LocalSetupWizard";
import { checkDesktopUpdate, useLocalEngineStatus } from "@/lib/localEngineBridge";
import {
  getLocalComputeMode, saveLocalComputeMode, LOCAL_COMPUTE_MODES, type LocalComputeMode,
} from "@/lib/localComputePreferences";
import { getRecommendedPresetsForRam } from "@/data/localModelCatalog";
import {
  DESKTOP_PLATFORMS, RELEASE_API, RELEASES_PAGE,
  chooseDesktopInstaller, detectDesktopPlatform, humanFileSize,
  type DesktopPlatform, type ReleaseAsset,
} from "@/lib/desktopRelease";

type Release = {
  tag_name: string;
  assets: ReleaseAsset[];
  published_at?: string;
  html_url?: string;
};

const STEPS = [
  { title: "Download the desktop app", detail: "Get the installer for your operating system from the official GitHub release.", icon: Download },
  { title: "Choose your inference engine", detail: "For on-device AI, install a compatible model runtime such as Ollama, KoboldCpp or ComfyUI.", icon: Cpu },
  { title: "Connect and create", detail: "Start your model, test the local connection, and use VelvetMotion with your own compute.", icon: Sparkles },
];

export function DownloadDesktopView() {
  const [platform, setPlatform] = useState<DesktopPlatform>("windows");
  const [release, setRelease] = useState<Release | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<"checking" | "ready" | "error">("checking");
  const [computeMode, setComputeMode] = useState<LocalComputeMode>("balanced");
  const [motion, setMotion] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [signedUpdaterEnabled, setSignedUpdaterEnabled] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<string | null>(null);
  const [autoUpdateOnLaunch, setAutoUpdateOnLaunch] = useState(true);
  const engine = useLocalEngineStatus();
  const ram = getRecommendedPresetsForRam(engine.ramGb);
  const installer = release ? chooseDesktopInstaller(release.assets, platform) : null;
  const connections = [
    { title: "Ollama", status: engine.ollamaOnline, detail: "Local conversation" },
    { title: "KoboldCpp", status: engine.koboldOnline, detail: "Local conversation" },
    { title: "ComfyUI", status: engine.comfyOnline, detail: "Image workflows" },
    { title: "Fish voice", status: engine.fishOnline, detail: "Local neural voice" },
    { title: "Kokoro", status: engine.kokoroOnline, detail: "Local neural voice" },
    { title: "Home Engine", status: engine.homeEngineOnline, detail: "Optional bridge" },
  ];

  useEffect(() => {
    setPlatform(detectDesktopPlatform(navigator.userAgent));
    setIsMobile(/iphone|ipad|ipod|android/i.test(navigator.userAgent));
    setComputeMode(getLocalComputeMode());
    try { setAutoUpdateOnLaunch(localStorage.getItem("vm:auto-signed-desktop-updates") !== "off"); } catch { /* storage disabled */ }
    if (window.__TAURI_INTERNALS__?.invoke) {
      void window.__TAURI_INTERNALS__.invoke<boolean>("desktop_signed_updates_enabled")
        .then(setSignedUpdaterEnabled).catch(() => setSignedUpdaterEnabled(false));
      void window.__TAURI_INTERNALS__.invoke<string>("desktop_app_version")
        .then(setInstalledVersion).catch(() => setInstalledVersion(null));
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(RELEASE_API, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("GitHub release request failed");
        const data = await response.json() as Release;
        if (!data.tag_name || !Array.isArray(data.assets) || data.assets.length === 0) {
          throw new Error("No current release assets");
        }
        setRelease(data);
        setReleaseStatus("ready");
      } catch {
        if (!controller.signal.aborted) setReleaseStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const checkForNativeUpdates = async () => {
    setUpdateChecking(true);
    setUpdateCheckResult(null);
    try {
      if (signedUpdaterEnabled && window.__TAURI_INTERNALS__?.invoke) {
        const result = await window.__TAURI_INTERNALS__.invoke<{ enabled: boolean; available: boolean; version?: string }>("check_signed_desktop_update");
        setUpdateCheckResult(result.available
          ? `A signed update ${result.version || ""} is available. The update notification will let you install it safely.`
          : "No newer signed desktop release is available.");
        if (result.available) window.dispatchEvent(new Event("vm:check-desktop-updates"));
      } else {
        const result = await checkDesktopUpdate();
        setUpdateCheckResult(result.note);
      }
    } catch {
      setUpdateCheckResult("Could not reach the secure release feed. Check your internet connection and try again.");
    } finally {
      setUpdateChecking(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 pb-20 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#e7b7be] transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to VelvetMotion
        </Link>
        <span className="rounded-full border border-[#efc5ce]/20 bg-[#2b1a27] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-[#f0c7c8]">
          Private Atelier / Desktop
        </span>
      </header>

      <section className="relative isolate overflow-hidden rounded-[32px] border border-[#ddb0bf]/20 bg-[#1b111d] shadow-[0_35px_95px_rgba(0,0,0,.32)]">
        <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#c45387]/20 blur-[100px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 left-20 h-80 w-80 rounded-full bg-[#a78bfa]/10 blur-[100px]" aria-hidden="true" />
        <div className="relative grid items-center gap-7 px-6 py-10 sm:px-10 sm:py-12 lg:min-h-[430px] lg:grid-cols-[1.1fr_.9fr] lg:gap-9 lg:px-12">
          <div className="relative z-10 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4b3ba]/25 bg-white/[.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.19em] text-[#f0cbd0]">
              <Sparkles className="h-3.5 w-3.5" /> The desktop experience
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl">
              Your stories.
              <span className="block bg-gradient-to-r from-[#f6d8be] via-[#ebabc1] to-[#c4b2f1] bg-clip-text text-transparent">
                Your machine.
              </span>
            </h1>
            <p className="max-w-lg text-sm leading-7 text-[#d7c7d1]">
              A beautiful private-first home for your fictional AI companions. Discover characters, personalize voices
              and connect local models to make the experience your own.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1.5 text-[11px] text-[#eee0e5]">Native desktop window</span>
              <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1.5 text-[11px] text-[#eee0e5]">Optional local inference</span>
              <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1.5 text-[11px] text-[#eee0e5]">Control your providers</span>
            </div>
            <a href="#installer" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d37a95] to-[#a65c85] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#c26589]/15 transition hover:brightness-110">
              Find your installer <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative hidden h-[340px] lg:block" aria-label="A showcase of fictional adult companions">
            <div className="absolute left-[5%] top-[17%] h-[255px] w-[175px] -rotate-6 overflow-hidden rounded-[28px] border border-[#e3c4c4]/30 shadow-[0_22px_60px_rgba(0,0,0,.5)]">
              <SafeImage src="/portraits/sloane-kensington.webp" alt="Sloane, fictional AI companion" className={"h-full w-full object-cover " + (motion ? "vm-download-motion" : "")} />
            </div>
            <div className="absolute left-[31%] top-[1%] z-10 h-[304px] w-[195px] overflow-hidden rounded-[30px] border border-[#e3c4c4]/50 shadow-[0_30px_65px_rgba(0,0,0,.55)]">
              <SafeImage src="/portraits/chloe-parker.webp" alt="Chloe, fictional AI companion" className={"h-full w-full object-cover " + (motion ? "vm-download-motion" : "")} />
            </div>
            <div className="absolute right-[1%] top-[21%] h-[255px] w-[175px] rotate-6 overflow-hidden rounded-[28px] border border-[#e3c4c4]/30 shadow-[0_22px_60px_rgba(0,0,0,.5)]">
              <SafeImage src="/portraits/raven-vance.webp" alt="Raven, fictional AI companion" className={"h-full w-full object-cover " + (motion ? "vm-download-motion" : "")} />
            </div>
            <button type="button" onClick={() => setMotion((v) => !v)} aria-pressed={!motion}
              className="absolute bottom-0 right-4 z-20 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] backdrop-blur-md">
              {motion ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {motion ? "Pause motion" : "Resume motion"}
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Online and desktop update connection" className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border border-[#e7adbc]/20 bg-gradient-to-r from-[#291927] to-[#18131d] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className={"mt-1 h-2.5 w-2.5 shrink-0 rounded-full " + (releaseStatus === "ready" ? "bg-emerald-400" : releaseStatus === "checking" ? "bg-amber-300" : "bg-rose-400")} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">
              {releaseStatus === "ready" ? "Connected to GitHub releases" : releaseStatus === "checking" ? "Connecting to update service..." : "Update service unavailable"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              {installedVersion ? `Installed desktop v${installedVersion} · ` : ""}
              {release?.tag_name ? `Latest published release ${release.tag_name}. ` : ""}
              The desktop uses an internet connection for selected cloud services and verified release checks. Its built-in interface also works offline.
            </p>
          </div>
        </div>
        <a href="https://velvetmotion-ai.vercel.app" target="_blank" rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e4b1c0]/40 bg-[#d18aa4]/10 px-4 py-2 text-xs font-bold text-[#f7d4df] hover:bg-[#d18aa4]/20">
          Open live web experience <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      <section id="installer" className="space-y-5 rounded-[30px] border border-white/10 bg-[#17121b] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e9adbd]">From official GitHub Releases</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Download VelvetMotion</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-400">Choose your computer. The installer contains the desktop interface; AI model downloads are separate.</p>
          </div>
          <span role="status" className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (releaseStatus === "ready" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200")}>
            {releaseStatus === "checking" ? "Checking published installers…" : releaseStatus === "ready" ? release?.tag_name + " · Published" : "Release check unavailable"}
          </span>
        </div>

        {isMobile && <p className="rounded-xl border border-[#edb4c1]/25 bg-[#b95b7a]/10 p-3 text-xs text-[#f2c8d2]">
          You are browsing on a mobile device. These are desktop installers; open this page on a Windows, Mac or Linux computer. On mobile, use the website in your browser.
        </p>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Computer platform">
          {(Object.keys(DESKTOP_PLATFORMS) as DesktopPlatform[]).map((key) => (
            <button key={key} type="button" aria-pressed={platform === key} onClick={() => setPlatform(key)}
              className={"rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200 " +
                (platform === key ? "border-[#e3a9bb]/65 bg-[#b96685]/20" : "border-white/10 bg-white/[.03] hover:border-white/25")}>
              <Monitor className="mb-3 h-4 w-4 text-[#e5acbf]" />
              <span className="block text-xs font-semibold">{DESKTOP_PLATFORMS[key].title}</span>
              <span className="mt-1 block text-[10px] text-zinc-400">{DESKTOP_PLATFORMS[key].subtitle}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border border-[#e7adbc]/15 bg-gradient-to-r from-[#2b1a29] to-[#1c1521] p-4 sm:p-5">
          <div className="max-w-xl">
            <h3 className="text-sm font-semibold text-white">{DESKTOP_PLATFORMS[platform].title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#ccbbc8]">{DESKTOP_PLATFORMS[platform].help}</p>
            {installer && <p className="mt-2 text-[11px] text-[#eebdca]">{installer.name} · {humanFileSize(installer.size)}</p>}
          </div>
          {installer ? (
            <a href={installer.browser_download_url}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-[#d27796] to-[#ac5f86] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110">
              <ArrowDownToLine className="h-4 w-4" /> Download installer
            </a>
          ) : (
            <a href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:border-pink-300/40">
              Browse releases <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          The desktop checks for published releases over the internet. Signed installers can be installed automatically when signing keys are configured; older unsigned versions use official manual downloads.
        </p>
      </section>

      <section className="space-y-5 rounded-[30px] border border-white/10 bg-[#17121b] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e9adbd]">Your local studio</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Use your own RAM and GPU.</h2>
            <p className="mt-2 max-w-xl text-xs text-zinc-400">Connect compatible AI software you run locally. Detecting a service port does not confirm a model is loaded or its content capabilities.</p>
          </div>
          <button type="button" onClick={() => void engine.refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[11px] text-zinc-200 hover:border-white/35">
            <RefreshCw className="h-3.5 w-3.5" /> Test connections
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {connections.map((c) => (
            <div key={c.title} className="rounded-[19px] border border-white/10 bg-white/[.025] p-3">
              <span className={"inline-block h-2 w-2 rounded-full " + (c.status ? "bg-emerald-400" : "bg-zinc-600")} aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold">{c.title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-400">{c.status ? "Port reachable" : "Not detected"}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{c.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e9adbd]">Current mode</p>
          <p className="mt-1 text-lg font-semibold">
            {engine.ollamaOnline ? "LOCAL RAM — Ollama" : engine.koboldOnline ? "LOCAL RAM — KoboldCpp" : "DEMO MODE"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {engine.ollamaOnline || engine.koboldOnline
              ? "A local engine is reachable. Chat can stay on your machine."
              : "No local engine detected. Install Ollama or KoboldCpp, then hit Test connections."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="https://ollama.com" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-zinc-200 hover:border-white/35">Get Ollama</a>
            <a href="https://github.com/LostRuins/koboldcpp" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-zinc-200 hover:border-white/35">Get KoboldCpp</a>
          </div>
        </div>
        <p className="text-[11px] text-[#d3bbca]">Hardware estimate: {ram.label}. Model sizes depend on the real available RAM and VRAM; the browser estimate may be inaccurate.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(LOCAL_COMPUTE_MODES) as LocalComputeMode[]).map((mode) => (
            <button key={mode} type="button" aria-pressed={computeMode === mode}
              onClick={() => { setComputeMode(mode); saveLocalComputeMode(mode); }}
              className={"rounded-[19px] border p-4 text-left transition " + (computeMode === mode ? "border-[#dfa8b8]/60 bg-[#b15b80]/15" : "border-white/10 bg-white/[.025] hover:border-white/25")}>
              <p className="text-sm font-semibold">{LOCAL_COMPUTE_MODES[mode].title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{LOCAL_COMPUTE_MODES[mode].detail}</p>
              <p className="mt-2 text-[10px] text-[#efb9c7]">{LOCAL_COMPUTE_MODES[mode].maxTokens} max output tokens</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: "01 / Install", desc: "Download a language model and local runtime separately.", url: "https://ollama.com/download", icon: HardDrive },
            { title: "02 / Configure", desc: "Pick your local provider in AI settings and start its server.", url: "/?view=advanced", icon: Cpu },
            { title: "03 / Create", desc: "Use an available chat, image, voice or video workflow.", url: "/studio/", icon: Film },
          ].map((step) => {
            const Icon = step.icon;
            return <a key={step.title} href={step.url}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-[#2b1a27] to-[#141018] p-4 transition hover:border-[#e8b3bf]/35">
              <Icon className="h-5 w-5 text-[#ecc0c8]" />
              <h3 className="mt-3 text-xs font-bold">{step.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{step.desc}</p>
              <ArrowUpRight className="mt-3 h-4 w-4 text-[#eeafbf] transition group-hover:translate-x-1" />
            </a>;
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[#dba6b7]/20 bg-gradient-to-br from-[#241726] to-[#151019] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e4b4c1]/25 bg-[#be6b8a]/15">
            <HardDrive className="h-5 w-5 text-[#eac1cb]" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e7b3c0]">Optional local companion bridge</p>
            <h2 className="font-display text-xl font-semibold text-white">Your machine, your runtime.</h2>
          </div>
        </div>
        <p className="max-w-3xl text-xs leading-6 text-[#d0beca]">
          <div className="rounded-2xl border border-[#e9adbd]/30 bg-[#e9adbd]/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e9adbd]">One-click local host</p>
            <h3 className="mt-1 text-lg font-semibold">Host the site on your PC</h3>
            <p className="mt-1 text-xs text-zinc-400">Download, double-click, and open http://127.0.0.1:8787. Uses your RAM/GPU if Ollama, KoboldCpp or ComfyUI is running. Requires Python 3.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/downloads/start-velvet-engine.bat" download className="rounded-full bg-[#e9adbd] px-4 py-2 text-xs font-semibold text-black hover:bg-[#f2c8d2]">Windows (.bat)</a>
              <a href="/downloads/start-velvet-engine.command" download className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40">Mac (.command)</a>
              <a href="/downloads/velvetmotion_home_engine.py" download className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40">Python only</a>
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Optional local AI (for real NSFW / offline)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-zinc-200 hover:border-white/35">Ollama (chat)</a>
              <a href="https://github.com/LostRuins/koboldcpp" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-zinc-200 hover:border-white/35">KoboldCpp</a>
              <a href="https://github.com/Comfy-Org/ComfyUI" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-zinc-200 hover:border-white/35">ComfyUI (images)</a>
              <a href="https://github.com/ciredark/LAIGFE" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-zinc-200 hover:border-white/35">LAIGFE full installer</a>
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">Start the launcher, then open the site. If a local engine is running, NSFW selfies use your GPU.</p>
          </div>
          Already installed Ollama, KoboldCpp or ComfyUI? The optional Python Home Engine can discover running
          local services. It does not install AI models or start a public tunnel. Download the Python engine and a
          matching launcher into the <strong>same folder</strong>; review the source before running it.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/downloads/velvetmotion_home_engine.py" download
            className="inline-flex items-center gap-2 rounded-full bg-[#c66d8b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d4809b]">
            <Download className="h-3.5 w-3.5" /> Home Engine Python
          </a>
          <a href="/downloads/start-velvet-engine.bat" download
            className="inline-flex items-center gap-2 rounded-full border border-[#e5b7c5]/30 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#f0d1db] hover:bg-white/10">
            Windows launcher
          </a>
          <a href="/downloads/start-velvet-engine.command" download
            className="inline-flex items-center gap-2 rounded-full border border-[#e5b7c5]/30 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#f0d1db] hover:bg-white/10">
            macOS / Linux launcher
          </a>
        </div>
        <p className="text-[11px] text-zinc-500">
          Requires Python 3 and local inference software. By default, the bridge binds to 127.0.0.1:8787,
          disables cloud fallback and returns clear errors if no model is installed.
        </p>
      </section>

      <LocalSetupWizard status={engine} onRefresh={engine.refresh} />

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { title: "Your local models", detail: "Inference stays on your device only when you explicitly use an installed local provider.", icon: Cpu },
          { title: "Distinct voices", detail: "Connect a compatible local neural speech service for natural companion audio.", icon: Mic2 },
          { title: "Image and video", detail: "Run compatible media workflows locally, subject to available models and hardware.", icon: Waves },
        ].map((feature) => {
          const Icon = feature.icon;
          return <div key={feature.title} className="rounded-[24px] border border-white/10 bg-[#17121b] p-5">
            <Icon className="h-5 w-5 text-[#eab4c0]" />
            <h3 className="mt-3 font-display text-base font-semibold">{feature.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{feature.detail}</p>
          </div>;
        })}
      </section>

      {engine.isDesktop && (
        <section className="space-y-3 rounded-[24px] border border-[#e8bbca]/20 bg-[#2a1a2b] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-2xl">
              <h2 className="font-display text-lg font-semibold text-white">Signed desktop updates</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                {signedUpdaterEnabled
                  ? "This desktop build supports verified updates. It can check for and install a cryptographically signed update when the app starts."
                  : "This installed desktop build does not have a signed updater configured. Download newer versions from the official GitHub Releases page until a signed build is available."}
              </p>
            </div>
            {signedUpdaterEnabled ? (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-pink-300/25 px-3 py-2 text-xs text-pink-100">
                <input type="checkbox" checked={autoUpdateOnLaunch} className="accent-[#d98da7]"
                  onChange={(e) => {
                    setAutoUpdateOnLaunch(e.target.checked);
                    try { localStorage.setItem("vm:auto-signed-desktop-updates", e.target.checked ? "on" : "off"); } catch { /* private mode */ }
                  }} />
                Auto-install verified updates on launch · check every 30 minutes
              </label>
            ) : (
              <a href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-[#e5bbca]/30 px-4 py-2 text-xs font-semibold text-pink-100 hover:border-pink-300/60">
                Official downloads
              </a>
            )}
          </div>
          <button type="button" disabled={updateChecking} onClick={() => void checkForNativeUpdates()}
            className="inline-flex items-center gap-2 rounded-full border border-[#e9bdc9]/35 bg-white/[.05] px-4 py-2 text-xs font-semibold text-pink-100 transition hover:bg-white/[.08] disabled:opacity-50">
            <RefreshCw className="h-3.5 w-3.5" /> {updateChecking ? "Checking the internet..." : "Check for updates now"}
          </button>
          {updateCheckResult && <p role="status" className="text-xs leading-relaxed text-[#eac6d2]">{updateCheckResult}</p>}
          <p className="text-[11px] text-zinc-500">
            Installation never runs from an unsigned source. Existing sessions are not automatically restarted mid-conversation.
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-[26px] border border-white/10 bg-[#17121b] p-5 sm:p-7">
        <h2 className="font-display text-xl font-semibold">Before you install</h2>
        {[
          ["Does the installer include AI models?", "No. It bundles the desktop interface. You can install Ollama, KoboldCpp, ComfyUI and compatible models separately; your hardware needs determine what will run."],
          ["Will the app run offline?", "The bundled interface and configured local models can work offline for supported features. Account login, cloud generation and remote sync still need internet access."],
          ["Will desktop updates arrive automatically?", "The desktop checks online at startup, on window focus, and every 30 minutes. A build equipped with signed-update keys can install verified updates; older unsigned builds need one manual upgrade. Releases are built after merges to main, not from every unreviewed GitHub commit."],
          ["Are my pictures always stored locally?", "Not necessarily. A local model can process data on your device, while selected cloud providers and sync features may receive uploads. Review provider choices before submitting personal information."],
        ].map(([question, answer]) => (
          <details key={question} className="group rounded-[16px] border border-white/10 bg-white/[.025] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-white marker:text-[#dba3b7]">{question}</summary>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{answer}</p>
          </details>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#e4b0bb]/20 bg-[#281b29] px-5 py-4 text-xs text-[#e5d1d9]">
        <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#ddb4be]" /> Downloads are linked only to the official VelvetMotion GitHub repository.</span>
        <a href={RELEASES_PAGE} rel="noopener noreferrer" target="_blank" className="inline-flex items-center gap-1.5 font-semibold text-[#f0c0ca] hover:text-white">
          All releases <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}
