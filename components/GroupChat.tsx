"use client";

import { useState } from "react";
import { Sparkles, Users } from "lucide-react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { generateCompanionReply, type RouterMessage } from "@/lib/chatRouter";
import { assertCompliance } from "@/lib/complianceFilter";
import { earnCompanionXp } from "@/lib/progression";

type Msg = { role: "user" | "girl"; content: string; name?: string; characterId?: string; slot?: 0 | 1 };

function pickDefaultPair(): [string, string] {
  const priya = CHARACTERS.find((c) => c.id === "priya" || /priya/i.test(c.name))?.id;
  const sofia = CHARACTERS.find((c) => c.id === "maya-solis" || /sofia|maya/i.test(c.name))?.id;
  if (priya && sofia && priya !== sofia) return [priya, sofia];
  return [CHARACTERS[0]?.id || "chloe-parker", CHARACTERS[1]?.id || "maya-solis"];
}

export function GroupChat({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState<string[]>(pickDefaultPair);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typingSpeaker, setTypingSpeaker] = useState<{ name: string; slot: 0 | 1 } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const girls = selected
    .map((id) => CHARACTERS.find((c) => c.id === id))
    .filter(Boolean) as Character[];

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.length > 2 ? s.filter((x) => x !== id) : s;
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  };

  const start = () => {
    if (girls.length < 2) return;
    setStarted(true);
    const [a, b] = girls;
    setMessages([
      {
        role: "girl",
        characterId: a.id,
        name: a.name,
        slot: 0,
        content: `*${a.name.split(" ")[0]} leans toward you first.* “Finally, both of us in one room. Who are you talking to first tonight?”`,
      },
      {
        role: "girl",
        characterId: b.id,
        name: b.name,
        slot: 1,
        content: `*${b.name.split(" ")[0]} arches an eyebrow at ${a.name.split(" ")[0]}.* “Don't steal the floor yet—I was already here first.”`,
      },
    ]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || typingSpeaker || girls.length < 2) return;
    const guard = assertCompliance(text);
    if (!guard.ok) {
      setErrorMsg(guard.reason);
      return;
    }
    setErrorMsg(null);
    setInput("");

    const [a, b] = girls;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);

    // 1. Companion A replies to the user first
    setTypingSpeaker({ name: a.name.split(" ")[0], slot: 0 });
    const historyA: RouterMessage[] = next.slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      text: m.name ? `[${m.name}]: ${m.content}` : m.content,
    }));
    const resA = await generateCompanionReply(historyA, {
      id: a.id,
      name: a.name,
      age: a.age,
      tagline: a.tagline,
      personality: `${a.personality}. You are in a lively 2-on-1 chat alongside ${b.name}; playfully compete for the user's attention.`,
    });

    const msgA: Msg = {
      role: "girl",
      characterId: a.id,
      name: a.name,
      slot: 0,
      content: resA.text,
    };
    const afterA = [...next, msgA];
    setMessages(afterA);
    earnCompanionXp(a.id, 4);

    // 2. Companion B receives Companion A's reply in her context and reacts to her + user
    setTypingSpeaker({ name: b.name.split(" ")[0], slot: 1 });
    const historyB: RouterMessage[] = afterA.slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      text: m.name ? `[${m.name}]: ${m.content}` : m.content,
    }));
    const resB = await generateCompanionReply(historyB, {
      id: b.id,
      name: b.name,
      age: b.age,
      tagline: b.tagline,
      personality: `${b.personality}. React directly to what ${a.name.split(" ")[0]} just said ("${resA.text.slice(0, 90)}") with playful banter and teasing rivalry while captivating the user.`,
    });

    const msgB: Msg = {
      role: "girl",
      characterId: b.id,
      name: b.name,
      slot: 1,
      content: resB.text,
    };
    setMessages([...afterA, msgB]);
    earnCompanionXp(b.id, 4);
    setTypingSpeaker(null);
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-16">
        <button type="button" onClick={onHome} className="text-[#00f5ff] text-sm hover:underline">
          ← Home
        </button>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#f7f7fc] neon-text-glow flex items-center gap-2">
            <Users className="h-6 w-6 text-[#ff1e8e]" />
            Live 2-on-1 Group Drama
          </h1>
          <p className="text-xs sm:text-sm text-[#a6a6c4] mt-1">
            Pick any 2 companions. They read each other&apos;s messages, banter, and compete for your attention.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[55dvh] overflow-y-auto pr-1">
          {CHARACTERS.slice(0, 24).map((c) => {
            const idx = selected.indexOf(c.id);
            const ringClass =
              idx === 0
                ? "border-[#ff1e8e] ring-2 ring-[#ff1e8e]/60"
                : idx === 1
                  ? "border-[#00f5ff] ring-2 ring-[#00f5ff]/60"
                  : "border-white/10 opacity-85 hover:opacity-100";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`relative rounded-2xl border overflow-hidden text-left transition ${ringClass}`}
              >
                <img src={staticPortraitUrl(c.id)} alt={c.name} className="aspect-[3/4] w-full object-cover object-top" />
                {idx >= 0 && (
                  <span
                    className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white ${
                      idx === 0 ? "bg-[#ff1e8e]" : "bg-[#00f5ff] text-black"
                    }`}
                  >
                    {idx === 0 ? "A" : "B"}
                  </span>
                )}
                <div className="p-1.5 text-[11px] font-semibold truncate text-center bg-[#0c0c16]">
                  {c.name.split(" ")[0]}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={start}
          disabled={selected.length < 2}
          className="w-full py-3.5 rounded-2xl neon-btn-primary font-bold text-sm disabled:opacity-40"
        >
          Start 2-on-1 Room · {girls.map((g) => g.name.split(" ")[0]).join(" × ")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100dvh-5.5rem)]">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button type="button" onClick={onHome} className="text-[#00f5ff] text-sm hover:underline">
            ←
          </button>
          <div className="flex -space-x-2">
            {girls.map((g, idx) => (
              <img
                key={g.id}
                src={staticPortraitUrl(g.id)}
                alt={g.name}
                className={`h-9 w-9 rounded-full object-cover object-top border-2 ${
                  idx === 0 ? "border-[#ff1e8e]" : "border-[#00f5ff]"
                }`}
              />
            ))}
          </div>
          <div className="text-sm font-bold text-[#f7f7fc] truncate">
            {girls.map((g) => g.name.split(" ")[0]).join(" × ")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStarted(false)}
          className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-[#a6a6c4] hover:border-[#00f5ff]"
        >
          Swap Pair
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
        {messages.map((m, i) => {
          const isSecond = m.slot === 1;
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "neon-btn-primary text-white"
                    : isSecond
                      ? "bg-[#0c0c16] border border-[#00f5ff]/45 text-[#f7f7fc]"
                      : "bg-[#0c0c16] border border-[#ff1e8e]/45 text-[#f7f7fc]"
                }`}
              >
                {m.name && (
                  <div
                    className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
                      isSecond ? "text-[#00f5ff]" : "text-[#ff1e8e]"
                    }`}
                  >
                    {m.name}
                  </div>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        {typingSpeaker && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs animate-pulse ${
              typingSpeaker.slot === 1
                ? "border-[#00f5ff]/40 bg-[#00f5ff]/10 text-[#00f5ff]"
                : "border-[#ff1e8e]/40 bg-[#ff1e8e]/10 text-[#ff1e8e]"
            }`}
          >
            <Sparkles className="h-3 w-3" /> {typingSpeaker.name} is replying...
          </div>
        )}
      </div>

      {errorMsg && <p className="text-xs text-rose-400 pb-1">{errorMsg}</p>}

      <div className="flex gap-2 pt-2 border-t border-white/10 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Say something to spark the banter..."
          className="flex-1 rounded-2xl bg-[#0c0c16] border border-white/15 px-4 py-3 text-sm text-white outline-none focus:border-[#00f5ff]"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={Boolean(typingSpeaker) || !input.trim()}
          className="px-5 rounded-2xl neon-btn-primary font-bold text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
