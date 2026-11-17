"use client";

import { useEffect, useRef, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { getIntimacy } from "@/lib/storage";
import { characterPortraitUrl } from "@/lib/portraits";
import { speak } from "@/lib/speech";

const REVEAL_AT = 55;

function buildScript(name: string, kink: string): string[] {
  return [
    `${name} whispers: Eyes closed. Blindfold on. You don't get to look yet.`,
    `Listen only. Hands slow. Feel the heat build — ${kink}.`,
    `Don't rush. Edge when I say edge. Stop when I say stop.`,
    `Breathe with me. In… and out. You're doing so well.`,
    `Closer. Still no peeking. Earn the image.`,
    `Almost. Hold it. Hold…`,
    `If intimacy is high enough, I'll let you see me. Until then — only my voice.`,
    `Good. When you're ready to finish, ask me properly in chat.`,
  ];
}

export function BlindfoldJoi({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [girlId, setGirlId] = useState(CHARACTERS[0].id);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const girl = CHARACTERS.find((c) => c.id === girlId) || CHARACTERS[0];
  const intimacy = getIntimacy(girl.id, girl.intimacy);
  const revealed = intimacy >= REVEAL_AT;
  const script = buildScript(girl.name.split(" ")[0], girl.kink);
  const line = script[Math.min(step, script.length - 1)];

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const speakLine = () => {
    speak(line, girl.voice);
  };

  const next = () => {
    setStep((s) => Math.min(script.length - 1, s + 1));
    setTimeout(() => speak(script[Math.min(step + 1, script.length - 1)], girl.voice), 100);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">Blindfold mode</h1>
      <p className="text-sm text-mist">Audio-only JOI until intimacy ≥ {REVEAL_AT}%. Then the image unlocks.</p>

      <select
        value={girlId}
        onChange={(e) => {
          setGirlId(e.target.value);
          setStep(0);
          setRunning(false);
          setSecs(0);
        }}
        className="w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm"
      >
        {CHARACTERS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · intimacy {getIntimacy(c.id, c.intimacy)}%
          </option>
        ))}
      </select>

      <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-3xl overflow-hidden border border-white/10 bg-black">
        {revealed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={characterPortraitUrl(girl.id, girl.figure, "lingerie")}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <span className="text-5xl">🖤</span>
            <p className="text-sm text-zinc-400 px-6 text-center">
              Blindfold on. Chat with her until intimacy hits {REVEAL_AT}% to reveal.
            </p>
            <p className="text-pink-300 text-xs">Current: {intimacy}%</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="text-sm leading-relaxed text-zinc-100">{line}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={speakLine} className="px-3 py-2 rounded-xl bg-pink-600 text-sm">
            Speak
          </button>
          <button type="button" onClick={next} className="px-3 py-2 rounded-xl border border-white/15 text-sm">
            Next line
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-xl border border-white/15 text-sm"
          >
            {running ? "Pause timer" : "Start timer"} {running ? `${secs}s` : ""}
          </button>
          <button type="button" onClick={() => onChat(girl.id)} className="px-3 py-2 rounded-xl border border-pink-500/40 text-sm text-pink-200">
            Open chat
          </button>
        </div>
      </div>
    </div>
  );
}
