"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { saveMemoryDB } from "@/lib/db";

export type MemoryCategory = "About You" | "Preferences" | "Inside Jokes" | "Pinned Rules";

export interface VaultMemoryItem {
  id: string;
  category: MemoryCategory;
  text: string;
  pinned?: boolean;
  updatedAt: number;
}

const CATEGORIES: MemoryCategory[] = ["About You", "Preferences", "Inside Jokes", "Pinned Rules"];

function storageKey(characterId: string) {
  return `velvetmotion_memory_${characterId}`;
}

export function loadCategorizedMemories(characterId: string): VaultMemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(characterId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<string | Partial<VaultMemoryItem>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, idx): VaultMemoryItem | null => {
        if (typeof item === "string") {
          return {
            id: `m-${idx}-${item.slice(0, 8)}`,
            category: "About You",
            text: item,
            pinned: false,
            updatedAt: Date.now(),
          };
        }
        if (item && typeof item.text === "string") {
          return {
            id: item.id || `m-${idx}-${Date.now()}`,
            category: (item.category as MemoryCategory) || "About You",
            text: item.text,
            pinned: Boolean(item.pinned),
            updatedAt: item.updatedAt || Date.now(),
          };
        }
        return null;
      })
      .filter(Boolean) as VaultMemoryItem[];
  } catch {
    return [];
  }
}

export function saveCategorizedMemories(characterId: string, items: VaultMemoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(characterId), JSON.stringify(items));
    window.dispatchEvent(new Event("vm:cloud-sync-request"));
  } catch {
    /* ignore */
  }
  void saveMemoryDB(
    characterId,
    items.map((m) => `${m.pinned ? "[PINNED] " : ""}[${m.category}] ${m.text}`),
  );
}

export function MemoryVaultPanel({
  characterId,
  characterName,
  onClose,
}: {
  characterId: string;
  characterName: string;
  onClose?: () => void;
}) {
  const [items, setItems] = useState<VaultMemoryItem[]>(() => loadCategorizedMemories(characterId));
  const [category, setCategory] = useState<MemoryCategory>("About You");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setItems(loadCategorizedMemories(characterId));
  }, [characterId]);

  const commit = (next: VaultMemoryItem[]) => {
    setItems(next);
    saveCategorizedMemories(characterId, next);
  };

  const addItem = () => {
    const clean = draft.trim();
    if (!clean) return;
    const next: VaultMemoryItem[] = [
      {
        id: `mem-${Date.now()}`,
        category,
        text: clean,
        pinned: category === "Pinned Rules",
        updatedAt: Date.now(),
      },
      ...items,
    ];
    commit(next);
    setDraft("");
  };

  const togglePin = (id: string) => {
    commit(items.map((m) => (m.id === id ? { ...m, pinned: !m.pinned, updatedAt: Date.now() } : m)));
  };

  const removeItem = (id: string) => {
    commit(items.filter((m) => m.id !== id));
  };

  const saveEdit = (id: string) => {
    const clean = editDraft.trim();
    if (!clean) return;
    commit(items.map((m) => (m.id === id ? { ...m, text: clean, updatedAt: Date.now() } : m)));
    setEditingId(null);
  };

  const ordered = [...items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-[#f7f7fc] flex items-center gap-1.5">
            <BookmarkCheck className="h-4 w-4 text-[#00f5ff]" />
            {characterName.split(" ")[0]}&apos;s Memory Vault
          </h3>
          <p className="text-[11px] text-[#a6a6c4]">Injected into every reply. Pin rules or edit anytime.</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Memory Vault"
            className="rounded-full border border-white/15 p-1.5 text-zinc-300 hover:border-[#ff1e8e]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border transition ${
              category === cat
                ? "border-[#00f5ff] bg-[#00f5ff]/15 text-[#00f5ff]"
                : "border-white/10 text-[#a6a6c4] hover:border-white/25"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={`Add ${category.toLowerCase()} note...`}
          className="flex-1 rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#00f5ff]"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 rounded-xl neon-btn-primary px-3 py-2 text-xs font-bold disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#05050a]/60 p-4 text-center text-xs text-[#a6a6c4]">
            No saved memories yet. Every 5 turns automatically distills durable facts here, or add one manually above.
          </div>
        ) : (
          ordered.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border p-2.5 text-xs transition ${
                m.pinned ? "border-[#00f5ff]/55 bg-[#00f5ff]/8" : "border-white/10 bg-[#0c0c16]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="rounded-full border border-[#ff1e8e]/30 bg-[#ff1e8e]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-200">
                  {m.category}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePin(m.id)}
                    title={m.pinned ? "Unpin" : "Pin to prompt"}
                    className={`rounded-lg p-1 ${m.pinned ? "text-[#00f5ff]" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(m.id);
                      setEditDraft(m.text);
                    }}
                    title="Edit memory"
                    className="rounded-lg p-1 text-zinc-400 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(m.id)}
                    title="Delete memory"
                    className="rounded-lg p-1 text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editingId === m.id ? (
                <div className="flex gap-1.5 mt-1">
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                    className="flex-1 rounded-lg border border-[#00f5ff]/40 bg-[#05050a] px-2 py-1 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(m.id)}
                    className="rounded-lg bg-[#00f5ff]/20 border border-[#00f5ff]/50 px-2 py-1 text-[10px] font-bold text-[#00f5ff]"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-[#f7f7fc] leading-relaxed">{m.text}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function MemoryVaultDrawer({
  open,
  onClose,
  characterId,
  characterName,
}: {
  open: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-sm neon-glass border-l border-[#ff1e8e]/45 bg-[#080812]/95 p-5 shadow-2xl">
        <MemoryVaultPanel characterId={characterId} characterName={characterName} onClose={onClose} />
      </aside>
    </div>
  );
}
