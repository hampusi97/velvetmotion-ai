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

/** Shown right after Create finishes — one-tap heat before full chat / 3D. */
export function CreatePostActions({
  character,
  onChat,
  on3D,
}: {
  character: Character;
  onChat: () => void;
  on3D?: () => void;
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

  const runStill = (kind: "lingerie" | "nude" | "explicit") => {
    if (busy) return;
    const cost =
      kind === "explicit"
        ? GEN_COST.explicit ?? GEN_COST.nude ?? 12
        : kind === "nude"
          ? GEN_COST.nude
          : GEN_COST.lingerie;
    if (!spendCoins(cost)) {
      setStatus(`Need ${cost} coins for ${kind}.`);
      return;
    }
    setCoins(getCoins());
    setBusy(true);
    setStatus(null);
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
        label: kind === "explicit" ? "Explicit" : kind === "nude" ? "Nudify" : "Lingerie",
        note: "Pinned to gallery · open chat or 3D when ready",
      });
    } catch {
      setStatus("Image failed — try again or another mood.");
    } finally {
      setBusy(false);
    }
  };

  const runSequence = async (kind: SequenceKind, label: string) => {
    if (busy) return;
    const cost = GEN_COST.video || 28;
    if (!spendCoins(cost)) {
      setStatus(`Need ${cost} coins for ${label}.`);
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
      setStatus("Enhancing to live clip…");
      const enhanced = await enhanceSequenceWithVideo(kind, frames);
      setPreview({
        url: frames[frames.length - 1],
        frames,
        videoUrl: enhanced.videoUrl,
        label,
        note: enhanced.note,
      });
      setStatus(enhanced.mode === "mp4" ? "Live clip attached" : enhanced.note);
    } catch {
      setStatus("Sequence failed — retry or try JOI / sex again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-pink-500/40 bg-zinc-900/80 p-4 space-y-3 glass-card">
      <div className="text-sm font-medium text-pink-200">One-tap heat · {coins} coins</div>
      <p className="text-[11px] text-zinc-500">
        Upload face stays locked. Nudify, explicit, sex clips, then chat or drop her into the 3D stage.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => runStill("lingerie")} className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40">Lingerie</button>
        <button type="button" disabled={busy} onClick={() => runStill("nude")} className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40">Nudify</button>
        <button type="button" disabled={busy} onClick={() => runStill("explicit")} className="px-3 py-2 rounded-xl border border-rose-500/50 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-40">Explicit</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("sex", "Sex sequence")} className="px-3 py-2 rounded-xl bg-pink-600 text-xs font-medium disabled:opacity-40">Sex sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("joi", "JOI sequence")} className="px-3 py-2 rounded-xl bg-fuchsia-600 text-xs font-medium disabled:opacity-40">JOI sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("sph", "SPH sequence")} className="px-3 py-2 rounded-xl bg-rose-700 text-xs font-medium disabled:opacity-40">SPH sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("bnwo", "BNWO sequence")} className="px-3 py-2 rounded-xl bg-amber-700 text-xs font-medium disabled:opacity-40">BNWO sequence</button>
        {on3D && (
          <button type="button" onClick={on3D} className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold">Open in 3D stage</button>
        )}
        <button type="button" onClick={onChat} className="px-3 py-2 rounded-xl border border-white/15 text-xs">Open full chat</button>
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
            {preview.note ? ` · ${preview.note}` : " · Ready for chat or 3D"}
          </p>
        </div>
      )}
    </div>
  );
}
