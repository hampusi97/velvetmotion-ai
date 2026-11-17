"use client";
import { useEffect, useState } from "react";
import { getGallery, clearGallery, getCoins, addCoins, type GalleryItem } from "@/lib/storage";

export function UtilitySection({
  view,
  onHome,
  onOpenCustom,
}: {
  view: string;
  onHome: () => void;
  onOpenCustom: (name: string) => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    setText("");
    try {
      const saved = JSON.parse(localStorage.getItem(`vm-${view}`) || "[]");
      setItems(Array.isArray(saved) ? saved.filter((x) => typeof x === "string") : []);
    } catch {
      setItems([]);
    }
    if (view === "gallery") {
      setGallery(getGallery());
      setCoins(getCoins());
    }
  }, [view]);

  const add = () => {
    if (!text.trim()) return;
    const next = [...items, text.trim()];
    setItems(next);
    setText("");
    try {
      localStorage.setItem(`vm-${view}`, JSON.stringify(next));
    } catch {
      /* session state remains available */
    }
  };

  const title =
    view === "create"
      ? "Create Girl"
      : view === "suggest"
        ? "Suggest a Feature"
        : view === "gallery"
          ? "Gallery"
          : "Room";

  if (view === "gallery") {
    const shown = gallery.filter((g) => {
      if (filter === "all") return true;
      if (filter === "video") return g.type === "video";
      return g.type !== "video";
    });

    return (
      <section className="mx-auto max-w-4xl space-y-4">
        <button onClick={onHome} className="text-pink-400">
          ← Home
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Gallery</h1>
          <div className="text-sm text-amber-300">{coins} coins</div>
        </div>
        <p className="text-sm text-zinc-400">
          Generated nudes, explicit shots, and cinematic sequences stay on this device.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                filter === f ? "border-pink-500 bg-pink-500/15 text-pink-200" : "border-zinc-700 text-zinc-300"
              }`}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              addCoins(150);
              setCoins(getCoins());
            }}
            className="px-3 py-1.5 rounded-full text-sm border border-amber-500/40 text-amber-300"
          >
            +150 demo coins
          </button>
          {gallery.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear all saved media on this device?")) {
                  clearGallery();
                  setGallery([]);
                }
              }}
              className="px-3 py-1.5 rounded-full text-sm border border-red-500/30 text-red-300"
            >
              Clear gallery
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <div className="text-5xl mb-3">🖼️</div>
            <p>No media yet. Open a chat and generate portrait, nude, explicit, or sex video.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((item) => (
              <figure key={item.id} className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.type} className="w-full aspect-[3/4] object-cover" />
                <figcaption className="p-2 text-[11px] text-zinc-400">
                  <span className="text-pink-300">{item.characterName}</span> · {item.type}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={onHome} className="text-pink-400">
        ← Home
      </button>
      <h1 className="text-2xl font-bold">{title}</h1>
      {view === "room" ? (
        <p>This room is a demo. Live group chat is not connected.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Saved on this device.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <input
              aria-label={view === "create" ? "Her name" : "Feature idea"}
              placeholder={view === "create" ? "Her name" : "What do you want?"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
            />
            <button disabled={!text.trim()} className="rounded-xl bg-pink-600 px-4 disabled:opacity-40">
              {view === "create" ? "Create" : "Send"}
            </button>
          </form>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="rounded-xl bg-zinc-900 p-4">
                {item}
                {view === "create" && (
                  <button onClick={() => onOpenCustom(item)} className="ml-4 text-pink-400">
                    Chat
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
