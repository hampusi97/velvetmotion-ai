"use client";

import { useEffect, useRef, useState } from "react";
import { Mic2, Play, SlidersHorizontal, Square, Volume2 } from "lucide-react";
import {
  speakWithNeuralVoice,
  stopNeuralSpeech,
  type KokoroVoiceId,
} from "@/lib/kokoroTts";

export type VoiceDesign = {
  voiceId: KokoroVoiceId;
  pitch: number;
  rate: number;
};

export const DEFAULT_VOICE_DESIGN: VoiceDesign = {
  voiceId: "af_heart",
  pitch: 1.04,
  rate: 0.98,
};

const VOICES: Array<{
  id: KokoroVoiceId;
  title: string;
  description: string;
  accent: string;
}> = [
  { id: "af_heart", title: "Sofia", description: "Warm · natural · affectionate", accent: "US" },
  { id: "af_bella", title: "Bella", description: "Expressive · bright · playful", accent: "US" },
  { id: "af_nova", title: "Nova", description: "Relaxed · smooth · confident", accent: "US" },
  { id: "af_sarah", title: "Sarah", description: "Gentle · thoughtful · calm", accent: "US" },
  { id: "af_sky", title: "Skye", description: "Light · lively · energetic", accent: "US" },
  { id: "bf_emma", title: "Emma", description: "Soft · understated · intimate", accent: "UK" },
];

/**
 * Named voice personalities are original VelvetMotion preset labels, not
 * recordings of real women. Actual neural sound requires a compatible Kokoro
 * TTS server. Browser fallback uses device voices and varies by platform.
 */
export function VoiceDesigner({
  value,
  onChange,
  compact = false,
  sample = "Hey, it's lovely to meet you. Tell me what you feel like talking about tonight.",
}: {
  value: VoiceDesign;
  onChange: (next: VoiceDesign) => void;
  compact?: boolean;
  sample?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Select a voice, customize it, then preview.");
  const playingRef = useRef(false);

  useEffect(() => () => {
    if (playingRef.current) stopNeuralSpeech();
  }, []);

  const stop = () => {
    stopNeuralSpeech();
    playingRef.current = false;
    setBusy(false);
    setStatus("Preview stopped.");
  };

  const preview = async (neural: boolean) => {
    if (busy) return;
    setBusy(true);
    playingRef.current = true;
    setStatus(neural ? "Connecting to local neural speech..." : "Playing device voice preview...");
    try {
      const result = await speakWithNeuralVoice(sample, {
        voiceId: value.voiceId,
        pitch: value.pitch,
        rate: value.rate,
        engineOverride: neural ? "kokoro-82m" : "browser-speech",
      });
      if (playingRef.current) {
        setStatus(result.label === "Browser voice (fallback)" && neural
          ? "Kokoro unavailable. Played your device voice instead."
          : result.label);
      }
    } catch {
      if (playingRef.current) setStatus("Preview unavailable. Check audio permissions or local TTS.");
    } finally {
      playingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-[24px] border border-pink-300/15 bg-gradient-to-br from-[#1f1421] via-[#141118] to-[#0d0c12] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-300/10 text-pink-200">
          <Mic2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-display text-base font-bold text-white">Voice Atelier</h3>
          <p className="text-[11px] text-zinc-400">Give your fictional companion a distinctive voice.</p>
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            aria-pressed={value.voiceId === voice.id}
            onClick={() => onChange({ ...value, voiceId: voice.id })}
            className={`rounded-2xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200 ${value.voiceId === voice.id
              ? "border-[#eb9da9]/70 bg-[#9b425d]/25 shadow-[0_0_22px_rgba(249,168,212,.08)]"
              : "border-white/10 bg-black/20 hover:border-white/30"}`}
          >
            <span className="flex items-center justify-between text-xs font-semibold text-white">
              {voice.title}
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">{voice.accent}</span>
            </span>
            <span className="mt-1 block text-[10px] leading-relaxed text-zinc-400">{voice.description}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([
          { name: "Pitch", key: "pitch" as const, min: 0.8, max: 1.25 },
          { name: "Pace", key: "rate" as const, min: 0.8, max: 1.2 },
        ]).map((control) => (
          <label key={control.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="flex items-center justify-between text-xs font-semibold text-white">
              <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5 text-pink-200" />{control.name}</span>
              <span className="font-mono text-pink-200">{value[control.key].toFixed(2)}×</span>
            </span>
            <input
              aria-label={control.name}
              type="range"
              min={control.min}
              max={control.max}
              step={0.01}
              value={value[control.key]}
              onChange={(e) => onChange({ ...value, [control.key]: Number(e.target.value) })}
              className="mt-3 w-full accent-[#d88da3]"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void preview(false)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ad4969] to-[#dc789c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          <Play className="h-3.5 w-3.5" /> Instant preview
        </button>
        <button type="button" disabled={busy} onClick={() => void preview(true)}
          className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-white/5 px-4 py-2 text-xs font-semibold text-pink-100 disabled:opacity-50">
          <Volume2 className="h-3.5 w-3.5" /> Neural preview
        </button>
        {busy && <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs text-white">
          <Square className="h-3.5 w-3.5" /> Stop
        </button>}
      </div>
      <p role="status" aria-live="polite" className="text-[11px] text-zinc-400">{status}</p>
      <p className="text-[10px] leading-relaxed text-zinc-500">
        Instant preview uses available device voices. Neural preview needs a running Kokoro-compatible service.
        Voice sliders affect browser playback; neural voice tone also depends on the configured model.
        This is preset customization, not cloning a real person's voice.
      </p>
    </section>
  );
}
