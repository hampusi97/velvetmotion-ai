"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fallbackReply, type Character } from "@/lib/characters";
import { speak } from "@/lib/speech";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CharacterChatProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
}

export function CharacterChat({ character, romanceMode, onBack }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: character.initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: character.initialMessage }]);
    setInput("");
  }, [character.id, character.initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
          messages: nextMessages,
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

  return (
    <div className="flex flex-col min-h-[80vh]">
      <p className="mb-3 text-xs text-zinc-400">Demo chat uses local character replies. Live AI is not connected.</p>
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
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {character.name}, {character.age}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {character.voice.label}
            {romanceMode ? " · Romance" : ""}
          </div>
        </div>
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
            <p>{message.content}</p>
            {message.role === "assistant" && (
              <button
                onClick={() => speak(message.content, character.voice)}
                className="mt-2 text-[11px] text-pink-300"
              >
                Speak
              </button>
            )}
          </div>
        ))}
        {isLoading && <p className="text-xs text-zinc-500">She’s writing…</p>}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
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
    </div>
  );
}
