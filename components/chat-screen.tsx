"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChoiceButtons } from "@/components/choice-buttons";
import { Portrait } from "@/components/portrait";
import { useToast } from "@/components/providers";
import { ChatSkeleton } from "@/components/skeletons";
import { useSpeech } from "@/components/use-speech";
import { VoicePanel } from "@/components/voice-panel";
import { getCharacter } from "@/lib/characters";
import { generateReply, normalizeChoices } from "@/lib/dialogue.mjs";
import {
  loadAutoplay,
  loadChat,
  loadVoicePrefs,
  saveAutoplay,
  saveChat,
  saveVoicePrefs,
  type StoredMessage,
  type VoicePrefs,
} from "@/lib/storage";

export function ChatScreen({ characterId }: { characterId: string }) {
  const character = getCharacter(characterId);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const speech = useSpeech((message) => toastRef.current(message));
  const { supported, speak, stop } = speech;
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<VoicePrefs>({ voiceURI: "", pitch: 1, rate: 1 });
  const [autoplay, setAutoplay] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const mountedAt = useRef(Date.now());
  const seenRef = useRef(new Set<string>());
  const hydratedAutoplay = useRef(false);
  const autoplayWasOn = useRef(false);

  useEffect(() => {
    if (!character) return;
    const saved = loadChat(character.id);
    setMessages(saved.length ? saved : [createGreeting(character)]);
    setPrefs(loadVoicePrefs(character.id, character.voice));
    setAutoplay(loadAutoplay());
    setReady(true);
  }, [character]);

  useEffect(() => {
    if (!ready || !character) return;
    saveChat(character.id, messages);
  }, [ready, character, messages]);

  useEffect(() => {
    if (!ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [ready, messages, loading]);

  useEffect(() => {
    if (!ready || !character) return;
    const last = messages[messages.length - 1];
    if (!hydratedAutoplay.current) {
      hydratedAutoplay.current = true;
      autoplayWasOn.current = autoplay;
      if (last) seenRef.current.add(last.id);
      const fresh = last && Date.parse(last.createdAt) >= mountedAt.current - 1000;
      if (autoplay && supported && last?.role === "assistant" && fresh) {
        speak(last.id, last.content, { ...prefs, lang: character.voice.lang });
      }
      return;
    }
    const turnedOn = autoplay && !autoplayWasOn.current;
    autoplayWasOn.current = autoplay;
    if (!last || last.role !== "assistant" || !autoplay || !supported) return;
    if (seenRef.current.has(last.id) && !turnedOn) return;
    seenRef.current.add(last.id);
    speak(last.id, last.content, { ...prefs, lang: character.voice.lang });
  }, [autoplay, character, messages, prefs, ready, speak, supported]);

  useEffect(() => () => stop(), [stop]);

  if (!character) {
    return (
      <main id="content" className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl">That character isn&apos;t here</h1>
        <Link href="/" className="button-quiet mt-6 inline-flex">
          Back to characters
        </Link>
      </main>
    );
  }

  if (!ready) return <ChatSkeleton />;

  const last = messages[messages.length - 1];
  const choices = !loading && last?.role === "assistant" ? last.choices ?? [] : [];

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !character || loadingRef.current) return;
    loadingRef.current = true;
    stop();
    const userMessage: StoredMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    const payload = next.map((message) => ({ role: message.role, content: message.content }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id, messages: payload }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data = (await response.json()) as { reply?: unknown; choices?: unknown };
      const local = generateReply(character, payload);
      const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply : local.reply;
      appendAssistant(reply, normalizeChoices(data.choices, local.choices));
    } catch {
      const local = generateReply(character, payload);
      toast("The chat service missed a beat. This reply was written on your device.");
      appendAssistant(local.reply, local.choices);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function appendAssistant(content: string, replyChoices: string[]) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        choices: replyChoices,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updatePrefs(next: VoicePrefs) {
    if (!character) return;
    setPrefs(next);
    saveVoicePrefs(character.id, next);
  }

  function toggleAutoplay() {
    if (!speech.supported) {
      toast("This browser can't speak messages. You can still read them.");
      return;
    }
    const next = !autoplay;
    setAutoplay(next);
    saveAutoplay(next);
    toast(next ? "Auto-play is on for new messages." : "Auto-play is off.");
  }

  function resetChat() {
    if (!character) return;
    stop();
    setMessages([createGreeting(character)]);
    toast("Started a fresh conversation.");
  }

  function onSpeak(message: StoredMessage) {
    if (!character) return;
    if (!speech.supported) {
      toast("Voice playback isn't available in this browser.");
      return;
    }
    if (speech.activeId === message.id && speech.phase === "playing") {
      speech.pause();
      return;
    }
    if (speech.activeId === message.id && speech.phase === "paused") {
      speech.resume();
      return;
    }
    const result = speech.speak(message.id, message.content, { ...prefs, lang: character.voice.lang });
    if (result === "unavailable") toast("Voice playback isn't available in this browser.");
  }

  return (
    <main id="content" className="mx-auto flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden">
      <header className="z-20 shrink-0 border-b border-white/10 bg-ink px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="button-quiet px-3 py-2 text-sm">
            All characters
          </Link>
          <Portrait id={character.id} name={character.name} palette={character.palette} className="h-14 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl text-rose-50">{character.name}</h1>
            <p className="truncate text-xs text-rose-100/70">
              Age {character.age} · {character.pronouns} · {character.role}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {speech.phase !== "idle" && (
            <button type="button" className="button-quiet px-3 py-2 text-sm" onClick={speech.phase === "paused" ? speech.resume : speech.pause}>
              {speech.phase === "paused" ? "Resume voice" : "Pause voice"}
            </button>
          )}
          <button type="button" className="button-quiet px-3 py-2 text-sm" role="switch" aria-checked={autoplay} onClick={toggleAutoplay}>
            Auto-play {autoplay ? "on" : "off"}
          </button>
          <button type="button" className="button-quiet px-3 py-2 text-sm" onClick={() => setVoiceOpen(true)}>
            Voice
          </button>
          <button type="button" className="button-quiet px-3 py-2 text-sm" onClick={resetChat}>
            New chat
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6" role="log" aria-label={`Conversation with ${character.name}`} aria-busy={loading}>
        {messages.map((message) => {
          const speaking = speech.activeId === message.id && speech.phase === "playing";
          const paused = speech.activeId === message.id && speech.phase === "paused";
          const label = !speech.supported ? "Play" : speaking ? "Pause" : paused ? "Resume" : "Play";
          return (
            <article key={message.id} className={`message-in flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={message.role === "user" ? "bubble-user" : "bubble-assistant"}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    className="speak-button"
                    aria-label={`${label} message from ${character.name}`}
                    aria-pressed={speaking || paused}
                    disabled={!speech.supported}
                    onClick={() => onSpeak(message)}
                  >
                    {speech.supported ? label : "Voice unavailable"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {loading && (
          <div className="bubble-assistant inline-flex items-center gap-2" role="status">
            <span className="sr-only">{character.name} is writing</span>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        {!speech.supported && (
          <p className="mb-3 text-sm text-rose-100/70" role="status">
            This browser can&apos;t speak messages. Reading still works, and you can type your own reply.
          </p>
        )}
        {choices.length > 0 && <ChoiceButtons key={choices.join("|")} choices={choices} disabled={loading} onChoose={send} />}
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message to {character.name}
          </label>
          <textarea
            id="chat-input"
            className="field min-h-12 flex-1 resize-none"
            rows={2}
            maxLength={2000}
            value={input}
            placeholder={`Message ${character.name}`}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <button type="submit" className="button-primary px-5" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <VoicePanel
        open={voiceOpen}
        name={character.name}
        hint={character.voice.hint}
        supported={speech.supported}
        voices={speech.voices}
        prefs={prefs}
        onChange={updatePrefs}
        onPreview={() => {
          if (!character) return;
          const result = speech.speak(`preview-${character.id}`, `This is ${character.name}. ${character.voice.hint}.`, {
            ...prefs,
            lang: character.voice.lang,
          });
          if (result === "unavailable") toast("Voice playback isn't available in this browser.");
        }}
        onClose={() => setVoiceOpen(false)}
      />
    </main>
  );
}

function createGreeting(character: NonNullable<ReturnType<typeof getCharacter>>): StoredMessage {
  return {
    id: `greet-${character.id}-${Date.now()}`,
    role: "assistant",
    content: character.greeting,
    choices: [...character.starters],
    createdAt: new Date().toISOString(),
  };
}
