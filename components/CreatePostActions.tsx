"use client";

import { useState } from "react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { addToGallery, spendCoins, GEN_COST, getCoins } from "@/lib/storage";
import {
  buildSequence,
  enhanceSequenceWithVideo,
  type SequenceKind,
} from "@/lib/videoModes";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

/** Shown right after Create finishes — one-tap heat before full chat. */
export function CreatePostActions({
  character,
  onChat,
}: {
  character: Character;
  onChat: () => void;
}) {
  const [preview, setPreview] = useState<{
    url: string;
    frames?: string[];
    videoUrl?: string | null;
    label: string;
    note?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [coins, setCoins] = useState(() => getCoins());
  const [status, setStatus] = useState<string | null>(null);

  const runStill = (kind: "nude" | "lingerie") => {
    if (busy) return;
    const cost = kind === "nude" ? GEN_COST.nude : GEN_COST.lingerie;
    if (!spendCoins(cost)) {
      setPreview({ url: "", label: `Need ${cost} coins` });
      return;
    }
    setCoins(getCoins());
    setBusy(true);
    try {
      const url = characterMediaUrl(character, kind);
      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: kind,
        url,
        prompt: `${character.name} ${kind}`,
      });
      setPreview({
        url,
        label: kind === "nude" ? "Nudify" : "Lingerie",
        note: "Tribute her in chat when you’re ready",
      });
    } finally {
      setBusy(false);
    }
  };

  const runSequence = async (kind: SequenceKind, label: string) => {
    if (busy) return;
    const cost = GEN_COST.video || 28;
    if (!spendCoins(cost)) {
      setPreview({ url: "", label: `Need ${cost} coins` });
      return;
    }
    setCoins(getCoins());
    setBusy(true);
    setStatus("Building sequence…");
    try {
      const frames = buildSequence(character, kind);
      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: "video",
        url: frames[frames.length - 1],
        frames,
        prompt: `${character.name} ${kind} sequence`,
      });
      setPreview({
        url: frames[frames.length - 1],
        frames,
        label,
        note: "Sequence ready — enhancing clip if img2vid is set…",
      });
      setStatus("Enhancing to live clip (Advanced → img2vid)…");
      const enhanced = await enhanceSequenceWithVideo(character, kind, frames);
      setPreview({
        url: frames[frames.length - 1],
        frames,
        videoUrl: enhanced.videoUrl,
        label,
        note: enhanced.note,
      });
      setStatus(enhanced.mode === "mp4" ? "Live clip attached" : enhanced.note);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-pink-500/40 bg-zinc-900/80 p-4 space-y-3 glass-card">
      <div className="text-sm font-medium text-pink-200">One-tap heat · {coins} coins</div>
      <p className="text-[11px] text-zinc-500">
        Nudify / Sex / JOI jump straight into media. Face seed stays locked from your upload.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => runStill("lingerie")}
          className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40"
        >
          Lingerie
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => runStill("nude")}
          className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40"
        >
          Nudify
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runSequence("sex", "Sex sequence")}
          className="px-3 py-2 rounded-xl bg-pink-600 text-xs font-medium disabled:opacity-40"
        >
          Sex sequence
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runSequence("joi", "JOI sequence")}
          className="px-3 py-2 rounded-xl bg-fuchsia-600 text-xs font-medium disabled:opacity-40"
        >
          JOI sequence
        </button>
        <button
          type="button"
          onClick={onChat}
          className="px-3 py-2 rounded-xl border border-white/15 text-xs"
        >
          Open chat / SPH / BNWO
        </button>
      </div>
      {status && <p className="text-[11px] text-zinc-400">{status}</p>}
      {preview && (preview.url || preview.frames) && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {preview.videoUrl ? (
            <video src={preview.videoUrl} controls playsInline className="w-full max-h-64 bg-black" />
          ) : preview.frames && preview.frames.length > 1 ? (
            <MotionSequencePlayer frames={preview.frames} alt={character.name} />
          ) : preview.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="w-full max-h-64 object-cover" />
          ) : null}
          <p className="text-[11px] text-zinc-400 p-2">
            {preview.label}
            {preview.note ? ` · ${preview.note}` : " · Tribute her in chat when you’re ready"}
          </p>
        </div>
      )}
    </div>
  );
}
