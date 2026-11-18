"use client";

import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, getCharacter, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { loadChat, getIntimacy, getGallery } from "@/lib/storage";
import { loadMemories } from "@/lib/memoryMap";

type Row = {
  character: Character;
  lastLine: string;
  intimacy: number;
  at: number;
  memoryCount: number;
};

function loadCustomList(): Character[] {
  try {
    const raw = localStorage.getItem("velvet-custom-girls");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function MyGirlsHub({
  onHome,
  onOpenChat,
  onCreate,
}: {
  onHome: () => void;
  onOpenChat: (id: string, character?: Character) => void;
  onCreate: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [customs, setCustoms] = useState<Character[]>([]);
  const [galleryCount, setGalleryCount] = useState(0);

  useEffect(() => {
    const custom = loadCustomList();
    setCustoms(custom);
    setGalleryCount(getGallery().length);

    const pool = [...custom, ...CHARACTERS];
    const seen = new Set<string>();
    const next: Row[] = [];

    for (const c of pool) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const chat = loadChat(c.id);
      if (chat.length === 0 && !c.id.startsWith("custom-")) continue;
      const last = chat[chat.length - 1];
      next.push({
        character: c,
        lastLine: last?.content?.slice(0, 90) || c.initialMessage.slice(0, 90),
        intimacy: getIntimacy(c.id, c.intimacy),
        at: Date.now(),
        memoryCount: loadMemories(c.id).length,
      });
    }

    // Sort: customs + anyone with chat, by intimacy then name
    next.sort((a, b) => b.intimacy - a.intimacy || a.character.name.localeCompare(b.character.name));
    setRows(next.slice(0, 40));
  }, []);

  const empty = rows.length === 0 && customs.length === 0;

  const featured = useMemo(() => CHARACTERS.slice(0, 6), []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>

      <div>
        <h1 className="font-display text-3xl text-cream neon-text">My Girls</h1>
        <p className="text-sm text-mist mt-1">
          Continue chats · customs · memory. 100% free forever.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-white/10 px-2.5 py-1">{rows.length} active</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1">{customs.length} created</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1">{galleryCount} media saved</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold"
        >
          + Create girl (no photo needed)
        </button>
      </div>

      {empty && (
        <div className="rounded-2xl border border-pink-500/30 bg-zinc-900/60 p-6 glass-card text-center space-y-3">
          <p className="text-sm text-mist">No chats yet. Pick a girl or create one.</p>
          <div className="grid grid-cols-3 gap-2">
            {featured.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenChat(c.id)}
                className="rounded-xl overflow-hidden border border-white/10 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={characterMediaUrl(c, "beauty")} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-1 text-[10px] truncate text-center">{c.name.split(" ")[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {customs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-pink-200 mb-2">Your creations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {customs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenChat(c.id, c)}
                className="girl-card rounded-2xl overflow-hidden border border-pink-500/30 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatar?.startsWith("http") || c.avatar?.startsWith("data:") ? c.avatar : characterMediaUrl(c, "beauty")}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="p-2">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-zinc-500">Custom · AI</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-pink-200 mb-2">Continue</h2>
          <ul className="space-y-2">
            {rows.map((r) => {
              const mems = loadMemories(r.character.id).slice(0, 3);
              return (
                <li key={r.character.id}>
                  <button
                    type="button"
                    onClick={() => onOpenChat(r.character.id, r.character.id.startsWith("custom-") ? r.character : undefined)}
                    className="w-full flex gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-3 text-left hover:border-pink-500/40 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={characterMediaUrl(r.character, "beauty")}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-cream truncate">{r.character.name}</span>
                        <span className="text-[10px] text-pink-300 tabular-nums">{r.intimacy}%</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{r.lastLine}</p>
                      {mems.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {mems.map((m) => (
                            <span
                              key={m.id}
                              className="rounded-full bg-pink-500/15 border border-pink-500/25 px-2 py-0.5 text-[10px] text-pink-100"
                            >
                              remembers: {m.text.slice(0, 28)}
                              {m.text.length > 28 ? "…" : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
