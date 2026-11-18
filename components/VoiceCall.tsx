"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import type { Character } from "@/lib/characters";
import { speak } from "@/lib/speech";
import { characterMediaUrl } from "@/lib/media";
import { fallbackReply } from "@/lib/characters";

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Browser-based voice call — Web Speech TTS + SpeechRecognition. No server required. */
export function VoiceCall({
  character,
  onEnd,
}: {
  character: Character;
  onEnd: () => void;
}) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastReply, setLastReply] = useState("");
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startCall = () => {
    setActive(true);
    const intro = character.voiceIntro || `Hey… it's ${character.name}. I'm here.`;
    setLastReply(intro);
    speak(intro, { ...character.voice });
  };

  const endCall = () => {
    setActive(false);
    setListening(false);
    try {
      recogRef.current?.stop();
    } catch {}
    window.speechSynthesis?.cancel();
    onEnd();
  };

  const toggleListen = () => {
    const SR =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              SpeechRecognition?: SpeechRecognitionCtor;
              webkitSpeechRecognition?: SpeechRecognitionCtor;
            }
          ).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setTranscript("Speech recognition not supported in this browser. Type instead or use Chrome.");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onresult = (ev: SpeechRecognitionResultEventLike) => {
      const text = ev.results[0]?.[0]?.transcript || "";
      setTranscript(text);
      if (text) {
        const reply = fallbackReply(character, text, false);
        setLastReply(reply);
        speak(reply.slice(0, 220), { ...character.voice });
      }
      setListening(false);
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={startCall}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/25"
      >
        <Phone className="h-4 w-4" /> Voice call
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 p-6">
      <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-pink-500/50 shadow-[0_0_60px_rgba(236,72,153,0.4)] mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={characterMediaUrl(character, "beauty")} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="text-xl font-semibold text-cream">{character.name}</div>
      <div className="text-sm text-pink-300 mt-1">On call · browser voice</div>
      {lastReply && (
        <p className="mt-4 max-w-sm text-center text-sm text-zinc-300 leading-relaxed">{lastReply}</p>
      )}
      {transcript && <p className="mt-2 text-xs text-zinc-500">You: {transcript}</p>}
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={toggleListen}
          className={`h-14 w-14 rounded-full flex items-center justify-center border ${
            listening ? "bg-pink-600 border-pink-400" : "bg-zinc-800 border-white/20"
          }`}
        >
          {listening ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6 text-zinc-400" />}
        </button>
        <button
          type="button"
          onClick={endCall}
          className="h-14 w-14 rounded-full flex items-center justify-center bg-rose-600 border border-rose-400"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-4 text-[11px] text-zinc-500 text-center max-w-xs">
        Hold mic to speak (Chrome recommended). She replies with browser TTS. Full video calls need WebRTC — coming next.
      </p>
    </div>
  );
}
