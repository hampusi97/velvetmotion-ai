"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/charactersTypes";
import { speak, stopSpeaking } from "@/lib/speech";
import { characterMediaUrl } from "@/lib/media";
import { fallbackReply } from "@/lib/characters";
import { pushShort, memoryPromptBlock } from "@/lib/memoryTiers";
import { bumpIntimacy, getIntimacy } from "@/lib/storage";

type Props = {
  character: Character;
  onClose: () => void;
};

export function VoiceCallUI({ character, onClose }: Props) {
  const [live, setLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState("Tap Start call");
  const recogRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopSpeaking();
      try {
        recogRef.current?.stop();
      } catch {
        /* */
      }
    };
  }, []);

  const append = (line: string) => setLog((L) => [...L.slice(-12), line]);

  const replyTo = async (userText: string) => {
    pushShort(character.id, "user", userText);
    append(`You: ${userText}`);
    setStatus("She is thinking…");
    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: [
            { role: "user", content: userText },
          ],
          romanceMode: false,
          intimacy: getIntimacy(character.id, character.intimacy),
          memoryBlock: memoryPromptBlock(character.id),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || "";
      }
    } catch {
      /* */
    }
    if (!reply) reply = fallbackReply(character, userText, false);
    // Keep voice replies short
    reply = reply.replace(/\*[^]*?\*/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    pushShort(character.id, "assistant", reply);
    bumpIntimacy(character.id, 2);
    append(`${character.name.split(" ")[0]}: ${reply}`);
    setSpeaking(true);
    setStatus("She is speaking…");
    speak(
      reply,
      { ...character.voice },
      {
        onEnd: () => {
          setSpeaking(false);
          if (activeRef.current) startListen();
          else setStatus("Call ended");
        },
      },
    );
  };

  const startListen = () => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
            .webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setStatus("Speech recognition not supported in this browser — use Chrome/Edge.");
      return;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* */
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onstart = () => {
      setListening(true);
      setStatus("Listening… speak now");
    };
    recog.onend = () => {
      setListening(false);
    };
    recog.onerror = () => {
      setListening(false);
      if (activeRef.current) setStatus("Didn't catch that — tap mic or speak again");
    };
    recog.onresult = (ev: SpeechRecognitionEvent) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) void replyTo(text);
    };
    recogRef.current = recog;
    try {
      recog.start();
    } catch {
      setStatus("Mic busy — try again");
    }
  };

  const startCall = () => {
    activeRef.current = true;
    setLive(true);
    setLog([]);
    const hi =
      character.voiceIntro ||
      `Hey, it's ${character.name.split(" ")[0]}. I'm on the line. Talk to me.`;
    append(`${character.name.split(" ")[0]}: ${hi}`);
    setSpeaking(true);
    setStatus("Connecting…");
    speak(
      hi,
      { ...character.voice },
      {
        onEnd: () => {
          setSpeaking(false);
          if (activeRef.current) startListen();
        },
      },
    );
  };

  const endCall = () => {
    activeRef.current = false;
    setLive(false);
    setListening(false);
    setSpeaking(false);
    stopSpeaking();
    try {
      recogRef.current?.stop();
    } catch {
      /* */
    }
    setStatus("Call ended");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div
              className={`h-28 w-28 rounded-full overflow-hidden border-2 ${
                speaking ? "border-pink-400 animate-pulse" : listening ? "border-emerald-400" : "border-white/20"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterMediaUrl(character, "beauty")}
                alt={character.name}
                className="h-full w-full object-cover"
              />
            </div>
            {live && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600">
                {speaking ? "Speaking" : listening ? "Listening" : "…"}
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-lg text-cream">{character.name}</div>
            <div className="text-xs text-zinc-400">{status}</div>
          </div>

          <div className="w-full max-h-28 overflow-y-auto text-left space-y-1 text-xs text-zinc-400 px-1">
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {!live ? (
              <button
                type="button"
                onClick={startCall}
                className="flex-1 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 font-semibold"
              >
                Start call
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={speaking}
                  onClick={() => startListen()}
                  className="flex-1 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 py-3 text-sm font-medium disabled:opacity-40"
                >
                  🎤 Talk
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="flex-1 rounded-2xl bg-red-600/90 py-3 text-sm font-semibold"
                >
                  End
                </button>
              </>
            )}
          </div>
          {!live && (
            <button type="button" onClick={onClose} className="text-xs text-zinc-500">
              Close
            </button>
          )}
          <p className="text-[10px] text-zinc-600">
            Browser voice only (Web Speech). Chrome/Edge recommended. Not true WebRTC video.
          </p>
        </div>
      </div>
    </div>
  );
}

// Minimal types for browsers that expose webkit prefix
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}
