"use client";

import { useSyncExternalStore } from "react";

export type RamTier = "8 GB Lite" | "16 GB Balanced" | "32 GB+ Ultra";

export interface SystemSpecs {
  totalRamGb: number;
  availableRamGb: number;
  cpuCores: number;
  os: string;
}

export interface SpeedMetrics {
  tokPerSec?: number;
  imgSec?: number;
  lastEngine?: string;
}

export interface LocalEngineStatus {
  isDesktop: boolean;
  koboldOnline: boolean;
  fishOnline: boolean;
  kokoroOnline: boolean;
  ollamaOnline: boolean;
  comfyOnline: boolean;
  a1111Online: boolean;
  homeEngineOnline: boolean;
  homeTunnelUrl?: string | null;
  anyLocalOnline: boolean;
  ramGb: number;
  ramTier: RamTier;
  specs: SystemSpecs | null;
  checking: boolean;
  metrics: SpeedMetrics;
}

let latestMetrics: SpeedMetrics = {};

export function reportGenerationSpeed(next: SpeedMetrics) {
  latestMetrics = { ...latestMetrics, ...next };
  if (typeof window !== "undefined") {
    publishStatus({ ...currentStatus, metrics: latestMetrics });
    window.dispatchEvent(new CustomEvent("vm:engine-metrics", { detail: latestMetrics }));
  }
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function ramTierForGb(gb: number): RamTier {
  if (gb >= 30) return "32 GB+ Ultra";
  if (gb >= 14) return "16 GB Balanced";
  return "8 GB Lite";
}

async function probeEndpoint(url: string, timeoutMs = 900): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
    return res.ok || res.status === 401 || res.status === 404;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Verify that the local Stable Diffusion WebUI API is actually responding.
 * A TCP listener or generic HTTP 404 does not prove A1111/Forge is usable.
 */
export async function probeA1111Api(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetcher("http://127.0.0.1:7860/sdapi/v1/sd-models", {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const models: unknown = await response.json();
    return Array.isArray(models);
  } catch {
    return false;
  }
}

export async function probeLocalEngines(): Promise<LocalEngineStatus> {
  const desktop = isTauriDesktop();
  let specs: SystemSpecs | null = null;
  let ramGb = 8;

  if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
    const mem = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8);
    if (Number.isFinite(mem) && mem > 0) ramGb = mem;
  }

  let nativePorts: { koboldOnline?: boolean; fishOnline?: boolean; kokoroOnline?: boolean; ollamaOnline?: boolean; comfyOnline?: boolean } | null = null;
  if (desktop && window.__TAURI_INTERNALS__?.invoke) {
    try {
      const [specsRes, portsRes] = await Promise.all([
        window.__TAURI_INTERNALS__.invoke<SystemSpecs>("get_system_specs").catch(() => null),
        window.__TAURI_INTERNALS__
          .invoke<{ koboldOnline: boolean; fishOnline: boolean; kokoroOnline: boolean; ollamaOnline: boolean; comfyOnline: boolean }>("probe_local_engines")
          .catch(() => null),
      ]);
      specs = specsRes;
      nativePorts = portsRes;
      if (specs?.totalRamGb) ramGb = Math.round(specs.totalRamGb);
    } catch {
      /* desktop specs optional */
    }
  }

  let homeEngineBase = "http://127.0.0.1:8787";
  try {
    const rawLlm = localStorage.getItem("velvetmotion_llm_settings");
    if (rawLlm) {
      const parsed = JSON.parse(rawLlm) as { homeEngineUrl?: string };
      if (parsed?.homeEngineUrl?.trim()) homeEngineBase = parsed.homeEngineUrl.trim().replace(/\/+$/, "");
    }
  } catch {
    /* ignore */
  }

  const probeHomeHealth = async () => {
    try {
      const res = await fetch(`${homeEngineBase}/api/health`, { signal: AbortSignal.timeout(900) });
      if (!res.ok) return null;
      return (await res.json()) as {
        totalRamGb?: number;
        availableRamGb?: number;
        cpuCores?: number;
        publicTunnelUrl?: string | null;
        engines?: { koboldcpp?: boolean; ollama?: boolean; comfyui?: boolean };
      };
    } catch {
      return null;
    }
  };

  const [koboldHttp, fishHttp, kokoroHttp, ollamaHttp, comfyHttp, a1111Http, homeHealth] = await Promise.all([
    nativePorts?.koboldOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:5001/api/v1/model"),
    nativePorts?.fishOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:5002/health"),
    nativePorts?.kokoroOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:8880/docs"),
    nativePorts?.ollamaOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:11434/api/tags"),
    nativePorts?.comfyOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:8188/system_stats"),
    probeA1111Api(),
    probeHomeHealth(),
  ]);
  const homeEngineOnline = Boolean(homeHealth);
  if (homeHealth?.totalRamGb && !specs) {
    ramGb = Math.round(homeHealth.totalRamGb);
    specs = {
      totalRamGb: homeHealth.totalRamGb,
      availableRamGb: homeHealth.availableRamGb ?? Math.round(homeHealth.totalRamGb * 0.5),
      cpuCores: homeHealth.cpuCores ?? 4,
      os: "home-engine",
    };
  }
  const koboldOnline = Boolean(nativePorts?.koboldOnline || koboldHttp || homeHealth?.engines?.koboldcpp);
  const fishOnline = Boolean(nativePorts?.fishOnline || fishHttp);
  const kokoroOnline = Boolean(nativePorts?.kokoroOnline || kokoroHttp);
  const ollamaOnline = Boolean(nativePorts?.ollamaOnline || ollamaHttp || homeHealth?.engines?.ollama);
  const comfyOnline = Boolean(nativePorts?.comfyOnline || comfyHttp || homeHealth?.engines?.comfyui);
  const a1111Online = Boolean(a1111Http);

  return {
    isDesktop: desktop,
    koboldOnline,
    fishOnline,
    kokoroOnline,
    ollamaOnline,
    comfyOnline,
    a1111Online,
    homeEngineOnline,
    homeTunnelUrl: homeHealth?.publicTunnelUrl || null,
    anyLocalOnline: koboldOnline || fishOnline || kokoroOnline || ollamaOnline || comfyOnline || a1111Online || homeEngineOnline,
    ramGb,
    ramTier: ramTierForGb(ramGb),
    specs,
    checking: false,
    metrics: latestMetrics,
  };
}

