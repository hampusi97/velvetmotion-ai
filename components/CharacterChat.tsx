"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fallbackReply, CHARACTERS, type Character } from "@/lib/characters";
import { speak } from "@/lib/speech";
import {
  getCoins,
  spendCoins,
  addToGallery,
  GEN_COST,
  loadChat,
  saveChat,
  bumpIntimacy,
  getIntimacy,
} from "@/lib/storage";
import { GIFTS, getGiftsFor, addGift } from "@/lib/gifts";
import { characterPortraitUrl } from "@/lib/portraits";
import { syncChatSessionToFirestore } from "@/lib/firebase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  frames?: string[];
  mediaType?: string;
}

interface CharacterChatProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
}

const GEN_TYPES = [
  { id: "portrait", label: "Portrait", minInt: 0 },
  { id: "lingerie", label: "Lingerie", minInt: 20 },
  { id: "nude", label: "Nude", minInt: 40 },
  { id: "explicit", label: "Explicit", minInt: 60 },
  { id: "video", label: "Sex video", minInt: 50 },
] as const;

const POSES = [
  "looking at viewer, seductive expression",
  "lying on bed, inviting pose",
  "from behind, looking over shoulder",
  "in shower, wet skin, steam",
  "kneeling, upward gaze",
  "close-up face, parted lips",
  "standing mirror selfie",
  "straddling, intimate angle",
  "on all fours, arched back",
  "legs spread, explicit view",
];

