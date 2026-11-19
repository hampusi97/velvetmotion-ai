"use client";

/** Temporary restore — full dual-body stage is local; re-pushing full file. */
import { CHARACTERS } from "@/lib/characters";

export function Joi3DStage({
  onHome,
  onChat,
  initialGirlId,
  fromMatch,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
  initialGirlId?: string | null;
  fromMatch?: boolean;
}) {
  const girl = CHARACTERS.find((c) => c.id === initialGirlId) || CHARACTERS[0];
  return (
    <div className="mx-auto max-w-lg space-y-4 pb-16">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="text-3xl text-cream">3D Stage</h1>
      <p className="text-sm text-mist">
        {fromMatch ? "You matched — full dual-body stage is deploying." : "Loading full stage…"}
        {girl ? ` · ${girl.name}` : ""}
      </p>
      <button
        type="button"
        onClick={() => girl && onChat(girl.id)}
        className="px-4 py-2 rounded-xl bg-pink-600 text-sm"
      >
        Open chat with her
      </button>
    </div>
  );
}
