"use client";

import { useEffect, useState } from "react";
import {
  getMediaSettings,
  saveMediaSettings,
  type MediaBackendSettings,
} from "@/lib/mediaSettings";

export function AdvancedMediaSettings({ onHome }: { onHome: () => void }) {
  const [s, setS] = useState<MediaBackendSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(getMediaSettings());
  }, []);

  if (!s) return null;

  const update = (partial: Partial<MediaBackendSettings>) => {
    setS((prev) => (prev ? { ...prev, ...partial } : prev));
    setSaved(false);
  };

  const onSave = () => {
    saveMediaSettings(s);
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
          Power-user backends. Default free path stays Pollinations Flux — nothing here is required.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pink-300">Local image endpoint</h2>
        <p className="text-xs text-zinc-500">
          Paste ComfyUI, Forge, or any server that accepts a prompt URL / API. Example:{" "}
          <code className="text-zinc-400">http://127.0.0.1:7860</code> or a reverse-proxy.
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
          <option value="prompt-url">Prompt URL template (…/prompt/{`{prompt}`})</option>
          <option value="forge">Forge / A1111 style base</option>
          <option value="comfy">ComfyUI base (manual workflow still local)</option>
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
        <p className="text-xs text-zinc-500">
          POST JSON endpoint: {`{ image, prompt, duration }`} → {`{ url }`} . Or leave empty to try
          Pollinations video URL + frame sequence fallback.
        </p>
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="https://your-img2vid.example/api/generate"
          value={s.img2vidUrl}
          onChange={(e) => update({ img2vidUrl: e.target.value.trim() })}
        />
        <input
          className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-sm"
          placeholder="Pollinations API key (optional, for video)"
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
          Aggressive face seed (Create photo seed applied to every mood)
        </label>
        <p className="text-xs text-zinc-500">
          True IP-Adapter needs ComfyUI locally. Seed lock is the cloud best-effort; local pipeline =
          real face lock.
        </p>
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
