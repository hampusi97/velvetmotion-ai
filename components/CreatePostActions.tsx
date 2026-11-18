"use client";

import { useState } from "react";
import type { Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { addToGallery, spendCoins, GEN_COST, getCoins } from "@/lib/storage";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

/** Shown right after Create finishes — one-tap heat before full chat. */
export function CreatePostActions({
  character,
  onChat,
}: {
  character: Character;
  onChat: () => void;
}) {
  const [preview, setPreview] = useState<{ url: string; frames?: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [coins, setCoins] = useState(() => getCoins());

  const run = (kind: "nude" | "sex" | "lingerie") => {
    if (busy) return;
    const cost = kind === "sex" ? GEN_COST.video : kind === "nude" ? GEN_COST.nude : GEN_COST.lingerie;
    if (!spendCoins(cost)) {
      setPreview({ url: "", label: `Need ${cost} coins` });
      return;
    }
    setCoins(getCoins());
    setBusy(true);
    try {
      if (kind === "sex") {
        const frames = [
          characterMediaUrl(character, "lingerie", "undress"),
          characterMediaUrl(character, "nude", "aroused"),
          characterMediaUrl(character, "explicit", "intense"),
          characterMediaUrl(character, "sex", "climax"),
        ];
        addToGallery({
          characterId: character.id,
          characterName: character.name,
          type: "video",
          url: frames[3],
          frames,
          prompt: `${character.name} sex sequence`,
        });
        setPreview({ url: frames[3], frames, label: "Sex sequence" });
      } else {
        const url = characterMediaUrl(character, kind);
        addToGallery({
          characterId: character.id,
          characterName: character.name,
          type: kind,
          url,
          prompt: `${character.name} ${kind}`,
        });
        setPreview({ url, label: kind === "nude" ? "Nude" : "Lingerie" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-pink-500/40 bg-zinc-900/80 p-4 space-y-3 glass-card">
      <div className="text-sm font-medium text-pink-200">One-tap heat · {coins} coins</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("lingerie")}
          className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20"
        >
          Lingerie
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("nude")}
          className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 hover:bg-pink-500/20"
        >
          Nudify
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("sex")}
          className="px-3 py-2 rounded-xl bg-pink-600 text-xs font-medium"
        >
          Sex sequence
        </button>
        <button
          type="button"
          onClick={onChat}
          className="px-3 py-2 rounded-xl border border-white/15 text-xs"
        >
          Open chat / JOI
        </button>
      </div>
      {preview?.url && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {preview.frames && preview.frames.length > 1 ? (
            <MotionSequencePlayer frames={preview.frames} alt={character.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="w-full max-h-64 object-cover" />
          )}
          <p className="text-[11px] text-zinc-400 p-2">{preview.label} · Tribute her in chat when you’re ready</p>
        </div>
      )}
    </div>
  );
}
