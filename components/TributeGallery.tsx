"use client";

import { useEffect, useState } from "react";
import { loadTributes, type TributeSave } from "@/lib/rewards";

export function TributeGallery({ onHome }: { onHome: () => void }) {
  const [items, setItems] = useState<TributeSave[]>([]);

  useEffect(() => {
    setItems(loadTributes());
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Tribute gallery</h1>
      <p className="text-sm text-mist">Private saves — what you finished for her. Stored on this device.</p>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8 text-center">
          No tributes yet. Generate a nude/sex sequence in chat and use “Save tribute” when it lands.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-2xl overflow-hidden border border-pink-500/30 glass-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.url} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="p-2 text-xs">
                <div className="font-medium text-cream truncate">{t.characterName}</div>
                <div className="text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
