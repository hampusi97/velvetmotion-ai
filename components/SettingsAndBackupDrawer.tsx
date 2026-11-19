"use client";

import { useState } from "react";
import { Check, Cloud, Copy, Cpu, Download, ExternalLink, RefreshCw, Shield, Sparkles, Upload, X } from "lucide-react";
import { exportFullBackupJson, importFullBackupJson } from "@/lib/db";
import { loadRouterSettings, saveRouterSettings } from "@/lib/chatRouter";
import { checkDesktopUpdate, triggerBossKey, useLocalEngineStatus } from "@/lib/localEngineBridge";
import { isUiSoundEnabled, setUiSoundEnabled } from "@/lib/neonAudio";
import { useFirebaseCloudSync } from "@/lib/firebaseSync";
import { googleSignIn, signInAnonymousGuest } from "@/lib/firebase";
import { getRecommendedPresetsForRam, VOICE_ENGINE_OPTIONS } from "@/data/localModelCatalog";
import { getPreferredVoiceEngine, setPreferredVoiceEngine, type VoiceEngineId } from "@/lib/kokoroTts";
import {
  DAVIDAU_RECOMMENDED_GGUFS,
  DAVIDAU_SAMPLER_PRESETS,
  SAMPLER_PRESET_LIST,
  type SamplerPresetId,
} from "@/lib/samplerPresets";

