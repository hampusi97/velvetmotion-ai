"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Timer, Activity, HeartPulse, Eye, EyeOff } from "lucide-react";
import { CHARACTERS } from "@/lib/characters";
import { getIntimacy } from "@/lib/storage";
import { characterMediaUrl } from "@/lib/media";
import { speak, startVoiceCountdown, stopSpeaking } from "@/lib/speech";
import {
  startIntimacyAudio,
  stopIntimacyAudio,
  startJoiBeat,
  stopJoiBeat,
} from "@/lib/audioEngine";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

const REVEAL_AT = 55;

function buildScript(name: string, kink: string, mode: "joi" | "sph"): string[] {
  if (mode === "sph") {
    return [
      `${name} laughs softly: Blindfold stays on. You don't get to look yet — and maybe you wouldn't want to.`,
      `Listen carefully. Stroke slow. Feel how small you are for me.`,
      `Don't rush. Edge when I say. Stop the second I tell you.`,
      `Breathe. In… out. You're doing exactly what I want.`,
      `Still no peeking. Earn the privilege of seeing me laugh at you.`,
      `Almost. Hold it. Right on the edge for me.`,
      `If your intimacy is high enough I'll let the blindfold slip. Until then — only my voice and my judgment.`,
      `When you're ready to finish, start the countdown or beg properly in chat.`,
    ];
  }
  return [
    `${name} whispers: Eyes closed. Blindfold on. You don't get to look yet.`,
    `Listen only. Hands slow. Feel the heat build — ${kink}.`,
    `Don't rush. Edge when I say edge. Stop when I say stop.`,
    `Breathe with me. In… and out. You're doing so well.`,
    `Closer. Still no peeking. Earn the image.`,
    `Almost. Hold it. Hold… right on the brink.`,
    `If intimacy is high enough, I'll let you see every inch of me. Until then — only my voice.`,
    `Good. When you're ready to finish, start the countdown or ask me properly in chat.`,
  ];
}

