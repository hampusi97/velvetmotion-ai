"use client";

import { buildFeed } from "@/lib/feed";

const MOOD_STYLE: Record<string, string> = {
  flirty: "bg-pink-500/20 text-pink-200",
  tease: "bg-fuchsia-500/20 text-fuchsia-200",
  soft: "bg-rose-500/15 text-rose-200",
  explicit: "bg-red-500/20 text-red-200",
};

export function DailyFeed({ onOpenGirl }: { onOpenGirl: (id: string) => void }) {
  const posts = buildFeed(12);
  return (
    <section className="mt-10 mb-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-cream md:text-3xl">Their day</h2>
          <p className="text-sm text-mist">Flirty, teasing, and explicit notes — she reaches out first.</p>
        </div>
      </div>
      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpenGirl(p.characterId)}
              className="flex w-full gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-pink-500/40 hover:bg-pink-500/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.avatar}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover bg-zinc-800 ring-1 ring-pink-500/30"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-medium text-cream">{p.characterName}</span>
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${MOOD_STYLE[p.mood] || ""}`}>
                    {p.mood}
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-500">{p.hoursAgo}h ago</span>
                </div>
                <p className="mt-0.5 text-sm text-mist line-clamp-2">{p.text}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
