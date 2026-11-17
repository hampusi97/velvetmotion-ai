"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fallbackReply, type Character } from "@/lib/characters";
import { speak } from "@/lib/speech";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: string;
}

interface CharacterChatProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
}

const GEN_TYPES = [
  { id: "portrait", label: "Portrait" },
  { id: "lingerie", label: "Lingerie" },
  { id: "nude", label: "Nude" },
  { id: "explicit", label: "Explicit" },
  { id: "video", label: "Sex video" },
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
  const [genType, setGenType] = useState<(typeof GEN_TYPES)[number]["id"]>("nude");
  const [pose, setPose] = useState(POSES[0]);
  const [extra, setExtra] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [liveAi, setLiveAi] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: character.initialMessage }]);
    setInput("");
  }, [character.id, character.initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, genLoading]);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setLiveAi(Boolean(d.configured)))
      .catch(() => setLiveAi(false));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    let reply = fallbackReply(character, text, romanceMode);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          characterId: character.id,
          romanceMode,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reply?: string };
        if (typeof data.reply === "string" && data.reply.trim()) {
          reply = data.reply;
        }
      }
    } catch {
      // Local fallback already set.
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);
    setIsLoading(false);
    speak(reply, character.voice);
  };

  const generate = async () => {
    if (genLoading) return;
    setGenLoading(true);
    try {
      if (genType === "video") {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            pose,
            prompt: extra || undefined,
          }),
        });
        const data = await res.json();
        const url = data.videoUrl || data.imageUrl;
        if (url) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: data.fallback
                ? "Cinematic still (set AI_VIDEO_ENDPOINT for real motion). How do you want the next angle?"
                : "Here's the clip. Want it dirtier?",
              videoUrl: url,
              mediaType: "video",
            },
          ]);
        }
      } else {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            type: genType,
            pose,
            extra,
          }),
        });
        const data = await res.json();
        if (data.url) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: "How do I look? Want another pose?",
              imageUrl: data.url,
              mediaType: genType,
            },
          ]);
        }
      }
      setGenOpen(false);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Generation failed. Try again in a moment." },
      ]);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh]">
      <p className="mb-3 text-xs text-zinc-400">
        {liveAi === null
          ? "Checking AI…"
          : liveAi
            ? "Live AI connected."
            : "Local character replies (add XAI_API_KEY or AI_CHAT_API_KEY for live model)."}{" "}
        Generate nudes & video from the camera button.
      </p>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-pink-400 text-sm">
          ← Profile
        </button>
        <Image
          src={character.avatar}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="w-9 h-9 rounded-full object-cover bg-zinc-800"
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">
            {character.name}, {character.age}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {character.voice.label}
            {romanceMode ? " · Romance" : ""}
          </div>
        </div>
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
              message.role === "assistant"
                ? "bg-zinc-900 text-zinc-100"
                : "bg-pink-600 text-white ml-auto"
            }`}
          >
            {message.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.imageUrl}
                alt={message.mediaType || "generated"}
                className="rounded-xl mb-2 max-h-80 w-full object-cover"
              />
            )}
            {message.videoUrl && (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.videoUrl}
                  alt="video concept"
                  className="rounded-xl max-h-80 w-full object-cover"
                />
                <p className="text-[11px] text-pink-300 mt-1">Film · {message.mediaType || "video"}</p>
              </div>
            )}
            <p>{message.content}</p>
            {message.role === "assistant" && !message.imageUrl && !message.videoUrl && (
              <button
                onClick={() => speak(message.content, character.voice)}
                className="mt-2 text-[11px] text-pink-300"
              >
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
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="shrink-0 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-pink-400"
          aria-label="Generate media"
        >
          📷
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Message ${character.name.split(" ")[0]}`}
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:border-pink-500"
          aria-label={`Message ${character.name}`}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 rounded-xl bg-pink-600 text-sm font-medium disabled:opacity-40"
        >
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
            <div className="grid grid-cols-3 gap-2">
              {GEN_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setGenType(t.id)}
                  className={`px-2 py-2 rounded-xl text-sm border ${
                    genType === t.id
                      ? "border-pink-500 bg-pink-500/15 text-pink-200"
                      : "border-zinc-800 text-zinc-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Pose / scene</label>
              <select
                value={pose}
                onChange={(e) => setPose(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                {POSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Extra details</label>
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="candle light, red lingerie…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void generate()}
              className="w-full py-3 rounded-2xl bg-pink-600 font-medium disabled:opacity-50"
            >
              {genLoading ? "Generating…" : `Generate ${genType}`}
            </button>
            <p className="text-[11px] text-zinc-600 text-center">
              Images via Pollinations. Video uses AI_VIDEO_ENDPOINT if set, else cinematic still.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
