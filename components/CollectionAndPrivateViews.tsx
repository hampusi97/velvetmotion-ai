"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Heart, Lock, Search, Sparkles, Tags, Trash2 } from "lucide-react";
import { getGallery, removeGalleryItem, type GalleryItem } from "@/lib/storage";
import { deleteGalleryDB, exportFullBackupJson } from "@/lib/db";
import { deleteMediaFromFirestore } from "@/lib/firebase";
import { SafeImage } from "@/components/SafeImage";

type GalleryMeta = Record<string, { favorite?: boolean; tags?: string[] }>;
const GALLERY_META_KEY = "vm-gallery-meta-v1";
function readGalleryMeta(): GalleryMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GALLERY_META_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as GalleryMeta : {};
  } catch { return {}; }
}
function localExtension(item: GalleryItem) {
  if (item.url.startsWith("data:image/webp")) return "webp";
  if (item.url.startsWith("data:image/jpeg")) return "jpg";
  if (item.url.startsWith("data:video/mp4") || /\\.mp4(?:$|[?#])/i.test(item.url)) return "mp4";
  if (item.type === "video" || /\\.webm(?:$|[?#])/i.test(item.url)) return "webm";
  return "png";
}

export function CollectionGalleryView({
  onHome,
  onOpenStudio,
}: {
  onHome: () => void;
  onOpenStudio?: () => void;
}) {
  const [items, setItems] = useState<GalleryItem[]>(() => getGallery());
  const [meta, setMeta] = useState<GalleryMeta>({});
  const [query, setQuery] = useState("");
  const [characterFilter, setCharacterFilter] = useState("all");
  const [kind, setKind] = useState<"all" | "images" | "video" | "favorites">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMeta(readGalleryMeta());
    const refresh = () => setItems(getGallery());
    window.addEventListener("vm:vault-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("vm:vault-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const updateMeta = (id: string, next: { favorite?: boolean; tags?: string[] }) => {
    setMeta((prev) => {
      const updated = { ...prev, [id]: { ...(prev[id] || {}), ...next } };
      try { window.localStorage.setItem(GALLERY_META_KEY, JSON.stringify(updated)); }
      catch { setStatus("Gallery labels are temporary because browser storage is unavailable."); }
      return updated;
    });
  };

  const characters = useMemo(() => Array.from(new Set(items.map((x) => x.characterName))).sort(), [items]);
  const shown = useMemo(() => {
    const term = query.toLowerCase().trim();
    return items.filter((x) => {
      const isVideo = x.type === "video" || /\\.(mp4|webm)(?:$|[?#])/i.test(x.url);
      if (characterFilter !== "all" && x.characterName !== characterFilter) return false;
      if (kind === "video" && !isVideo) return false;
      if (kind === "images" && isVideo) return false;
      if (kind === "favorites" && !meta[x.id]?.favorite) return false;
      const tags = meta[x.id]?.tags || [];
      return !term || [x.characterName, x.type, x.prompt || "", ...tags].some((v) => v.toLowerCase().includes(term));
    }).sort((a,b) => b.createdAt - a.createdAt);
  }, [items, query, characterFilter, kind, meta]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const removeSelected = async (ids: string[]) => {
    if (!ids.length) return;
    setBusy(true);
    setStatus("");
    let remoteIssues = 0;
    try {
      for (const id of ids) {
        removeGalleryItem(id);
        await deleteGalleryDB(id);
        try { await deleteMediaFromFirestore(id); } catch { remoteIssues++; }
      }
      setItems(getGallery());
      setSelected([]);
      setConfirmDelete(false);
      setStatus(`Removed ${ids.length} item(s) from local gallery and IndexedDB.${remoteIssues ? " Some cloud deletions failed; check connected storage." : " Cloud deletions were requested where available."}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't delete every selected item.");
      setItems(getGallery());
    } finally { setBusy(false); }
  };

  const saveTag = (id: string) => {
    const parts = tagDraft.split(",").map((x) => x.trim().slice(0, 30)).filter(Boolean).slice(0, 8);
    updateMeta(id, { tags: Array.from(new Set(parts)) });
    setEditingTagId(null);
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const json = await exportFullBackupJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "velvetmotion-private-backup.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Full local backup downloaded. It is unencrypted: store it in a secure folder.");
    } catch {
      setStatus("Backup could not be exported. Check browser storage or use Settings.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5 pb-16 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={onHome} className="text-xs text-[#e6afc2] hover:text-white">← Home</button>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[.24em] text-[#e6adc1]">Private Atelier / Collection</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Your private collection.</h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            Search and organize local media by character, favorites and tags. Browser storage can be cleared;
            save an offline backup or download important files separately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportBackup()} disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-[#e2b5c8]/30 bg-[#392333]/40 px-4 py-2.5 text-xs font-semibold text-rose-100 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export full backup
          </button>
          {onOpenStudio && <button type="button" onClick={onOpenStudio}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#c67496] to-[#a05983] px-4 py-2.5 text-xs font-semibold text-white">
            <Sparkles className="h-4 w-4" /> Open Studio
          </button>}
        </div>
      </div>

      <div className="grid gap-3 rounded-[22px] border border-white/10 bg-[#1c1420] p-4 sm:grid-cols-[1fr_190px]">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <Search className="h-4 w-4 text-[#e7b2c6]" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            aria-label="Search media and tags" placeholder="Search media, scenes, or tags"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none" />
        </label>
        <select aria-label="Filter by companion" value={characterFilter} onChange={(e) => setCharacterFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#211727] px-3 py-2 text-xs text-white">
          <option value="all">All characters</option>
          {characters.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {(["all", "images", "video", "favorites"] as const).map((k) =>
            <button type="button" aria-pressed={kind === k} key={k} onClick={() => setKind(k)}
              className={`rounded-full border px-3.5 py-1.5 text-xs capitalize ${kind === k ? "border-[#df9fba]/60 bg-[#bd658c]/20 text-white" : "border-white/10 text-zinc-400 hover:text-white"}`}>{k}</button>)}
          <span className="ml-auto text-xs text-zinc-500">{shown.length} / {items.length} saved</span>
        </div>
      </div>

      {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-300/10 p-3">
        <span className="text-xs text-zinc-200">{selected.length} selected</span>
        <button type="button" onClick={() => setSelected([])} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">Clear selection</button>
        {confirmDelete
          ? <><span className="text-xs text-rose-200">Delete selected items from local collection?</span>
              <button type="button" disabled={busy} onClick={() => void removeSelected(selected)}
                className="rounded-full bg-rose-700 px-3 py-1.5 text-xs font-semibold">Confirm delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs">Cancel</button></>
          : <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-rose-400/35 px-3 py-1.5 text-xs text-rose-200">Delete selected</button>}
      </div>}
      {status && <p role="status" className="rounded-xl border border-rose-300/15 bg-[#261a27] p-3 text-xs text-[#eac0d0]">{status}</p>}

      {!shown.length ? (
        <div className="rounded-[24px] border border-white/10 bg-[#17131c] px-6 py-12 text-center">
          <Lock className="mx-auto h-8 w-8 text-[#e7b4c5]" />
          <p className="mt-4 text-base font-semibold">No matching saved media</p>
          <p className="mt-2 text-xs text-zinc-400">Try a different filter or save an image from Media Studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((item) => {
            const isVideo = item.type === "video" || /\\.(mp4|webm)(?:$|[?#])/i.test(item.url);
            const tags = meta[item.id]?.tags || [];
            return <article key={item.id}
              className={`group flex flex-col overflow-hidden rounded-[22px] border bg-[#1b1520] ${selected.includes(item.id) ? "border-rose-300/70" : "border-white/10"}`}>
              <div className="relative aspect-[3/4] overflow-hidden bg-[#110e16]">
                {isVideo
                  ? <video src={item.url} muted controls playsInline preload="metadata" className="h-full w-full object-cover" />
                  : <SafeImage src={item.url} alt={item.prompt || item.characterName} className="h-full w-full object-cover object-top" />}
                <label className="absolute left-2 top-2 flex cursor-pointer items-center rounded-full bg-black/75 p-2" title="Select media">
                  <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.characterName} media`} className="accent-[#d48daa]" />
                </label>
                <button type="button" aria-label={meta[item.id]?.favorite ? "Remove favorite" : "Favorite"}
                  onClick={() => updateMeta(item.id, { favorite: !meta[item.id]?.favorite })}
                  className="absolute right-2 top-2 rounded-full bg-black/75 p-2 text-rose-200">
                  <Heart className="h-4 w-4" fill={meta[item.id]?.favorite ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <h3 className="truncate text-xs font-semibold text-white">{item.characterName}</h3>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-400">{item.type} · {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                {!!tags.length && <div className="flex flex-wrap gap-1">{tags.map((tag) => <span key={tag}
                  className="rounded-full bg-rose-300/10 px-2 py-0.5 text-[10px] text-rose-200">{tag}</span>)}</div>}
                {editingTagId === item.id ? (
                  <div className="space-y-1">
                    <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} maxLength={250}
                      aria-label="Edit comma-separated tags" placeholder="cinematic, favorites"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-[11px] text-white" />
                    <button type="button" onClick={() => saveTag(item.id)} className="rounded-full bg-rose-700 px-3 py-1 text-[10px]">Save tags</button>
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => { setEditingTagId(item.id); setTagDraft(tags.join(", ")); }}
                    className="inline-flex items-center gap-1 text-[11px] text-[#e5b6c9]"><Tags className="h-3.5 w-3.5" /> Tags</button>
                  <a href={item.url} download={`velvetmotion-${item.id}.${localExtension(item)}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#e5b6c9]"><Download className="h-3.5 w-3.5" /> Save file</a>
                  <button type="button" onClick={() => { setSelected([item.id]); setConfirmDelete(true); }}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-rose-300"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
      <p className="text-[10px] leading-5 text-zinc-500">
        This is a local gallery, not encrypted cloud storage. Full JSON backups may contain sensitive conversations and media.
        A remote/cloud provider or downloaded file may retain additional copies; manage those separately.
      </p>
    </section>
  );
}

const PRIVATE_SETS = [
  {
    id: "priv-chloe-after",
    companionId: "chloe-parker",
    name: "Chloe Parker",
    title: "After-Hours Hoodie & Lace Set",
    cost: 20,
    preview: "/portraits/chloe-parker.webp",
    tag: "Candlelight",
  },
  {
    id: "priv-maya-pool",
    companionId: "maya-solis",
    name: "Maya Solis",
    title: "Midnight Rooftop Pool Dare",
    cost: 25,
    preview: "/portraits/maya-solis.webp",
    tag: "Poolside",
  },
  {
    id: "priv-sloane-suite",
    companionId: "sloane-kensington",
    name: "Sloane Kensington",
    title: "Penthouse Silk Keycard Set",
    cost: 30,
    preview: "/portraits/sloane-kensington.webp",
    tag: "Luxury",
  },
  {
    id: "priv-nova-cyber",
    companionId: "nova-park",
    name: "Nova Park",
    title: "Ultraviolet Balcony Confessions",
    cost: 25,
    preview: "/portraits/nova-park.webp",
    tag: "Cyber Noir",
  },
];

export function PrivateContentView({
  onHome,
  onOpenChat,
}: {
  onHome: () => void;
  onOpenChat: (companionId: string) => void;
}) {
  const [unlocked, setUnlocked] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("vm-unlocked-private-sets");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const unlockSet = (id: string) => {
    const next = Array.from(new Set([...unlocked, id]));
    setUnlocked(next);
    try {
      localStorage.setItem("vm-unlocked-private-sets", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <div>
        <button type="button" onClick={onHome} className="text-xs text-[#00f5ff] hover:underline mb-1 block">
          ← Home
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#f7f7fc] neon-text-glow">
          Private Content &amp; Unlockable Sets
        </h1>
        <p className="text-xs text-[#a6a6c4]">
          Exclusive private photo sets &amp; late-night scenes unlocked with free earned relationship coins.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRIVATE_SETS.map((item) => {
          const isOpen = unlocked.includes(item.id);
          return (
            <div key={item.id} className="rounded-3xl overflow-hidden neon-glass flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden bg-black">
                <SafeImage
                  src={item.preview}
                  alt={item.title}
                  className={`h-full w-full object-cover object-top transition duration-500 ${
                    isOpen ? "" : "blur-md scale-105 brightness-75"
                  }`}
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-[#00f5ff] border border-[#00f5ff]/40">
                  {item.tag}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-white">{item.name}</div>
                  <div className="text-xs text-[#a6a6c4] mt-0.5">{item.title}</div>
                </div>
                {isOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpenChat(item.companionId)}
                    className="w-full rounded-xl neon-btn-primary py-2 text-xs font-bold text-white"
                  >
                    Open Scene in Chat →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => unlockSet(item.id)}
                    className="w-full rounded-xl border border-[#ff1e8e]/50 bg-[#ff1e8e]/15 py-2 text-xs font-bold text-pink-200 hover:bg-[#ff1e8e]/25"
                  >
                    🔓 Unlock Private Set ({item.cost} Free 🪙)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