export function CharacterChat({ character, romanceMode, onBack }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: character.initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [genType, setGenType] = useState<(typeof GEN_TYPES)[number]["id"]>("portrait");
  const [pose, setPose] = useState(POSES[0]);
  const [extra, setExtra] = useState("");
  const [dualId, setDualId] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [coins, setCoinsState] = useState(500);
  const [intimacy, setIntimacy] = useState(character.intimacy);
  const [giftIds, setGiftIds] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const avatarSrc =
    character.avatar.startsWith("http") || character.avatar.startsWith("data:")
      ? character.avatar
      : characterPortraitUrl(character.id, character.figure);

  useEffect(() => {
    const saved = loadChat(character.id);
    if (saved.length > 0) setMessages(saved);
    else setMessages([{ role: "assistant", content: character.initialMessage }]);
    setInput("");
    setIntimacy(getIntimacy(character.id, character.intimacy));
    setGiftIds(getGiftsFor(character.id));
  }, [character.id, character.initialMessage, character.intimacy]);

  useEffect(() => {
    if (messages.length > 0) {
      saveChat(character.id, messages);
      const last = messages[messages.length - 1]?.content || character.initialMessage;
      void syncChatSessionToFirestore({
        characterId: character.id,
        intimacy,
        gifts: giftIds,
        lastMessage: last,
      }).catch(() => {});
    }
  }, [messages, character.id, character.initialMessage, intimacy, giftIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, genLoading]);

  useEffect(() => {
    setCoinsState(getCoins());
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setAiMode(d.premium ? "premium" : "free"))
      .catch(() => setAiMode("free"));
  }, []);

  // She texts first when intimacy is high and chat is short
  useEffect(() => {
    if (intimacy < 70 || messages.length > 3) return;
    const t = setTimeout(() => {
      setMessages((m) => {
        if (m.length > 3) return m;
        if (m.some((x) => x.content.includes("reached out first"))) return m;
        return [
          ...m,
          {
            role: "assistant",
            content: `(She reached out first.) Missed you. Intimacy is ${intimacy}% — want a photo, or should I talk dirty?`,
          },
        ];
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [character.id, intimacy, messages.length]);

  const refreshCoins = () => setCoinsState(getCoins());

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    let reply = fallbackReply(character, text, romanceMode);
    const giftLines = giftIds
      .map((id) => GIFTS.find((g) => g.id === id)?.line)
      .filter(Boolean);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          characterId: character.id,
          romanceMode,
          gifts: giftLines,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reply?: string };
        if (typeof data.reply === "string" && data.reply.trim()) reply = data.reply;
      }
    } catch {
      /* fallback */
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);
    setIntimacy(bumpIntimacy(character.id, 2));
    setIsLoading(false);
    speak(reply, character.voice);
  };

  const generate = async () => {
    if (genLoading) return;
    const meta = GEN_TYPES.find((t) => t.id === genType);
    if (meta && intimacy < meta.minInt) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Undress ladder: need ${meta.minInt}% intimacy for ${meta.label} (you have ${intimacy}%). Chat more or send a gift.`,
        },
      ]);
      setGenOpen(false);
      return;
    }
    const cost = (GEN_COST[genType] ?? 15) + (dualId ? 15 : 0);
    if (!spendCoins(cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Not enough coins (${cost} needed). Top up in Gallery.` },
      ]);
      setGenOpen(false);
      refreshCoins();
      return;
    }
    refreshCoins();
    setGenLoading(true);
    const dual = dualId ? CHARACTERS.find((c) => c.id === dualId) : null;
    const dualExtra = dual
      ? `, two women together, ${character.name} and ${dual.name}, dual girl explicit scene`
      : "";
    try {
      if (genType === "video") {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            pose,
            prompt: (extra || "") + dualExtra || undefined,
          }),
        });
        const data = await res.json();
        const url = data.videoUrl || data.imageUrl;
        const frames: string[] | undefined = Array.isArray(data.frames) ? data.frames : undefined;
        if (url || frames?.length) {
          addToGallery({
            characterId: character.id,
            characterName: character.name,
            type: "video",
            url: url || frames![0],
            frames,
            prompt: data.promptUsed,
          });
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: dual
                ? `Two-girl sequence with ${dual.name.split(" ")[0]}. Want another angle?`
                : data.fallback
                  ? "4-frame sex sequence ready. Set AI_VIDEO_ENDPOINT for real MP4."
                  : "Here's the scene. Dirtier?",
              videoUrl: url,
              frames,
              mediaType: "video",
            },
          ]);
          setIntimacy(bumpIntimacy(character.id, 4));
        }
      } else {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            type: genType,
            pose,
            extra: (extra || "") + dualExtra,
          }),
        });
        const data = await res.json();
        if (data.url) {
          addToGallery({
            characterId: character.id,
            characterName: character.name,
            type: genType,
            url: data.url,
            prompt: data.prompt,
          });
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: dual ? `With ${dual.name.split(" ")[0]} — how do we look?` : "How do I look?",
              imageUrl: data.url,
              mediaType: genType,
            },
          ]);
          setIntimacy(bumpIntimacy(character.id, 3));
        }
      }
      setGenOpen(false);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Generation failed — wait ~30s (free tier rate limits)." },
      ]);
    } finally {
      setGenLoading(false);
      refreshCoins();
    }
  };

  const sendGift = (giftId: string) => {
    const g = GIFTS.find((x) => x.id === giftId);
    if (!g) return;
    if (!spendCoins(g.cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Need ${g.cost} coins to send ${g.name}. Top up in Gallery.` },
      ]);
      setGiftOpen(false);
      return;
    }
    const next = addGift(character.id, g.id);
    setGiftIds(next);
    refreshCoins();
    const nextIntimacy = bumpIntimacy(character.id, 5);
    setIntimacy(nextIntimacy);
    const replyLine = `She notices the ${g.name.toLowerCase()}. ${g.line} “Thank you… I'll remember that.”`;
    setMessages((m) => [
      ...m,
      { role: "user", content: `(Sent gift: ${g.name})` },
      {
        role: "assistant",
        content: replyLine,
      },
    ]);
    void syncChatSessionToFirestore({
      characterId: character.id,
      intimacy: nextIntimacy,
      gifts: next,
      lastMessage: replyLine,
    }).catch(() => {});
    setGiftOpen(false);
  };

  const costLabel = (GEN_COST[genType] ?? 15) + (dualId ? 15 : 0);

  return (
    <div className="flex flex-col min-h-[80vh]">
      <p className="mb-3 text-xs text-zinc-400">
        {aiMode === "premium" ? "Premium AI." : "Free AI."} Chat synced · intimacy {intimacy}% · {coins} coins
        {giftIds.length > 0 ? ` · gifts: ${giftIds.length}` : ""}
      </p>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-pink-400 text-sm">
          ← Profile
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt="" className="w-9 h-9 rounded-full object-cover bg-zinc-800" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">
            {character.name}, {character.age}
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-zinc-800 overflow-hidden max-w-[8rem]">
            <div className="h-full bg-gradient-to-r from-pink-600 to-fuchsia-500" style={{ width: `${intimacy}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGiftOpen(true)}
          className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-200 text-xs"
        >
          Gift
        </button>
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-medium"
        >
          Generate
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              message.role === "assistant" ? "bg-zinc-900 text-zinc-100" : "bg-pink-600 text-white ml-auto"
            }`}
          >
            {message.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={message.imageUrl} alt="" className="rounded-xl mb-2 max-h-80 w-full object-cover" />
            )}
            {message.frames && message.frames.length > 0 && (
              <div className="mb-2 grid grid-cols-2 gap-1">
                {message.frames.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="rounded-lg aspect-[3/4] object-cover" />
                ))}
              </div>
            )}
            <p>{message.content}</p>
            {message.role === "assistant" && !message.imageUrl && !message.frames?.length && (
              <button onClick={() => speak(message.content, character.voice)} className="mt-2 text-[11px] text-pink-300">
                Speak
              </button>
            )}
          </div>
        ))}
        {(isLoading || genLoading) && (
          <p className="text-xs text-zinc-500">{genLoading ? "Generating media…" : "She's writing…"}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <button type="button" onClick={() => setGenOpen(true)} className="shrink-0 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-pink-400">
          📷
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${character.name.split(" ")[0]}`}
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:border-pink-500"
        />
        <button type="submit" disabled={isLoading || !input.trim()} className="px-4 rounded-xl bg-pink-600 text-sm font-medium disabled:opacity-40">
          Send
        </button>
      </form>

      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGenOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Generate media</h3>
              <button type="button" onClick={() => setGenOpen(false)} className="text-zinc-400">
                ✕
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Undress ladder: Portrait 0% · Lingerie 20% · Nude 40% · Video 50% · Explicit 60% (you: {intimacy}%)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GEN_TYPES.map((t) => {
                const locked = intimacy < t.minInt;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => !locked && setGenType(t.id)}
                    className={`px-2 py-2 rounded-xl text-sm border ${
                      genType === t.id
                        ? "border-pink-500 bg-pink-500/15 text-pink-200"
                        : locked
                          ? "border-zinc-800 text-zinc-600"
                          : "border-zinc-800 text-zinc-300"
                    }`}
                  >
                    {t.label}
                    {locked ? " 🔒" : ""}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Dual-girl (optional)</label>
              <select
                value={dualId}
                onChange={(e) => setDualId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Solo</option>
                {CHARACTERS.filter((c) => c.id !== character.id).map((c) => (
                  <option key={c.id} value={c.id}>
                    + {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Pose</label>
              <select value={pose} onChange={(e) => setPose(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm">
                {POSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Extra: candle light, moaning…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Cost</span>
              <span className="text-amber-300">{costLabel} coins</span>
            </div>
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void generate()}
              className="w-full py-3 rounded-2xl bg-pink-600 font-medium disabled:opacity-50"
            >
              {genLoading ? "Generating…" : `Generate ${genType}`}
            </button>
          </div>
        </div>
      )}

      {giftOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGiftOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="font-semibold text-lg">Send a gift</h3>
            <p className="text-xs text-zinc-500">She remembers gifts in this browser. +intimacy.</p>
            {GIFTS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => sendGift(g.id)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm hover:border-pink-500/40"
              >
                <span>
                  {g.name}
                  {giftIds.includes(g.id) ? " ✓" : ""}
                </span>
                <span className="text-amber-300">{g.cost}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
