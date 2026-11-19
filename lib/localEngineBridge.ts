"use client";

import { useCallback, useEffect, useState } from "react";

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
  ollamaOnline: boolean;
  comfyOnline: boolean;
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

export async function probeLocalEngines(): Promise<LocalEngineStatus> {
  const desktop = isTauriDesktop();
  let specs: SystemSpecs | null = null;
  let ramGb = 8;

  if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
    const mem = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8);
    if (Number.isFinite(mem) && mem > 0) ramGb = mem;
  }

  let nativePorts: { koboldOnline?: boolean; fishOnline?: boolean; ollamaOnline?: boolean; comfyOnline?: boolean } | null = null;
  if (desktop && window.__TAURI_INTERNALS__?.invoke) {
    try {
      const [specsRes, portsRes] = await Promise.all([
        window.__TAURI_INTERNALS__.invoke<SystemSpecs>("get_system_specs").catch(() => null),
        window.__TAURI_INTERNALS__
          .invoke<{ koboldOnline: boolean; fishOnline: boolean; ollamaOnline: boolean; comfyOnline: boolean }>("probe_local_engines")
          .catch(() => null),
      ]);
      specs = specsRes;
      nativePorts = portsRes;
      if (specs?.totalRamGb) ramGb = Math.round(specs.totalRamGb);
    } catch {
      /* desktop specs optional */
    }
  }

  const [koboldHttp, fishHttp, ollamaHttp, comfyHttp] = await Promise.all([
    nativePorts?.koboldOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:5001/api/v1/model"),
    nativePorts?.fishOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:5002/health"),
    nativePorts?.ollamaOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:11434/api/tags"),
    nativePorts?.comfyOnline ? Promise.resolve(true) : probeEndpoint("http://127.0.0.1:8188/system_stats"),
  ]);
  const koboldOnline = Boolean(nativePorts?.koboldOnline || koboldHttp);
  const fishOnline = Boolean(nativePorts?.fishOnline || fishHttp);
  const ollamaOnline = Boolean(nativePorts?.ollamaOnline || ollamaHttp);
  const comfyOnline = Boolean(nativePorts?.comfyOnline || comfyHttp);

  return {
    isDesktop: desktop,
    koboldOnline,
    fishOnline,
    ollamaOnline,
    comfyOnline,
    anyLocalOnline: koboldOnline || fishOnline || ollamaOnline || comfyOnline,
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

export async function checkDesktopUpdate(): Promise<{ available: boolean; version?: string; note: string }> {
  try {
    const res = await fetch("https://github.com/hampusi97/velvetmotion-ai/releases/latest/download/latest.json", {
      cache: "no-store",
    });
    if (res.ok) {
      const manifest = (await res.json()) as { version?: string };
      return {
        available: Boolean(manifest.version),
        version: manifest.version,
        note: manifest.version
          ? `Latest desktop build v${manifest.version} is live on GitHub Releases.`
          : "Web layer updates automatically on reload.",
      };
    }
  } catch {
    /* network or CORS */
  }
  return {
    available: false,
    note: isTauriDesktop()
      ? "Already on the latest daily Web + Desktop build."
      : "Running Cloudflare Web build — updates apply live on every reload.",
  };
}

export function useLocalEngineStatus(): LocalEngineStatus & { refresh: () => Promise<void> } {
  const [status, setStatus] = useState<LocalEngineStatus>({
    isDesktop: false,
    koboldOnline: false,
    fishOnline: false,
    ollamaOnline: false,
    comfyOnline: false,
    anyLocalOnline: false,
    ramGb: 8,
    ramTier: "8 GB Lite",
    specs: null,
    checking: true,
    metrics: latestMetrics,
  });

  const refresh = useCallback(async () => {
    const next = await probeLocalEngines();
    setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 15000);
    const onMetrics = (e: Event) => {
      const detail = (e as CustomEvent<SpeedMetrics>).detail;
      setStatus((prev) => ({ ...prev, metrics: detail || latestMetrics }));
    };
    window.addEventListener("vm:engine-metrics", onMetrics);
    return () => {
      clearInterval(id);
      window.removeEventListener("vm:engine-metrics", onMetrics);
    };
  }, [refresh]);

  return { ...status, refresh };
}
