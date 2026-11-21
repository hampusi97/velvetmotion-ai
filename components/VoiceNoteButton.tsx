"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  cleanSpeechText,
  generateLocalNeuralVoiceSample,
  normalizeFemaleKokoroVoice,
  speakWithNeuralVoice,
} from "@/lib/kokoroTts";

export default function VoiceNoteButton({
  text,
  voiceId,
  disabled,
}: {
  text?: string;
  voiceId?: string;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
    setSupported(hasSpeech);
  }, []);

  const clean = cleanSpeechText(text || "");
  const isDisabled = Boolean(disabled || busy || !supported || !clean);

  const playVoiceNote = async () => {
    if (isDisabled) return;
    setBusy(true);
    try {
      const normalized = normalizeFemaleKokoroVoice(voiceId);
      try {
        const blob = await generateLocalNeuralVoiceSample(clean, normalized);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          void audio.play().catch(() => resolve());
        });
        return;
      } catch {
        await speakWithNeuralVoice(clean, { voiceId: normalized });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => void playVoiceNote()}
      title={
        !supported
          ? "Voice synthesis is unavailable on this browser"
          : !clean
            ? "No assistant reply to play yet"
            : "Play her last reply as a voice note"
      }
      aria-label="Play voice note"
      className="shrink-0 inline-flex items-center gap-1 rounded-2xl border border-white/15 bg-[#0c0c16] px-3 py-2 text-xs font-bold text-pink-200 hover:border-[#ff1e8e] disabled:opacity-40"
    >
      <Volume2 className="h-4 w-4" />
      <span className="hidden sm:inline">{busy ? "Speaking…" : "Voice Note"}</span>
    </button>
  );
}
