"use client";

import { useEffect, useState } from "react";
import { getCompanionById } from "@/data/companions";
import { maybeUnpromptedPhoto } from "@/lib/unpromptedPhoto";
import { SafeImage } from "@/components/SafeImage";
import { useRelationship } from "./useRelationship";

export default function ProactiveNudge({
  companionId,
  name,
  portraitUrl,
}: {
  companionId: string;
  name: string;
  portraitUrl: string;
}) {
  const rel = useRelationship(companionId);
  const [hidden, setHidden] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const decision = rel.decide();

  useEffect(() => {
    let cancelled = false;
    if (!hidden && decision.should && decision.kind) {
      const companion = getCompanionById(companionId);
      void maybeUnpromptedPhoto(companion, decision.kind).then((url) => {
        if (!cancelled && url) setPhotoUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [companionId, hidden, decision.should, decision.kind]);

  if (hidden || !decision.should || !decision.line) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/5 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portraitUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">{name}</p>
          <p className="mt-0.5 text-sm text-zinc-200">{decision.line}</p>
        </div>
        {photoUrl && (
          <SafeImage
            src={photoUrl}
            alt={`${name} unprompted photo`}
            className="max-w-[200px] rounded-xl border border-white/10 object-cover"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          rel.dismissProactive();
          if (decision.kind === "milestone") rel.claimMilestones();
          setHidden(true);
        }}
        className="shrink-0 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-white/25 hover:text-white"
      >
        Got it
      </button>
    </div>
  );
}
