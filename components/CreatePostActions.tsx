"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl, resolveBestMediaUrl } from "@/lib/media";
import { addToGallery } from "@/lib/storage";
import { saveCollectionClip } from "@/lib/collectionMedia";
import { emitVaultUpdated } from "@/lib/firebaseSync";
import {
  enhanceSequenceWithVideo,
  type SequenceKind,
} from "@/lib/videoModes";

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
    video?: { url: string; extension: "mp4" | "webm" };
    label: string;
    note?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const mounted = useRef(false);
  const clipRequest = useRef<AbortController | null>(null);
  const clipUrl = preview?.video?.url;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clipRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (clipUrl?.startsWith("blob:")) return () => URL.revokeObjectURL(clipUrl);
  }, [clipUrl]);

  const runStill = async (kind: "lingerie" | "nude" | "explicit") => {
    if (busy) return;
    setBusy(true);
    setStatus("Generating image…");
    try {
      const result = await resolveBestMediaUrl(character, kind);
      if (!mounted.current) return;
      if (result.isFallback) throw new Error(result.error || "The image model could not finish the render.");
      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: kind,
        url: result.url,
        prompt: `${character.name} ${kind}`,
      });
      emitVaultUpdated();
      setPreview({
        url: result.url,
        label: kind === "explicit" ? "Explicit" : kind === "nude" ? "Nudify" : "Lingerie",
        note: result.note,
      });
      setStatus("Generated image saved to Collection.");
    } catch (error) {
      if (mounted.current) setStatus(error instanceof Error ? error.message : "The image failed to render.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const runSequence = async (kind: SequenceKind, label: string) => {
    if (busy) return;
    const request = new AbortController();
    clipRequest.current = request;
    const url = character.avatar || characterMediaUrl(character);
    setBusy(true);
    setStatus("Preparing clip…");
    setPreview({ url, label });
    try {
      const result = await enhanceSequenceWithVideo(kind, [url], { signal: request.signal });
      if (!mounted.current) {
        if (result.videoUrl?.startsWith("blob:")) URL.revokeObjectURL(result.videoUrl);
        return;
      }
      if (!result.videoUrl || result.mode === "sequence") {
        setStatus(result.note);
        return;
      }
      setPreview({ url, video: { url: result.videoUrl, extension: result.mode }, label, note: result.note });
      await saveCollectionClip({
        characterId: character.id,
        characterName: character.name,
        url: result.videoUrl,
        prompt: `${character.name} · ${label}`,
      });
      emitVaultUpdated();
      if (mounted.current) setStatus("Clip saved to Collection.");
    } catch (error) {
      if (mounted.current) setStatus(error instanceof Error ? error.message : "The clip could not be completed.");
    } finally {
      clipRequest.current = null;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-pink-500/40 bg-zinc-900/80 p-4 space-y-3 glass-card">
      <div className="text-sm font-medium text-pink-200">Quick media</div>
      <p className="text-[11px] text-zinc-500">
        New images and AI clips use your configured models. Browser animation uses the saved portrait.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void runStill("lingerie")} className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40">Lingerie</button>
        <button type="button" disabled={busy} onClick={() => void runStill("nude")} className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20 disabled:opacity-40">Nudify</button>
        <button type="button" disabled={busy} onClick={() => void runStill("explicit")} className="px-3 py-2 rounded-xl border border-rose-500/50 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-40">Explicit</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("sex", "Sex sequence")} className="px-3 py-2 rounded-xl bg-pink-600 text-xs font-medium disabled:opacity-40">Sex sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("joi", "JOI sequence")} className="px-3 py-2 rounded-xl bg-fuchsia-600 text-xs font-medium disabled:opacity-40">JOI sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("sph", "SPH sequence")} className="px-3 py-2 rounded-xl bg-rose-700 text-xs font-medium disabled:opacity-40">SPH sequence</button>
        <button type="button" disabled={busy} onClick={() => void runSequence("bnwo", "BNWO sequence")} className="px-3 py-2 rounded-xl bg-amber-700 text-xs font-medium disabled:opacity-40">BNWO sequence</button>
        {on3D && (
          <button type="button" onClick={on3D} className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold">Open in 3D stage</button>
        )}
        <button type="button" onClick={onChat} className="px-3 py-2 rounded-xl border border-white/15 text-xs">Open full chat</button>
      </div>
      {status && <p role="status" className="text-[11px] text-zinc-400">{status}</p>}
      {preview && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {preview.video ? (
            <video src={preview.video.url} controls playsInline className="w-full max-h-64 bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="w-full max-h-64 object-cover" />
          )}
          <p className="text-[11px] text-zinc-400 p-2">
            {preview.label}
            {preview.note ? ` · ${preview.note}` : " · Ready for chat or 3D"}
          </p>
          {preview.video && (
            <a href={preview.video.url} download={`velvetmotion-clip.${preview.video.extension}`} className="inline-block px-2 pb-2 text-xs text-rose-200 underline">
              Download clip
            </a>
          )}
        </div>
      )}
    </div>
  );
}
