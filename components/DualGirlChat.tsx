"use client";

import { useState } from "react";
import { CHARACTERS, type Character, fallbackReply } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

type Msg = { role: "user" | "a" | "b"; content: string; name?: string };

export function DualGirlChat({ onHome }: { onHome: () => void }) {
  const [aId, setAId] = useState(CHARACTERS[0]?.id || "");
  const [bId, setBId] = useState(CHARACTERS[1]?.id || "");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const a = CHARACTERS.find((c) => c.id === aId) as Character | undefined;
  const b = CHARACTERS.find((c) => c.id === bId) as Character | undefined;

  const start = () => {
    if (!a || !b || a.id === b.id) return;
    setStarted(true);
    setMessages([
      {
        role: "a",
        name: a.name,
        content: `Hey… ${a.name} here. ${b.name} is with me. What do you want from both of us?`,
      },
      {
        role: "b",
        name: b.name,
        content: `${b.name} here. Don’t ignore me either.`,
      },
    ]);
  };

  const send = () => {
    const text = input.trim();
    if (!text || !a || !b || busy) return;
    setInput("");
    setBusy(true);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    // Staggered dual replies using fallback (API dual can be wired later)
    const replyA = fallbackReply(a, text, false);
    const replyB = fallbackReply(b, `${text} (responding as the second girl in a dual scene with ${a.name})`, false);
    setTimeout(() => {
      setMessages([
        ...next,
        { role: "a", name: a.name, content: replyA },
        { role: "b", name: b.name, content: replyB },
      ]);
      setBusy(false);
    }, 600);
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <h1 className="font-display text-3xl text-cream">Dual girl chat</h1>
        <p className="text-sm text-mist">Pick two companions. They both reply in the same thread.</p>
        <div className="grid grid-cols-2 gap-4">
          {(["A", "B"] as const).map((slot) => (
            <div key={slot}>
              <label className="text-xs text-zinc-500">Girl {slot}</label>
              <select
                value={slot === "A" ? aId : bId}
                onChange={(e) => (slot === "A" ? setAId(e.target.value) : setBId(e.target.value))}
                className="mt-1 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
              >
                {CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {a && b && (
          <div className="flex -space-x-4 justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterMediaUrl(a, "beauty")} alt="" className="h-20 w-20 rounded-full border-2 border-pink-400 object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterMediaUrl(b, "beauty")} alt="" className="h-20 w-20 rounded-full border-2 border-fuchsia-400 object-cover" />
          </div>
        )}
        <button
          type="button"
          onClick={start}
          disabled={!a || !b || a.id === b.id}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold disabled:opacity-40"
        >
          Start dual chat
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
          {a && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={characterMediaUrl(a, "beauty")} alt="" className="h-9 w-9 rounded-full border border-pink-400 object-cover" />
          )}
          {b && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={characterMediaUrl(b, "beauty")} alt="" className="h-9 w-9 rounded-full border border-fuchsia-400 object-cover" />
          )}
        </div>
        <div className="text-sm font-medium text-cream truncate">
          {a?.name.split(" ")[0]} + {b?.name.split(" ")[0]}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-pink-600 text-white"
                  : m.role === "a"
                    ? "bg-zinc-900 border border-pink-500/30"
                    : "bg-zinc-900 border border-fuchsia-500/30"
              }`}
            >
              {m.name && <div className="text-[10px] text-pink-300 mb-0.5">{m.name}</div>}
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-zinc-500">Both typing…</div>}
      </div>
      <div className="flex gap-2 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message both…"
          className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="px-4 rounded-2xl bg-pink-600 font-medium text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
