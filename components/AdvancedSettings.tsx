"use client";

import { useEffect, useState } from "react";
import {
  loadAdvancedConfig,
  saveAdvancedConfig,
  describeAdvancedSetup,
  type AdvancedConfig,
} from "@/lib/advancedConfig";

export function AdvancedSettings({ onHome }: { onHome: () => void }) {
  const [cfg, setCfg] = useState<AdvancedConfig>(loadAdvancedConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCfg(loadAdvancedConfig());
  }, []);

  const save = () => {
    saveAdvancedConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Advanced</h1>
      <p className="text-sm text-mist">{describeAdvancedSetup()}</p>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <label className="block text-xs text-zinc-500">
          Ollama URL
          <input
            value={cfg.ollamaUrl}
            onChange={(e) => setCfg({ ...cfg, ollamaUrl: e.target.value })}
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            placeholder="http://localhost:11434"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Ollama model
          <input
            value={cfg.ollamaModel}
            onChange={(e) => setCfg({ ...cfg, ollamaModel: e.target.value })}
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            placeholder="llama3.2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={cfg.useWebLLM}
            onChange={(e) => setCfg({ ...cfg, useWebLLM: e.target.checked })}
          />
          Prefer WebLLM in-browser (experimental)
        </label>
        <label className="block text-xs text-zinc-500">
          Telegram bot token (local only)
          <input
            value={cfg.telegramBotToken}
            onChange={(e) => setCfg({ ...cfg, telegramBotToken: e.target.value })}
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono"
            placeholder="123456:ABC…"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Discord webhook URL
          <input
            value={cfg.discordWebhook}
            onChange={(e) => setCfg({ ...cfg, discordWebhook: e.target.value })}
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            placeholder="https://discord.com/api/webhooks/…"
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="w-full py-3 rounded-xl bg-pink-600 font-semibold"
        >
          {saved ? "Saved" : "Save on this device"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Live2D / VRM avatars and full WebRTC video calls are next — config is ready so backends can plug in without redesign.
      </p>
    </div>
  );
}
