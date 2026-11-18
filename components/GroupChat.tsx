"use client";

import { useState } from "react";
import { CHARACTERS, type Character, fallbackReply } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

type Msg = { role: "user" | "girl"; content: string; name?: string; characterId?: string };

const COLORS = ["border-pink-500/40", "border-fuchsia-500/40", "border-rose-500/40", "border-violet-500/40"];

export function GroupChat({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState<string[]>(() =>
    CHARACTERS.slice(0, 3).map((c) => c.id),
  );
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const girls = selected
    .map((id) => CHARACTERS.find((c) => c.id === id))
    .filter(Boolean) as Character[];

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 4) return [...s.slice(1), id];
      return [...s, id];
    });
  };

  const start = () => {
    if (girls.length < 2) return;
    setStarted(true);
    const intros: Msg[] = girls.map((g, i) => ({
      role: "girl",
      characterId: g.id,
      name: g.name,
      content:
        i === 0
          ? `Hey… ${g.name.split(" ")[0]} here. ${girls.length} of us in the room. What do you want?`
          : `${g.name.split(" ")[0]}. Don't forget me.`,
    }));
    setMessages(intros);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || girls.length < 2) return;
    setInput("");
    setBusy(true);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);

    try {
      // Try API group mode with first two; fill rest with local
      const [primary, partner, ...rest] = girls;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: primary.id,
          partnerCharacterId: partner.id,
          messages: next.slice(-10).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          intimacy: 70,
        }),
      });
      const replies: Msg[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.groupReplies)) {
          for (const g of data.groupReplies) {
            replies.push({
              role: "girl",
              characterId: g.characterId,
              name: g.characterName,
              content: g.content,
            });
          }
        }
      }
      if (replies.length === 0) {
        replies.push({
          role: "girl",
          characterId: primary.id,
          name: primary.name,
          content: fallbackReply(primary, text, false),
        });
        replies.push({
          role: "girl",
          characterId: partner.id,
          name: partner.name,
          content: fallbackReply(partner, text, false),
        });
      }
      for (const g of rest) {
        replies.push({
          role: "girl",
          characterId: g.id,
          name: g.name,
          content: fallbackReply(g, text, false),
        });
      }
      setMessages([...next, ...replies]);
    } catch {
      setMessages([
        ...next,
        ...girls.map((g) => ({
          role: "girl" as const,
          characterId: g.id,
          name: g.name,
          content: fallbackReply(g, text, false),
        })),
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <h1 className="font-display text-3xl text-cream">Group chat</h1>
        <p className="text-sm text-mist">Pick 2–4 girls. They all reply in one thread.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {CHARACTERS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`rounded-2xl border overflow-hidden text-left ${
                  on ? "border-pink-500 ring-2 ring-pink-500/40" : "border-white/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={characterMediaUrl(c, "beauty")} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-1 text-[10px] truncate text-center">{c.name.split(" ")[0]}</div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={start}
          disabled={selected.length < 2}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold disabled:opacity-40"
        >
          Start with {selected.length} girls
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ←
        </button>
        <div className="flex -space-x-2">
          {girls.map((g) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={g.id}
              src={characterMediaUrl(g, "beauty")}
              alt=""
              className="h-9 w-9 rounded-full border border-pink-400 object-cover"
            />
          ))}
        </div>
        <div className="text-sm font-medium text-cream truncate">
          {girls.map((g) => g.name.split(" ")[0]).join(" · ")}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((m, i) => {
          const colorIdx = girls.findIndex((g) => g.id === m.characterId);
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-pink-600 text-white"
                    : `bg-zinc-900 border ${COLORS[Math.max(0, colorIdx) % COLORS.length]}`
                }`}
              >
                {m.name && <div className="text-[10px] text-pink-300 mb-0.5">{m.name}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
        {busy && <div className="text-xs text-zinc-500">Everyone is typing…</div>}
      </div>
      <div className="flex gap-2 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Message the group…"
          className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="px-4 rounded-2xl bg-pink-600 font-medium text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
