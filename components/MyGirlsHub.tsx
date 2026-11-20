"use client";

import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { getGallery, loadChat, getIntimacy, type GalleryItem } from "@/lib/storage";
import { encodeSharedCharacterUrl } from "@/lib/shareCardUrl";
import { cn } from "@/lib/cn";
import { COMPANION_LIBRARY_EVENT, loadSavedCompanions } from "@/lib/companionLibrary";

type HubGirl = {
  character: Character;
  messageCount: number;
  intimacy: number;
  galleryCount: number;
  lastPreview: string;
  isCustom: boolean;
};

function loadCustomCharacters(): Character[] {
  return loadSavedCompanions();
}

export function MyGirlsHub({
  onHome,
  onOpenChat,
  onCreate,
}: {
  onHome?: () => void;
  onOpenChat: (character: Character) => void;
  onCreate?: () => void;
}) {
  const [customs, setCustoms] = useState<Character[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const shareCharacter = async (e: React.MouseEvent, character: Character) => {
    e.stopPropagation();
    const url = await encodeSharedCharacterUrl(character, typeof window !== "undefined" ? window.location.origin : undefined);
    await navigator.clipboard?.writeText(url).catch(() => {});
    setSharedId(character.id);
    setTimeout(() => setSharedId(null), 2000);
  };

  useEffect(() => {
    const refresh = () => { setCustoms(loadCustomCharacters()); setGallery(getGallery()); };
    refresh();
    window.addEventListener(COMPANION_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COMPANION_LIBRARY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const rows = useMemo(() => {
    const byId = new Map<string, HubGirl>();
    const all = [...CHARACTERS, ...customs];

    for (const c of all) {
      const msgs = loadChat(c.id);
      const intimacy = getIntimacy(c.id, c.intimacy ?? 0);
      const galleryCount = gallery.filter((g) => g.characterId === c.id).length;
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      const hasActivity = msgs.length > 0 || galleryCount > 0 || intimacy > (c.intimacy ?? 0);
      if (!hasActivity && !customs.some((x) => x.id === c.id)) continue;
      byId.set(c.id, {
        character: c,
        messageCount: msgs.length,
        intimacy,
        galleryCount,
        lastPreview: last?.content?.slice(0, 80) || c.tagline || c.initialMessage?.slice(0, 80) || "",
        isCustom: customs.some((x) => x.id === c.id),
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
      return b.intimacy - a.intimacy;
    });
  }, [customs, gallery]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          {onHome && (
            <button type="button" onClick={onHome} className="text-sm text-zinc-400 hover:text-white mb-2">
              ← Home
            </button>
          )}
          <h1 className="text-2xl font-semibold text-white tracking-tight">My Girls</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Recent chats, customs, and galleries — all free, saved on this device.
          </p>
        </div>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Create
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center space-y-3">
          <p className="text-zinc-300">No active girls yet.</p>
          <p className="text-sm text-zinc-500">Start a chat or create a custom character — everything stays free.</p>
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="mt-2 rounded-xl border border-pink-500/40 bg-pink-500/10 px-4 py-2 text-sm text-pink-100"
            >
              Create your first girl
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.character.id}>
              <div
                role="group"
                aria-label={row.character.name}
                className={cn(
                  "w-full text-left rounded-2xl border border-white/10 bg-zinc-900/70 p-4 flex gap-4 hover:border-pink-500/40 transition",
                )}
              >
                <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.character.avatar || ""}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <button type="button" onClick={() => onOpenChat(row.character)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{row.character.name}</span>
                    {row.isCustom && (
                      <span className="text-[10px] uppercase tracking-wide rounded-full bg-fuchsia-600/30 text-fuchsia-200 px-2 py-0.5">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{row.lastPreview}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span>{row.messageCount} msgs</span>
                    <span>·</span>
                    <span>{row.intimacy}% intimacy</span>
                    <span>·</span>
                    <span>{row.galleryCount} media</span>
                  </div>
                </button>
                <div className="self-center flex items-center gap-2 shrink-0">
                  {row.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => void shareCharacter(e, row.character)}
                      className="rounded-full border border-[#00f5ff]/45 bg-[#00f5ff]/10 px-2.5 py-1 text-[11px] font-bold text-[#00f5ff] hover:bg-[#00f5ff]/20"
                    >
                      {sharedId === row.character.id ? "Copied ✓" : "🔗 Share Link"}
                    </button>
                  )}
                  <span className="text-pink-300 text-sm font-medium">Continue →</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
