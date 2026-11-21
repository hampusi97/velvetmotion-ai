"use client";

import { useState } from "react";
import type { CompanionProfile } from "@/data/companions";
import { nudify, type NudifyLevel } from "@/lib/nudify";
import { SafeImage } from "@/components/SafeImage";

const LEVELS: { id: NudifyLevel; label: string }[] = [
  { id: "lingerie", label: "Lingerie" },
  { id: "topless", label: "Topless" },
  { id: "nude", label: "Nude" },
  { id: "explicit", label: "Explicit" },
];

export default function NudifyPanel({
  companion,
}: {
  companion: Pick<CompanionProfile, "name" | "personality" | "visualDna">;
}) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [reaction, setReaction] = useState("");
  const [level, setLevel] = useState<NudifyLevel>("lingerie");
  const [split, setSplit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSourceUrl(String(reader.result));
      setResultUrl(null);
      setReaction("");
    };
    reader.onerror = () => setError("Could not read uploaded file.");
    reader.readAsDataURL(file);
  };

  const runNudify = async (targetLevel: NudifyLevel) => {
    if (!sourceUrl || busy) return;
    setLevel(targetLevel);
    setBusy(true);
    setError(null);
    try {
      const res = await nudify(companion, sourceUrl, targetLevel);
      setResultUrl(res.imageUrl);
      setReaction(res.reaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Reference Restyle</h3>
        <label className="cursor-pointer rounded border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-300 hover:border-fuchsia-400">
          Upload photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            disabled={!sourceUrl || busy}
            onClick={() => void runNudify(l.id)}
            aria-pressed={level === l.id}
            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition disabled:opacity-40 ${
              level === l.id
                ? "border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200"
                : "border-white/10 text-zinc-400 hover:border-white/25"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {sourceUrl && (
        <div className="space-y-2">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
            <SafeImage src={sourceUrl} alt="Original upload" className="h-full w-full object-cover" />
            {resultUrl && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
              >
                <SafeImage src={resultUrl} alt="Restyled output" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          {resultUrl && (
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Before and after comparison"
              className="w-full accent-fuchsia-400"
            />
          )}
        </div>
      )}

      {reaction && (
        <p className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/5 p-2.5 text-xs italic text-zinc-200">
          “{reaction}”
        </p>
      )}
    </section>
  );
}