export function BlindfoldJoi({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [girlId, setGirlId] = useState(CHARACTERS[0].id);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [beatActive, setBeatActive] = useState(false);
  const [ambienceActive, setAmbienceActive] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [mode, setMode] = useState<"joi" | "sph">("joi");
  const [showPicker, setShowPicker] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const girl = CHARACTERS.find((c) => c.id === girlId) || CHARACTERS[0];
  const intimacy = getIntimacy(girl.id, girl.intimacy);
  const revealed = intimacy >= REVEAL_AT;
  const script = buildScript(girl.name.split(" ")[0], girl.kink, mode);
  const line = script[Math.min(step, script.length - 1)];

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopJoiBeat();
      stopIntimacyAudio();
    };
  }, []);

  const speakLine = () => {
    speak(line, { ...girl.voice, whispery: true });
  };

  const next = () => {
    const nextIdx = Math.min(script.length - 1, step + 1);
    setStep(nextIdx);
    setTimeout(() => speak(script[nextIdx], { ...girl.voice, whispery: true }), 80);
  };

  const toggleBeat = () => {
    if (beatActive) {
      stopJoiBeat();
      setBeatActive(false);
    } else {
      startJoiBeat(105);
      setBeatActive(true);
    }
  };

  const toggleAmbience = () => {
    if (ambienceActive) {
      stopIntimacyAudio();
      setAmbienceActive(false);
    } else {
      startIntimacyAudio(78);
      setAmbienceActive(true);
    }
  };

  const triggerCountdown = () => {
    setCountdownLeft(10);
    startVoiceCountdown(10, {
      voice: girl.voice,
      finishPhrase: `${girl.name.split(" ")[0]} whispers: Cum for me right now. Let go.`,
      onTick: (r) => setCountdownLeft(r),
      onComplete: () => setCountdownLeft(null),
    });
  };

  const sequenceFrames = revealed
    ? [
        characterMediaUrl(girl, "lingerie", "blindfold tease"),
        characterMediaUrl(girl, "nude", "revealing"),
        characterMediaUrl(girl, "explicit", "close"),
        characterMediaUrl(girl, "sex", "intense joi"),
      ]
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Blindfold JOI Studio</h1>
      <p className="text-sm text-mist">
        Whispery voice + stroke beats + optional SPH mode. Reveal at intimacy ≥ {REVEAL_AT}%.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("joi");
            setStep(0);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${
            mode === "joi" ? "bg-pink-600 text-white" : "border border-white/15 text-zinc-300"
          }`}
        >
          Classic JOI
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sph");
            setStep(0);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${
            mode === "sph" ? "bg-rose-600 text-white" : "border border-white/15 text-zinc-300"
          }`}
        >
          SPH / Tease
        </button>
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="ml-auto px-3 py-2 rounded-xl border border-white/15 text-xs text-zinc-300"
        >
          {showPicker ? "Hide girls" : "Choose girl"}
        </button>
      </div>

      {/* Visual girl picker */}
      {showPicker && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 p-2 bg-zinc-950/60">
          {CHARACTERS.slice(0, 24).map((c) => {
            const int = getIntimacy(c.id, c.intimacy);
            const selected = c.id === girlId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setGirlId(c.id);
                  setStep(0);
                  setRunning(false);
                  setSecs(0);
                  setShowPicker(false);
                }}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition ${
                  selected ? "border-pink-500 shadow-lg shadow-pink-500/30" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(c, "beauty")}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                  <div className="text-[10px] font-medium text-white truncate">{c.name.split(" ")[0]}</div>
                  <div className="text-[9px] text-pink-300">{int}%</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main stage */}
      <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden border border-pink-500/30 bg-black">
        {revealed && sequenceFrames ? (
          <MotionSequencePlayer frames={sequenceFrames} alt={girl.name} />
        ) : revealed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={characterMediaUrl(girl, intimacy >= 75 ? "nude" : "lingerie")}
            alt={girl.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <EyeOff className="h-12 w-12 text-zinc-600" />
            <p className="text-sm text-zinc-400 px-6 text-center">
              Blindfold on. Chat with her until intimacy hits {REVEAL_AT}% to reveal the sequence.
            </p>
            <p className="text-pink-300 text-xs">Current: {intimacy}%</p>
            <button
              type="button"
              onClick={() => onChat(girl.id)}
              className="mt-2 px-4 py-2 rounded-xl bg-pink-600 text-sm font-medium"
            >
              Raise intimacy in chat
            </button>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-pink-200">
          {revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {girl.name.split(" ")[0]} · {mode.toUpperCase()}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 space-y-3">
        <p className="text-sm leading-relaxed text-zinc-100">{line}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={speakLine}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600 text-sm font-medium"
          >
            <Volume2 className="h-4 w-4" /> Whisper
          </button>
          <button type="button" onClick={next} className="px-3 py-2 rounded-xl border border-white/15 text-sm">
            Next line
          </button>
          <button
            type="button"
            onClick={toggleBeat}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs ${
              beatActive ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-white/15 text-zinc-300"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> {beatActive ? "Beat ON" : "Stroke Beat"}
          </button>
          <button
            type="button"
            onClick={toggleAmbience}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs ${
              ambienceActive ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200" : "border-white/15 text-zinc-300"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" /> {ambienceActive ? "Breath ON" : "Breath Layer"}
          </button>
          <button
            type="button"
            onClick={triggerCountdown}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600/80 text-white text-xs font-medium"
          >
            <Timer className="h-3.5 w-3.5" />
            {countdownLeft !== null ? `${countdownLeft}s…` : "10s Finish"}
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-xl border border-white/15 text-xs"
          >
            {running ? "Pause" : "Timer"} {running ? `${secs}s` : ""}
          </button>
          <button
            type="button"
            onClick={() => onChat(girl.id)}
            className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-200"
          >
            Open chat
          </button>
        </div>
      </div>
    </div>
  );
}
