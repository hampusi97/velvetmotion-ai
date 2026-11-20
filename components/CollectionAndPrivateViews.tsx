"use client";

import { useState } from "react";
import { Download, Lock, Sparkles, Trash2 } from "lucide-react";
import { getGallery, removeGalleryItem, type GalleryItem } from "@/lib/storage";
import { SafeImage } from "@/components/SafeImage";

export function CollectionGalleryView({
  onHome,
  onOpenStudio,
}: {
  onHome: () => void;
  onOpenStudio?: () => void;
}) {
  const [items, setItems] = useState<GalleryItem[]>(() => getGallery());

  const refresh = () => setItems(getGallery());

  const handleDelete = (id: string) => {
    removeGalleryItem(id);
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onHome} className="text-xs text-[#00f5ff] hover:underline mb-1 block">
            ← Home
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#f7f7fc] neon-text-glow">
            My Collection &amp; Saved Selfies
          </h1>
          <p className="text-xs text-[#a6a6c4]">
            Saved portraits and eligible clips from this device. Browser storage can be cleared; download important media to keep a separate copy.
          </p>
        </div>
        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="inline-flex items-center gap-1.5 rounded-full neon-btn-primary px-4 py-2 text-xs font-bold"
          >
            <Sparkles className="h-3.5 w-3.5" /> Open Media Studio
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl neon-glass p-10 text-center space-y-3">
          <Lock className="h-8 w-8 mx-auto text-[#ff1e8e]" />
          <p className="text-sm font-bold text-[#f7f7fc]">Your Collection is empty</p>
          <p className="text-xs text-[#a6a6c4] max-w-sm mx-auto">
            Generate an image in Chat or Media Studio, then save it to your local collection. Download anything important; clearing browser storage can remove saved items.
          </p>
          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="rounded-full neon-btn-primary px-5 py-2 text-xs font-bold"
            >
              Create First Image
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden neon-glass">
              <SafeImage src={item.url} alt={item.prompt || item.characterName} className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
                <div className="text-xs font-bold text-white truncate">{item.characterName}</div>
                <div className="text-[10px] text-[#00f5ff] truncate">{item.type || "Saved"}</div>
              </div>
              <div className="absolute right-2 top-2 flex gap-1 opacity-90">
                <a
                  href={item.url}
                  download={`${item.characterId}-${item.id}.png`}
                  className="rounded-lg bg-black/70 p-1.5 text-[#00f5ff] hover:bg-black"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg bg-black/70 p-1.5 text-rose-400 hover:bg-black"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
