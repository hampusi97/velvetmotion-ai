"use client";

import { useEffect, useState } from "react";
import { getProactiveMessages, type ProactiveMessage } from "@/lib/proactive";
import { characterMediaUrl } from "@/lib/media";
import { CHARACTERS } from "@/lib/characters";

export function ProactiveInbox({ onOpen }: { onOpen: (id: string) => void }) {
  const [msgs, setMsgs] = useState<ProactiveMessage[]>([]);

  useEffect(() => {
    setMsgs(getProactiveMessages(4));
  }, []);

  if (msgs.length === 0) return null;

  return (
    <section className="pb-8">
      <h2 className="font-display text-2xl text-cream mb-1">She texted you</h2>
      <p className="text-sm text-mist mb-4">Proactive messages from girls you’ve already talked to</p>
      <div className="space-y-2">
        {msgs.map((m) => {
          const c = CHARACTERS.find((x) => x.id === m.characterId);
          if (!c) return null;
          return (
            <button
              key={m.characterId + m.at}
              type="button"
              onClick={() => onOpen(m.characterId)}
              className="w-full flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-950/50 to-zinc-900/80 p-3 text-left hover:border-pink-400/50 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterMediaUrl(c, "beauty")}
                alt=""
                className="h-12 w-12 rounded-full object-cover border border-pink-400/40"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-cream">{m.characterName}</div>
                <div className="text-xs text-pink-200/90 truncate">{m.text}</div>
              </div>
              <span className="text-[10px] text-pink-400 shrink-0">Reply →</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
