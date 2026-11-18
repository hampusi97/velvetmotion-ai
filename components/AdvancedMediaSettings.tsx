"use client";

import { useEffect, useState } from "react";
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

export function AdvancedMediaSettings({ onHome }: { onHome: () => void }) {
  const [s, setS] = useState<MediaBackendSettings | null>(null);
  const [tg, setTg] = useState<TelegramBridgeConfig | null>(null);
  const [adv, setAdv] = useState<AdvancedConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(getMediaSettings());
    setTg(getTelegramConfig());
    setAdv(loadAdvancedConfig());
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
        <h1 className="font-display text-2xl text-cream">Advanced media</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Local Comfy/Forge, img2vid, face lock, Telegram bridge. Defaults stay free Pollinations.
        </p>
      </div>

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
          <option value="forge">Forge / A1111 txt2img</option>
          <option value="comfy">ComfyUI base</option>
        </select>
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