export function SettingsAndBackupDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const initialRouter = loadRouterSettings();
  const [neon, setNeon] = useState<"hyper" | "subtle">(() => {
    if (typeof document === "undefined") return "hyper";
    return document.documentElement.getAttribute("data-neon") === "subtle" ? "subtle" : "hyper";
  });
  const [openRouterKey, setOpenRouterKey] = useState(initialRouter.openRouterApiKey || "");
  const [customUrl, setCustomUrl] = useState(initialRouter.customBaseUrl || "");
  const [homeEngineUrl, setHomeEngineUrl] = useState(initialRouter.homeEngineUrl || "");
  const [ollamaModel, setOllamaModel] = useState(initialRouter.ollamaModel || "llama3.1:8b");
  const [stealthNotif, setStealthNotif] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("vm-stealth-notif") !== "false";
  });
  const [bossPin, setBossPin] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("vm-boss-pin") || "";
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [uiSound, setUiSound] = useState(() => isUiSoundEnabled());
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineId>(() => getPreferredVoiceEngine());
  const [samplerPreset, setSamplerPreset] = useState<SamplerPresetId>(
    () => initialRouter.samplerPreset || "roleplay-balanced",
  );
  const engine = useLocalEngineStatus();
  const { status: cloudStatus, syncNow } = useFirebaseCloudSync();
  const ramCatalog = getRecommendedPresetsForRam(engine.ramGb);

  if (!open) return null;

  const toggleNeon = (next: "hyper" | "subtle") => {
    setNeon(next);
    document.documentElement.setAttribute("data-neon", next);
    try {
      localStorage.setItem("vm-neon-intensity", next);
    } catch {
      /* ignore */
    }
  };

  const handleExport = async () => {
    const json = await exportFullBackupJson();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `velvetmotion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setStatusMsg("Full .json backup downloaded (IndexedDB + settings).");
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const res = await importFullBackupJson(text);
    setStatusMsg(`Restored ${res.restoredKeys} settings & ${res.restoredRows} IndexedDB records.`);
  };

  const saveModelSettings = () => {
    saveRouterSettings({
      openRouterApiKey: openRouterKey.trim() || undefined,
      customBaseUrl: customUrl.trim() || undefined,
      homeEngineUrl: homeEngineUrl.trim() || undefined,
      ollamaModel: ollamaModel.trim() || "llama3.1:8b",
      samplerPreset,
    });
    try {
      localStorage.setItem("vm-stealth-notif", String(stealthNotif));
      if (bossPin.trim()) localStorage.setItem("vm-boss-pin", bossPin.trim().slice(0, 4));
      else localStorage.removeItem("vm-boss-pin");
    } catch {
      /* ignore */
    }
    setStatusMsg("LLM, Local Ultra & Stealth settings saved locally.");
  };

  const copyCommand = (id: string, cmd: string) => {
    void navigator.clipboard?.writeText(cmd);
    setCopiedCmd(id);
    setStatusMsg("Copied launch command to clipboard.");
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  const recommendText =
    engine.ramTier === "32 GB+ Ultra"
      ? "24B–32B Q4_K_M GGUF + local FLUX Dev + FramePack / Wan 2.2 video"
      : engine.ramTier === "16 GB Balanced"
        ? "12B Q4_K_M GGUF chat + local SDXL / FLUX GGUF portraits"
        : "4B–8B Q4_K_M GGUF chat + Cloud Free media";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl neon-glass p-6 space-y-5 bg-[#080812]/95">
        <button
          type="button"
          aria-label="Close Settings"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#ff1e8e]/45 p-1.5 text-zinc-200 hover:bg-[#ff1e8e]/20"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <h2 className="text-xl font-extrabold neon-text-glow flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ff1e8e]" />
            Settings, Backup &amp; Local Ultra
          </h2>
          <p className="text-xs text-[#a6a6c4]">100% local-first IndexedDB storage · zero server logging.</p>
        </div>

        {/* Neon Intensity */}
        <div className="rounded-2xl border border-white/10 bg-[#05050a] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#f7f7fc]">Hyper-Neon Glow Intensity</span>
            <div className="flex gap-1.5">
              {(["hyper", "subtle"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleNeon(mode)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize border ${
                    neon === mode
                      ? "border-[#ff1e8e] bg-[#ff1e8e]/20 text-white"
                      : "border-white/15 text-[#a6a6c4]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#a6a6c4] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={uiSound}
              onChange={(e) => {
                setUiSound(e.target.checked);
                setUiSoundEnabled(e.target.checked);
              }}
              className="accent-[#00f5ff]"
            />
            Synthesized Neon UI Sound Effects (swipes, matches, level-ups)
          </label>
        </div>

        {/* 1-Click .json Backup */}
        <div className="rounded-2xl border border-[#00f5ff]/30 bg-[#00f5ff]/5 p-3.5 space-y-2">
          <p className="text-xs font-bold text-[#00f5ff]">1-Click Local Backup (.json)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00f5ff]/45 bg-[#00f5ff]/15 px-3 py-2 text-xs font-semibold text-[#00f5ff] hover:bg-[#00f5ff]/25"
            >
              <Download className="h-3.5 w-3.5" /> Export Backup (.json)
            </button>
            <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:border-[#ff1e8e]/50">
              <Upload className="h-3.5 w-3.5" /> Import Backup
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => void handleImport(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* Firebase Cloud Vault Sync */}
        <div className="rounded-2xl border border-[#00ffa3]/30 bg-[#00ffa3]/5 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#00ffa3] flex items-center gap-1.5">
              <Cloud className="h-4 w-4" />
              {cloudStatus.signedIn ? "Firebase Cloud Vault Active" : "Firebase Cloud Sync (Optional)"}
            </span>
            <span className="text-[10px] text-[#a6a6c4]">
              {cloudStatus.signedIn
                ? cloudStatus.email || (cloudStatus.isAnonymous ? `Guest (${cloudStatus.uid?.slice(0, 6)})` : cloudStatus.uid?.slice(0, 8))
                : "Offline Local-Only"}
            </span>
          </div>
          {cloudStatus.signedIn ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#a6a6c4]">
                {cloudStatus.syncing
                  ? "Syncing vault..."
                  : cloudStatus.lastSyncedAt
                    ? `Last synced ${new Date(cloudStatus.lastSyncedAt).toLocaleTimeString()}`
                    : "Ready to sync Coins, Memory Vault, Streaks & Custom Companions."}
              </span>
              <button
                type="button"
                disabled={cloudStatus.syncing}
                onClick={() => void syncNow().then((ok) => setStatusMsg(ok ? "Cloud Vault synced with Firestore." : "Cloud Vault sync completed."))}
                className="rounded-xl border border-[#00ffa3]/50 bg-[#00ffa3]/15 px-3 py-1.5 text-[11px] font-bold text-[#00ffa3] disabled:opacity-50"
              >
                {cloudStatus.syncing ? "Syncing..." : "Sync Cloud Vault Now"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void googleSignIn().catch((e) => setStatusMsg(e instanceof Error ? e.message : "Google Sign-In failed"))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:border-[#00f5ff]"
              >
                Sign in with Google
              </button>
              <button
                type="button"
                onClick={() => void signInAnonymousGuest().then(() => setStatusMsg("Anonymous Cloud Sync enabled.")).catch(() => {})}
                className="rounded-xl border border-[#00ffa3]/45 bg-[#00ffa3]/15 px-3 py-1.5 text-[11px] font-semibold text-[#00ffa3]"
              >
                Enable Anonymous Cloud Sync
              </button>
            </div>
          )}
        </div>

        {/* Local Ultra Mode & Desktop Update */}
        <div className="rounded-2xl border border-[#ff1e8e]/35 bg-[#ff1e8e]/5 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#f7f7fc] flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-[#00f5ff]" /> Local Ultra Mode · {ramCatalog.label} ({engine.ramGb} GB)
            </span>
            <button
              type="button"
              onClick={() => void engine.refresh().then(() => setStatusMsg("Probed :5001, :5002, :11434, :8188, and Home Engine :8787."))}
              className="rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-2.5 py-1 text-[10px] font-bold text-[#00f5ff] inline-flex items-center gap-1 hover:bg-[#00f5ff]/20"
            >
              <RefreshCw className="h-3 w-3" /> Test Local Connection
            </button>
          </div>
          {engine.specs && (
            <p className="text-[10px] font-mono text-[#00f5ff]/85">
              HW: {engine.specs.totalRamGb} GB RAM ({engine.specs.availableRamGb} GB free) · {engine.specs.cpuCores} CPU cores · {engine.specs.os}
              {engine.isDesktop ? " · Tauri Desktop Shell" : " · Browser"}
            </p>
          )}
          <p className="text-[11px] text-[#a6a6c4]">{recommendText}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
            {[
              ["KoboldCpp :5001", engine.koboldOnline],
              ["Fish Drama :5002", engine.fishOnline],
              ["Ollama :11434", engine.ollamaOnline],
              ["ComfyUI :8188", engine.comfyOnline],
              ["Home Engine :8787", engine.homeEngineOnline],
            ].map(([lbl, on]) => (
              <div
                key={String(lbl)}
                className={`rounded-lg border px-2 py-1 text-center font-semibold ${
                  on
                    ? "border-[#00ffa3]/50 bg-[#00ffa3]/15 text-[#00ffa3]"
                    : "border-white/10 bg-black/40 text-zinc-400"
                }`}
              >
                ● {lbl}
              </div>
            ))}
          </div>

          {/* Detected RAM Tier SOTA Nov 2026 Model Presets */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-white">Recommended Models for {ramCatalog.label}</p>
            {ramCatalog.presets.map((preset) => (
              <div key={preset.id} className="rounded-xl border border-white/10 bg-[#05050a] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                  <span className="shrink-0 rounded-full border border-[#ff5678]/40 bg-[#ff5678]/15 px-2 py-0.5 text-[9px] font-extrabold text-[#ff8aa1]">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[10px] text-[#a6a6c4] leading-snug">{preset.description}</p>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0c0c16] px-2.5 py-1.5 font-mono text-[10px] text-zinc-300">
                  <span className="truncate">{preset.launchCommand}</span>
                  <button
                    type="button"
                    onClick={() => copyCommand(preset.id, preset.launchCommand)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-2 py-0.5 text-[10px] font-sans font-bold text-[#00f5ff]"
                  >
                    {copiedCmd === preset.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedCmd === preset.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Persisted Voice Engine Selector */}
          <div className="rounded-xl border border-white/10 bg-[#05050a] p-2.5 space-y-1.5">
            <label className="block text-[11px] font-bold text-white" htmlFor="vm-voice-engine-select">
              Voice Engine (Chat Notes &amp; Voice Call)
            </label>
            <select
              id="vm-voice-engine-select"
              value={voiceEngine}
              onChange={(e) => {
                const next = e.target.value as VoiceEngineId;
                setVoiceEngine(next);
                setPreferredVoiceEngine(next);
                setStatusMsg(`Voice Engine switched to ${VOICE_ENGINE_OPTIONS.find((v) => v.id === next)?.label || next}.`);
              }}
              className="w-full rounded-lg border border-white/15 bg-[#0c0c16] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#ff5678]"
            >
              {VOICE_ENGINE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {v.footprint} ({v.badge})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#a6a6c4]">
              {VOICE_ENGINE_OPTIONS.find((v) => v.id === voiceEngine)?.description}
            </p>
          </div>

          {/* Chat Quality · DavidAU Class 1–4 Sampler Preset */}
          <div className="rounded-xl border border-white/10 bg-[#05050a] p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-white" htmlFor="vm-sampler-preset-select">
                Chat Quality · Roleplay Sampler Preset
              </label>
              <span className="rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-2 py-0.5 text-[9px] font-bold text-[#00f5ff]">
                {DAVIDAU_SAMPLER_PRESETS[samplerPreset].badge}
              </span>
            </div>
            <select
              id="vm-sampler-preset-select"
              value={samplerPreset}
              onChange={(e) => {
                const next = e.target.value as SamplerPresetId;
                setSamplerPreset(next);
                saveRouterSettings({ samplerPreset: next });
                setStatusMsg(`Chat sampler switched to ${DAVIDAU_SAMPLER_PRESETS[next].label}.`);
              }}
              className="w-full rounded-lg border border-white/15 bg-[#0c0c16] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00f5ff]"
            >
              {SAMPLER_PRESET_LIST.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#a6a6c4] leading-snug">
              {DAVIDAU_SAMPLER_PRESETS[samplerPreset].description}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5 text-[9px] font-mono text-zinc-300">
              <span className="rounded border border-white/10 bg-black/50 px-1.5 py-0.5">
                temp {DAVIDAU_SAMPLER_PRESETS[samplerPreset].standard.temperature}
              </span>
              <span className="rounded border border-white/10 bg-black/50 px-1.5 py-0.5">
                min_p {DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.min_p}
              </span>
              <span className="rounded border border-white/10 bg-black/50 px-1.5 py-0.5">
                repeat_last_n {DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.repeat_last_n}
              </span>
              <span className="rounded border border-white/10 bg-black/50 px-1.5 py-0.5">
                max_tokens {DAVIDAU_SAMPLER_PRESETS[samplerPreset].standard.max_tokens}
              </span>
              {DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.dry_multiplier && (
                <span className="rounded border border-[#ff1e8e]/40 bg-[#ff1e8e]/10 px-1.5 py-0.5 text-[#ff8aa1]">
                  DRY {DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.dry_multiplier}
                </span>
              )}
              {DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.dynatemp_range && (
                <span className="rounded border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-1.5 py-0.5 text-[#00f5ff]">
                  DynaTemp ±{DAVIDAU_SAMPLER_PRESETS[samplerPreset].localExtended.dynatemp_range}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Model Manager — DavidAU Recommended Hugging Face GGUFs */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-bold text-white">Desktop Model Manager · DavidAU NEO GGUFs</p>
            {DAVIDAU_RECOMMENDED_GGUFS.map((gguf) => (
              <div key={gguf.id} className="rounded-xl border border-white/10 bg-[#05050a] p-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-white truncate">{gguf.name}</span>
                  <span className="shrink-0 rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-2 py-0.5 text-[9px] font-bold text-[#00f5ff]">
                    {gguf.ramLabel}
                  </span>
                </div>
                <p className="text-[10px] text-[#a6a6c4] leading-snug">{gguf.note}</p>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSamplerPreset(gguf.recommendedPreset);
                      saveRouterSettings({ samplerPreset: gguf.recommendedPreset });
                      setStatusMsg(`Applied ${DAVIDAU_SAMPLER_PRESETS[gguf.recommendedPreset].label} for ${gguf.name}.`);
                    }}
                    className="rounded-md border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 hover:border-[#ff5678]"
                  >
                    Use {DAVIDAU_SAMPLER_PRESETS[gguf.recommendedPreset].label}
                  </button>
                  <a
                    href={gguf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[#ff1e8e]/45 bg-[#ff1e8e]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#ff8aa1] hover:bg-[#ff1e8e]/25"
                  >
                    <Download className="h-3 w-3" /> Download GGUF <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                const res = await checkDesktopUpdate();
                setStatusMsg(res.note);
              }}
              className="rounded-xl border border-[#00f5ff]/45 bg-[#00f5ff]/15 px-3 py-1.5 text-[11px] font-semibold text-[#00f5ff]"
            >
              Check for Daily Update
            </button>
            <button
              type="button"
              onClick={() => void triggerBossKey()}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200"
            >
              <Shield className="h-3 w-3" /> Boss-Key Panic Mute
            </button>
          </div>
        </div>

        {/* BYOK + Stealth */}
        <div className="rounded-2xl border border-white/10 bg-[#05050a] p-3.5 space-y-2.5">
          <p className="text-xs font-bold text-[#f7f7fc]">BYOK AI &amp; Privacy</p>
          <input
            type="password"
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            placeholder="Optional OpenRouter API key (sk-or-...)"
            className="w-full rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs text-white outline-none focus:border-[#ff1e8e]"
          />
          <input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Custom OpenAI-compatible URL (e.g. http://127.0.0.1:5001/v1)"
            className="w-full rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs text-white outline-none focus:border-[#ff1e8e]"
          />
          <input
            value={homeEngineUrl}
            onChange={(e) => setHomeEngineUrl(e.target.value)}
            placeholder="Home Engine / Tunnel URL (http://127.0.0.1:8787 or https://...trycloudflare.com)"
            className="w-full rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs text-white outline-none focus:border-[#00f5ff]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="Ollama model (llama3.1:8b)"
              className="rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs text-white outline-none"
            />
            <input
              value={bossPin}
              onChange={(e) => setBossPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Boss-Key 4-digit PIN (opt)"
              className="rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs text-white outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#a6a6c4] cursor-pointer">
            <input
              type="checkbox"
              checked={stealthNotif}
              onChange={(e) => setStealthNotif(e.target.checked)}
              className="accent-[#ff1e8e]"
            />
            Stealth Notification Mode (“VelvetMotion: New sync ready”)
          </label>
          <button
            type="button"
            onClick={saveModelSettings}
            className="w-full rounded-xl neon-btn-primary py-2 text-xs font-bold text-white"
          >
            Save Preferences Locally
          </button>
        </div>

        {statusMsg && (
          <p className="rounded-xl border border-[#00ffa3]/40 bg-[#00ffa3]/10 px-3 py-2 text-xs text-[#00ffa3]">
            {statusMsg}
          </p>
        )}
      </div>
    </div>
  );
}
