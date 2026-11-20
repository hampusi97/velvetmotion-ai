"use client";

import { useEffect, useState } from "react";
import { Lightbulb, ThumbsUp, Send, Sparkles } from "lucide-react";
import { getUser } from "@/lib/auth";
import {
  INITIAL_SUGGESTIONS,
  type FeatureSuggestion,
  type SuggestionCategory,
} from "@/lib/suggestions";

const CATEGORIES: ("All" | SuggestionCategory)[] = [
  "All",
  "Mobile & Tablet",
  "AI & Video",
  "Frontend",
  "Backend",
  "Companions",
];

export function SuggestionsHub({ onHome }: { onHome: () => void }) {
  const [items, setItems] = useState<FeatureSuggestion[]>(INITIAL_SUGGESTIONS);
  const [filter, setFilter] = useState<"All" | SuggestionCategory>("All");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState<SuggestionCategory>("Frontend");
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vm-upvoted-suggestions");
      if (saved) setUpvotedIds(JSON.parse(saved));
    } catch {
      /* ignore */
    }

    let unsubFirestore = () => {};
    void import("@/lib/firebase")
      .then((fb) =>
        fb.subscribeSuggestionsFromFirestore((cloudItems) => {
          if (!cloudItems.length) return;
          setItems((prev) => {
            const map = new Map<string, FeatureSuggestion>();
            for (const item of [...INITIAL_SUGGESTIONS, ...prev, ...cloudItems]) {
              const existing = map.get(item.id);
              if (!existing || item.votes >= existing.votes) {
                map.set(item.id, item);
              }
            }
            return Array.from(map.values()).sort((a, b) => b.votes - a.votes);
          });
        }),
      )
      .then((u) => {
        unsubFirestore = u;
      })
      .catch(() => {});

    return () => {
      unsubFirestore();
    };
  }, []);

  const upvote = async (id: string) => {
    if (upvotedIds.includes(id)) return;
    const currentItem = items.find((s) => s.id === id);
    const nextVotes = (currentItem?.votes ?? 1) + 1;
    const nextUpvoted = [...upvotedIds, id];
    setUpvotedIds(nextUpvoted);
    try {
      localStorage.setItem("vm-upvoted-suggestions", JSON.stringify(nextUpvoted));
    } catch {
      /* ignore */
    }
    setItems((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, votes: nextVotes } : s))
        .sort((a, b) => b.votes - a.votes),
    );
    const saved = await import("@/lib/firebase")
      .then((fb) => fb.upvoteSuggestionInFirestore(id, nextVotes))
      .catch(() => false);
    if (!saved) setNotice("Vote saved on this device. Cloud syncing is unavailable; it is not a verified global vote.");

  };

  const submit = async () => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 4 || busy) return;
    setBusy(true);
    setNotice(null);
    const item: FeatureSuggestion = {
      id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle.slice(0, 120),
      detail: detail.trim().slice(0, 400),
      category,
      author: getUser()?.username || "VelvetMember",
      status: "Planned",
      votes: 1,
      createdAt: Date.now(),
    };
    try {
      const synced = await import("@/lib/firebase")
        .then((fb) => fb.submitSuggestionToFirestore(item))
        .catch(() => false);
      if (synced) {
        setItems((prev) => [item, ...prev]);
        setNotice("Suggestion submitted to the community roadmap.");
      } else {
        setItems((prev) => [item, ...prev]);
        setNotice("Suggestion is visible only in this session. Community sync is unavailable; nothing was submitted to a server.");
      }
      setTitle("");
      setDetail("");
    } finally {
      setBusy(false);
    }
  };

  const visible =
    filter === "All" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>

      <div className="rounded-3xl border border-pink-500/35 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-pink-300">
          <Lightbulb className="h-4 w-4 text-amber-300" /> Community Roadmap &amp; Upgrade Ideas
        </div>
        <h1 className="font-display text-3xl text-white">
          Vote &amp; Suggest Next Upgrades ✨
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Help shape the next backend, frontend, AI video, and Android/Apple mobile updates for VelvetMotion AI.
        </p>

        {/* Submit Suggestion Form */}
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4 space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Suggest a feature or companion upgrade…"
              className="sm:col-span-2 rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
              className="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="Optional details (how should it work?)"
              className="flex-1 rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            />
            <button
              type="button"
              disabled={busy || title.trim().length < 4}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </button>
          </div>
          {notice && <div className="text-xs text-emerald-300">{notice}</div>}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1.5 text-xs border transition ${
              filter === c
                ? "border-pink-500 bg-pink-500/20 text-pink-100 font-semibold"
                : "border-white/15 text-zinc-400 hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Live Roadmap List */}
      <div className="space-y-3">
        {visible.map((item) => {
          const voted = upvotedIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/85 p-4 hover:border-pink-500/35 transition"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-pink-200">
                    {item.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      item.status === "Live"
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                        : item.status === "In Progress"
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                          : "bg-white/10 text-zinc-300"
                    }`}
                  >
                    {item.status === "Live" ? "✓ Live" : item.status}
                  </span>
                  <span className="text-[10px] text-zinc-500">by {item.author}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => void upvote(item.id)}
                disabled={voted}
                className={`shrink-0 flex flex-col items-center justify-center rounded-2xl border px-3.5 py-2 text-xs font-bold transition ${
                  voted
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                    : "border-pink-500/35 bg-pink-500/10 text-pink-100 hover:bg-pink-500/25"
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5 mb-0.5" />
                <span>{item.votes}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