export async function triggerBossKey(): Promise<boolean> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vm:boss-key-mute"));
  }
  if (isTauriDesktop() && window.__TAURI_INTERNALS__?.invoke) {
    try {
      await window.__TAURI_INTERNALS__.invoke("toggle_boss_key");
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Compare only numeric stable release versions, never assume "up to date" on a network error. */
function compareDesktopVersions(installed: string, published: string): number {
  const parse = (v: string) => v.replace(/^v/i, "").split(".").slice(0, 3).map((n) => Number(n));
  const a = parse(installed);
  const b = parse(published);
  if (a.length < 3 || b.length < 3 || [...a, ...b].some((n) => !Number.isInteger(n))) return 0;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

export async function checkDesktopUpdate(): Promise<{ available: boolean; version?: string; note: string }> {
  const desktop = isTauriDesktop();
  let installed: string | null = null;
  if (desktop && window.__TAURI_INTERNALS__?.invoke) {
    try {
      installed = await window.__TAURI_INTERNALS__.invoke<string>("desktop_app_version");
    } catch { /* May be an older installed desktop build. */ }
  }
  try {
    const res = await fetch("https://api.github.com/repos/hampusi97/velvetmotion-ai/releases/latest", {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("GitHub API unavailable");
    const json = (await res.json()) as { tag_name?: string; assets?: Array<{ name?: string }> };
    const published = json.tag_name;
    if (!published || !Array.isArray(json.assets) || !json.assets.length) throw new Error("No installers published");
    if (!desktop) return {
      available: false,
      version: published,
      note: "Latest published desktop installer: " + published + ". See the Download page for your operating system.",
    };
    if (!installed) return {
      available: false,
      version: published,
      note: "Published desktop version: " + published + ". Installed version could not be read; compare manually on GitHub Releases.",
    };
    const newer = compareDesktopVersions(installed, published) < 0;
    return {
      available: newer,
      version: published,
      note: newer
        ? "A newer desktop installer (" + published + ") is published. Your installed version is " + installed + ". Download it manually from official GitHub Releases."
        : "Installed version: " + installed + ". Latest GitHub release: " + published + ". No verified signed auto-updater is configured.",
    };
  } catch {
    return {
      available: false,
      note: "Could not check GitHub Releases. The installed version may be outdated; retry online or check the official releases page.",
    };
  }
}

const initialStatus: LocalEngineStatus = {
  isDesktop: false,
  koboldOnline: false,
  fishOnline: false,
  kokoroOnline: false,
  ollamaOnline: false,
  comfyOnline: false,
  a1111Online: false,
  homeEngineOnline: false,
  homeTunnelUrl: null,
  anyLocalOnline: false,
  ramGb: 8,
  ramTier: "8 GB Lite",
  specs: null,
  checking: true,
  metrics: {},
};

const PROBE_INTERVAL_MS = 15_000;
const subscribers = new Set<() => void>();
let currentStatus = initialStatus;
let refreshInFlight: Promise<void> | null = null;
let lastProbeAt = 0;
let probeTimer: number | undefined;

function publishStatus(status: LocalEngineStatus) {
  currentStatus = status;
  for (const notify of subscribers) notify();
}

function refresh(): Promise<void> {
  if (!refreshInFlight) {
    lastProbeAt = Date.now();
    refreshInFlight = probeLocalEngines()
      .then((next) => publishStatus({ ...next, metrics: latestMetrics }))
      .catch(() => publishStatus({ ...currentStatus, checking: false }))
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function refreshIfVisible() {
  if (!document.hidden && Date.now() - lastProbeAt >= PROBE_INTERVAL_MS) void refresh();
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    refreshIfVisible();
    probeTimer = window.setInterval(refreshIfVisible, PROBE_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      window.clearInterval(probeTimer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    }
  };
}

export function useLocalEngineStatus(): LocalEngineStatus & { refresh: () => Promise<void> } {
  const status = useSyncExternalStore(subscribe, () => currentStatus, () => initialStatus);
  return { ...status, refresh };
}
