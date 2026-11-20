"use client";

import { useEffect, useState } from "react";
import { discoverA1111Checkpoints, type A1111Checkpoint } from "@/lib/a1111Client";
import {
  getMediaSettings,
  saveMediaSettings,
  type MediaBackendSettings,
} from "@/lib/mediaSettings";
import {
  getTelegramConfig,
  saveTelegramConfig,
  TELEGRAM_WORKER_ENV,
  type TelegramBridgeConfig,
} from "@/lib/telegramBridge";
import {
  loadAdvancedConfig,
  saveAdvancedConfig,
  type AdvancedConfig,
} from "@/lib/advancedConfig";

type DiagnosticCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
};

export function AdvancedMediaSettings({ onHome }: { onHome: () => void }) {
  const [s, setS] = useState<MediaBackendSettings | null>(null);
  const [tg, setTg] = useState<TelegramBridgeConfig | null>(null);
  const [adv, setAdv] = useState<AdvancedConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([]);
  const [webuiCheckpoints, setWebuiCheckpoints] = useState<A1111Checkpoint[]>([]);
  const [checkingWebui, setCheckingWebui] = useState(false);
  const [webuiStatus, setWebuiStatus] = useState("");

  const checkA1111 = async () => {
    if (!s) return;
    setCheckingWebui(true);
    const result = await discoverA1111Checkpoints(s.localImageBase || "http://127.0.0.1:7860");
    setWebuiCheckpoints(result.checkpoints);
    setWebuiStatus(result.online
      ? `WebUI reachable · ${result.checkpoints.length} installed checkpoint(s). Generation not yet tested.`
      : result.error || "Could not reach AUTOMATIC1111 / Forge. Check --api and browser CORS.");
    setCheckingWebui(false);
  };

  const runDiagnostics = async () => {
    setDiagRunning(true);
    const checks: DiagnosticCheck[] = [];
    const settings = getMediaSettings();
    // Static-export builds do not contain /api/health, /api/comfy, etc.
    // Probe the actual opt-in model services instead of nonexistent routes.
    const probe = async (id: string, label: string, url: string) => {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        checks.push({
          id,
          label,
          status: res.ok ? "ok" : "error",
          detail: res.ok ? "Reachable · generation not yet tested" : `HTTP ${res.status}`,
        });
      } catch {
        checks.push({
          id,
          label,
          status: "warn",
          detail: "Offline, blocked by browser CORS, or not installed",
        });
      }
    };

    await Promise.all([
      probe("kobold", "KoboldCpp chat (:5001)", "http://127.0.0.1:5001/v1/models"),
      probe("ollama", "Ollama chat (:11434)", "http://127.0.0.1:11434/api/tags"),
      probe("kokoro", "Kokoro neural voice (:8880)", "http://127.0.0.1:8880/docs"),
      settings.localImageMode === "forge"
        ? probe("a1111", "A1111 / Forge API", `${(settings.localImageBase || "http://127.0.0.1:7860").replace(/\/+$/, "")}/sdapi/v1/sd-models`)
        : probe("comfy", "ComfyUI image engine (:8188)", "http://127.0.0.1:8188/system_stats"),
    ]);
    checks.push({
      id: "video",
      label: "True AI video generation",
      status: settings.img2vidUrl ? "warn" : "error",
      detail: settings.img2vidUrl
        ? "Endpoint configured · verify by generating a clip"
        : "No video model endpoint set · canvas clips animate stills only",
    });
    checks.push({
      id: "cloud",
      label: "Cloud generation",
      status: "warn",
      detail: "Provider availability and content support are tested during generation",
    });

    setDiagnostics(checks);
    setDiagRunning(false);
  };

  useEffect(() => {
    setS(getMediaSettings());
    setTg(getTelegramConfig());
    setAdv(loadAdvancedConfig());
    void runDiagnostics();
  }, []);

  if (!s || !tg || !adv) return null;

  const update = (partial: Partial<MediaBackendSettings>) => {
    setS((prev) => (prev ? { ...prev, ...partial } : prev));
    setSaved(false);
  };

  const onSave = () => {
    saveMediaSettings(s);
    saveTelegramConfig(tg);
    saveAdvancedConfig(adv);
    setSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <div>
        <h1 className="font-display text-2xl text-cream">Advanced media &amp; Go-Live System</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Firebase Auth/Firestore, ComfyUI/Forge, img2vid, Ollama, Telegram bridge, and live API health.
        </p>
      </div>

      <section className="rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-emerald-300">Generator Connection Diagnostics</h2>
            <p className="text-xs text-zinc-400">
              Checks the actual local chat, speech, image and video backends. An online status does not guarantee a model is installed.
            </p>
          </div>
          <button
            type="button"
            disabled={diagRunning}
            onClick={() => void runDiagnostics()}
            className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {diagRunning ? "Testing…" : "Re-test All"}
          </button>
        </div>
        <div className="space-y-1.5">
          {diagnostics.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs"
            >
              <span className="font-medium text-zinc-200">{d.label}</span>
              <span className={d.status === "ok" ? "text-emerald-300 truncate max-w-[55%]" : d.status === "warn" ? "text-amber-300 truncate max-w-[55%]" : "text-rose-300 truncate max-w-[55%]"}>
                {d.status === "ok" ? "● " : d.status === "warn" ? "⚠ " : "✕ "}
                {d.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Local image endpoint</h2>
        <p className="text-xs text-zinc-500">
          ComfyUI / Forge / Fooocus-style base. CORS may require a local proxy.
        </p>
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="http://127.0.0.1:8188"
          value={s.localImageBase}
          onChange={(e) => update({ localImageBase: e.target.value.trim() })}
        />
        <select
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          value={s.localImageMode}
          onChange={(e) =>
            update({ localImageMode: e.target.value as MediaBackendSettings["localImageMode"] })
          }
        >
          <option value="prompt-url">Prompt URL template</option>
          <option value="forge">AUTOMATIC1111 / Forge (txt2img + img2img)</option>
          <option value="comfy">ComfyUI base</option>
        </select>
        {s.localImageMode === "forge" && (
          <div className="rounded-xl border border-rose-300/20 bg-rose-500/5 px-3 py-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-pink-200">AUTOMATIC1111 / Forge checkpoints</p>
              <button type="button" onClick={() => void checkA1111()} disabled={checkingWebui}
                className="rounded-lg border border-pink-300/30 px-2.5 py-1 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-50">
                {checkingWebui ? "Checking..." : "Find installed models"}
              </button>
            </div>
            <p role="status" className="text-[11px] text-zinc-400">{webuiStatus || "Start the WebUI with --api and select an installed checkpoint."}</p>
            <label className="block text-xs text-zinc-300">
              Checkpoint (per-request; does not permanently switch the WebUI)
              <select value={s.a1111Checkpoint} onChange={(event) => update({a1111Checkpoint:event.target.value})}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white">
                <option value="">Use the active WebUI checkpoint</option>
                {webuiCheckpoints.map(model => <option key={model.title} value={model.title}>{model.title}</option>)}
                {s.a1111Checkpoint && !webuiCheckpoints.some(x=>x.title===s.a1111Checkpoint) &&
                  <option value={s.a1111Checkpoint}>{s.a1111Checkpoint} (not verified)</option>}
              </select>
            </label>
            <label className="block text-xs text-zinc-300">
              Img2img variation strength: {Math.min(.95, Math.max(.05, s.a1111Denoise ?? .55)).toFixed(2)}
              <input type="range" min="0.05" max="0.95" step="0.05"
                value={s.a1111Denoise ?? .55}
                onChange={(event)=>update({a1111Denoise:Number(event.target.value)})}
                className="mt-2 w-full accent-pink-400"/>
            </label>
            <p className="text-[10px] text-zinc-400">
              Higher strength changes the reference image more. These are local generation settings, not a guaranteed face-identity lock.
              The WebUI requires an installed model and --api; CORS may prevent browser access.
            </p>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={s.preferLocal}
            onChange={(e) => update({ preferLocal: e.target.checked })}
          />
          Prefer local when base URL is set
        </label>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Reference-aware image variations</h2>
        <p className="text-xs text-zinc-400">
          Optional img2img bridge for original fictional adult artwork. The Studio sends the source image
          only after you explicitly request generation. Compatible ComfyUI with the required reference nodes
          can be used without a custom endpoint.
        </p>
        <label className="block text-[11px] text-zinc-300">
          Image-to-image endpoint (optional)
          <input
            type="url"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white"
            placeholder="http://127.0.0.1:8787/api/img2img"
            value={s.img2imgUrl}
            onChange={(e) => update({ img2imgUrl: e.target.value.trim() })}
          />
        </label>
        <p className="text-[10px] text-zinc-500">
          Your bridge must enforce authentication, adult-only original artwork rules, and the configured provider’s policies.
          Do not expose private API keys or accept unverified real-person sexual transformations.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Img2vid / real clips</h2>
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="https://your-img2vid.example/api/generate"
          value={s.img2vidUrl}
          onChange={(e) => update({ img2vidUrl: e.target.value.trim() })}
        />
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="Pollinations API key (optional)"
          value={s.pollinationsKey}
          onChange={(e) => update({ pollinationsKey: e.target.value.trim() })}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Face lock</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={s.aggressiveFaceLock}
            onChange={(e) => update({ aggressiveFaceLock: e.target.checked })}
          />
          Aggressive face seed from Create photo
        </label>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Local LLM (Ollama) & Webhooks</h2>
        <p className="text-xs text-zinc-500">
          Connect chat to a local Ollama server (`ollama serve`) or run `python3 workers/local_media_proxy.py --port 8787`.
        </p>
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="http://localhost:11434"
          value={adv.ollamaUrl}
          onChange={(e) => {
            setAdv({ ...adv, ollamaUrl: e.target.value.trim() });
            setSaved(false);
          }}
        />
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="llama3.2"
          value={adv.ollamaModel}
          onChange={(e) => {
            setAdv({ ...adv, ollamaModel: e.target.value.trim() });
            setSaved(false);
          }}
        />
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="Discord webhook URL (optional)"
          value={adv.discordWebhook}
          onChange={(e) => {
            setAdv({ ...adv, discordWebhook: e.target.value.trim() });
            setSaved(false);
          }}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Telegram bridge (MyGirlGPT-style)</h2>
        <p className="text-xs text-zinc-500">
          Config only in-browser. Run `BOT_TOKEN=... python3 workers/telegram_bridge.py` to bridge Telegram directly to `/api/chat` and `/api/generate-image`. Never commit real tokens.
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={tg.enabled}
            onChange={(e) => setTg({ ...tg, enabled: e.target.checked })}
          />
          Enable bridge config
        </label>
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="Bot token (stored locally only)"
          type="password"
          value={tg.botToken}
          onChange={(e) => setTg({ ...tg, botToken: e.target.value })}
        />
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="Default character id"
          value={tg.characterId}
          onChange={(e) => setTg({ ...tg, characterId: e.target.value.trim() })}
        />
        <pre className="text-[10px] text-zinc-500 overflow-x-auto p-2 rounded-lg bg-black/50">
          {TELEGRAM_WORKER_ENV}
        </pre>
      </section>

      <button
        type="button"
        onClick={onSave}
        className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 font-semibold"
      >
        {saved ? "Saved ✓" : "Save advanced settings"}
      </button>
    </div>
  );
}
