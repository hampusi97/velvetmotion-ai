"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Timer, Activity, HeartPulse, Eye, EyeOff, Sparkles } from "lucide-react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { getIntimacy } from "@/lib/storage";
import { characterMediaUrl } from "@/lib/media";
import { startVoiceCountdown, stopSpeaking } from "@/lib/speech";
import { runGenerativePrompt } from "@/lib/chatRouter";
import { getPreferredVoiceEngine, speakWithNeuralVoice, stopNeuralSpeech } from "@/lib/kokoroTts";
import { VOICE_ENGINE_OPTIONS } from "@/data/localModelCatalog";
import { loadCategorizedMemories } from "@/components/MemoryVaultDrawer";
import { SafeImage } from "@/components/SafeImage";
import {
  PACE_PHASES,
  generateNextPaceLine,
  pickFallbackPaceLine,
  type PaceSessionState,
  type PaceStyle,
  type UserPaceSignal,
} from "@/lib/generativePaceEngine";
import {
  startIntimacyAudio,
  stopIntimacyAudio,
  startJoiBeat,
  stopJoiBeat,
} from "@/lib/audioEngine";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

const REVEAL_AT = 55;

const VOICE_STYLE_OPTIONS: Array<{ id: PaceStyle; label: string }> = [
  { id: "playful-tease", label: "Playful Tease" },
  { id: "confident-boss", label: "Confident Boss" },
  { id: "midnight-whisper", label: "Midnight Whisper" },
];

const REACTION_CONTROLS: Array<{ signal: UserPaceSignal; label: string; tone: string }> = [
  { signal: "faster", label: "🔥 Faster", tone: "border-[#ff1e8e]/50 bg-[#ff1e8e]/15 text-pink-200 hover:bg-[#ff1e8e]/25" },
  { signal: "slower", label: "❄️ Slower", tone: "border-[#00f5ff]/50 bg-[#00f5ff]/15 text-[#00f5ff] hover:bg-[#00f5ff]/25" },
  { signal: "freeze", label: "✋ Freeze / Hold", tone: "border-[#ff4dff]/50 bg-[#ff4dff]/15 text-fuchsia-200 hover:bg-[#ff4dff]/25" },
  { signal: "surprise", label: "🎲 Surprise", tone: "border-[#00ffa3]/50 bg-[#00ffa3]/15 text-[#00ffa3] hover:bg-[#00ffa3]/25" },
];

function extractUserNameFromVault(girlId: string): string | undefined {
  const vault = loadCategorizedMemories(girlId);
  const hit = vault.find((m) => /^name is /i.test(m.text.trim()));
  return hit ? hit.text.replace(/^name is /i, "").trim() : undefined;
}

function createInitialPaceState(girl: Character, style: PaceStyle): PaceSessionState {
  const first = girl.name.split(" ")[0] || girl.name;
  return {
    companionName: first,
    personality: `${girl.personality}. Kink focus: ${girl.kink}`,
    userName: extractUserNameFromVault(girl.id),
    phase: "warmup",
    style,
    bpm: PACE_PHASES.warmup.defaultBpm,
    turnCount: 0,
    recentLines: [],
  };
}

export function BlindfoldJoi({ onHome, onChat }: { onHome: () => void; onChat: (id: string) => void }) {
  const [girlId, setGirlId] = useState(CHARACTERS[0].id);
  const [mode, setMode] = useState<"joi" | "sph" | "bnwo">("joi");
  const [style, setStyle] = useState<PaceStyle>("playful-tease");
  const [paceState, setPaceState] = useState<PaceSessionState>(() =>
    createInitialPaceState(CHARACTERS[0], "playful-tease"),
  );
  const [line, setLine] = useState<string>(() => pickFallbackPaceLine("warmup", []));
  const [loadingCue, setLoadingCue] = useState(false);

  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [beatActive, setBeatActive] = useState(false);
  const [ambienceActive, setAmbienceActive] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const [voiceEngineLabel, setVoiceEngineLabel] = useState<string>("Kokoro-82M");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefetchRef = useRef<{
    stateKey: string;
    promise: Promise<{ nextState: PaceSessionState; line: string }>;
  } | null>(null);

  const girl = CHARACTERS.find((c) => c.id === girlId) || CHARACTERS[0];
  const intimacy = getIntimacy(girl.id, girl.intimacy);
  const revealed = intimacy >= REVEAL_AT;
  const phaseCfg = PACE_PHASES[paceState.phase];

  const syncBeatToBpm = useCallback((bpm: number, ensureActive: boolean) => {
    if (bpm <= 0) {
      stopJoiBeat();
      setBeatActive(false);
      return;
    }
    if (ensureActive) {
      startJoiBeat(bpm);
      setBeatActive(true);
    }
  }, []);

  const callLlm = useCallback(
    async (system: string, user: string) => {
      const modeHint =
        mode === "sph"
          ? "Playful SPH tease energy."
          : mode === "bnwo"
            ? "Commanding confident supremacy tease."
            : "Classic sensual JOI rhythm coaching.";
      return runGenerativePrompt(`${system}\nMode: ${modeHint}`, user, girl.name);
    },
    [girl.name, mode],
  );

  const queuePrefetch = useCallback(
    (baseState: PaceSessionState) => {
      const stateKey = `${baseState.companionName}|${baseState.style}|${baseState.turnCount}|${baseState.phase}`;
      const promise = generateNextPaceLine({
        state: baseState,
        signal: "continue",
        callLlm,
      });
      prefetchRef.current = { stateKey, promise };
    },
    [callLlm],
  );

  const speakCue = useCallback(
    async (cueText: string, activeStyle: PaceStyle, activePhase: keyof typeof PACE_PHASES) => {
      await speakWithNeuralVoice(cueText, {
        voiceId: girl.voiceId,
        whispery: activeStyle === "midnight-whisper" || activePhase === "warmup" || activePhase === "tease_hold",
        pitch: girl.voice?.pitch,
        rate: girl.voice?.rate,
      });
    },
    [girl.voice?.pitch, girl.voice?.rate, girl.voiceId],
  );

  useEffect(() => {
    const pref = getPreferredVoiceEngine();
    setVoiceEngineLabel(VOICE_ENGINE_OPTIONS.find((v) => v.id === pref)?.label || pref);
    const onVoiceChanged = () => {
      const nextPref = getPreferredVoiceEngine();
      setVoiceEngineLabel(VOICE_ENGINE_OPTIONS.find((v) => v.id === nextPref)?.label || nextPref);
    };
    window.addEventListener("vm:voice-engine-changed", onVoiceChanged);
    return () => window.removeEventListener("vm:voice-engine-changed", onVoiceChanged);
  }, []);

  // Pre-fetch next cue when companion, mode, or style resets cleanly
  useEffect(() => {
    const fresh = createInitialPaceState(girl, style);
    setPaceState(fresh);
    setLine(pickFallbackPaceLine("warmup", []));
    queuePrefetch(fresh);
  }, [girl, mode, style, queuePrefetch]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    return () => {
      stopNeuralSpeech();
      stopSpeaking();
      stopJoiBeat();
      stopIntimacyAudio();
    };
  }, []);

  const triggerCue = async (signal: UserPaceSignal = "continue", startBeatOnReact = false) => {
    setLoadingCue(true);
    try {
      const expectedKey = `${paceState.companionName}|${paceState.style}|${paceState.turnCount}|${paceState.phase}`;
      let result: { nextState: PaceSessionState; line: string };

      if (signal === "continue" && prefetchRef.current?.stateKey === expectedKey) {
        result = await prefetchRef.current.promise;
      } else {
        result = await generateNextPaceLine({
          state: paceState,
          signal,
          callLlm,
        });
      }

      setPaceState(result.nextState);
      setLine(result.line);
      syncBeatToBpm(result.nextState.bpm, startBeatOnReact || beatActive);
      queuePrefetch(result.nextState);
      void speakCue(result.line, result.nextState.style, result.nextState.phase);
    } finally {
      setLoadingCue(false);
    }
  };

  const toggleBeat = () => {
    if (beatActive) {
      stopJoiBeat();
      setBeatActive(false);
    } else {
      const activeBpm = paceState.bpm > 0 ? paceState.bpm : 88;
      startJoiBeat(activeBpm);
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
      finishPhrase: `${girl.name.split(" ")[0]} whispers: Let go right now—you earned this.`,
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

  const beatBars =
    paceState.bpm <= 0
      ? [22, 22, 22, 22, 22, 22, 22]
      : paceState.bpm >= 115
        ? [92, 60, 96, 70, 98, 65, 90]
        : paceState.bpm >= 85
          ? [65, 45, 72, 48, 68, 42, 64]
          : [38, 22, 44, 24, 40, 26, 36];

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-10">
      {/* Collision-Free Header with Proper Spacing */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onHome} className="text-[#00f5ff] text-sm hover:underline shrink-0">
          ← Home
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
            style={{
              borderColor: `${phaseCfg.accentHex}70`,
              backgroundColor: `${phaseCfg.accentHex}1a`,
              color: phaseCfg.accentHex,
            }}
          >
            {phaseCfg.label} · {paceState.bpm > 0 ? `${paceState.bpm} BPM` : "HOLD"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff1e8e]/45 bg-[#0c0c16] px-3 py-1 text-xs font-semibold text-pink-200">
            {revealed ? <Eye className="h-3.5 w-3.5 text-[#00f5ff]" /> : <EyeOff className="h-3.5 w-3.5 text-[#ff1e8e]" />}
            {girl.name.split(" ")[0]} · {mode.toUpperCase()}
          </span>
          <span className="rounded-full border border-white/15 bg-[#0c0c16] px-3 py-1 text-xs font-bold text-[#ff1e8e] tabular-nums">
            ♥ {Math.min(4, Math.floor((paceState.turnCount + 1) / 2))}/4
          </span>
        </div>
      </div>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-[#f7f7fc] neon-text-glow">
          Blindfold &amp; Generative Audio Studio
        </h1>
        <p className="text-xs sm:text-sm text-[#a6a6c4]">
          Live pre-fetched AI voice cues ({voiceEngineLabel}) + reactive neon beat visualizer. Reveal at intimacy ≥ {REVEAL_AT}%.
        </p>
      </div>

      {/* Mode Selector + Voice Style Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["joi", "Classic JOI"],
            ["sph", "SPH / Tease"],
            ["bnwo", "Command"],
          ] as const
        ).map(([mId, lbl]) => (
          <button
            key={mId}
            type="button"
            onClick={() => setMode(mId)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              mode === mId ? "neon-btn-primary text-white" : "border border-white/15 text-zinc-300 hover:border-[#ff1e8e]/40"
            }`}
          >
            {lbl}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="ml-auto px-3 py-1.5 rounded-xl border border-white/15 text-xs text-zinc-300 hover:border-[#00f5ff]/50"
        >
          {showPicker ? "Hide girls" : "Choose girl"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a6a6c4] mr-1">Voice Style:</span>
        {VOICE_STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStyle(opt.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition ${
              style === opt.id
                ? "border-[#00f5ff] bg-[#00f5ff]/20 text-[#00f5ff]"
                : "border-white/15 bg-[#0c0c16] text-zinc-300 hover:border-[#ff1e8e]/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showPicker && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto rounded-2xl neon-glass p-2">
          {CHARACTERS.slice(0, 40).map((c) => {
            const int = getIntimacy(c.id, c.intimacy);
            const selected = c.id === girlId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  stopNeuralSpeech();
                  stopSpeaking();
                  setGirlId(c.id);
                  setRunning(false);
                  setSecs(0);
                  setShowPicker(false);
                }}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition ${
                  selected ? "border-[#ff1e8e] shadow-neonPink" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <SafeImage src={characterMediaUrl(c, "beauty")} fallbackId={c.id} alt={c.name} className="h-full w-full object-cover object-top" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                  <div className="text-[10px] font-medium text-white truncate">{c.name.split(" ")[0]}</div>
                  <div className="text-[9px] text-pink-300">{int}%</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Stage Card */}
      <div
        className="relative aspect-[4/4.2] max-w-sm mx-auto rounded-3xl overflow-hidden border bg-[#05050a]"
        style={{
          borderColor: `${phaseCfg.accentHex}66`,
          boxShadow: `0 0 32px ${phaseCfg.accentHex}2e`,
        }}
      >
        {revealed && sequenceFrames ? (
          <MotionSequencePlayer frames={sequenceFrames} alt={girl.name} />
        ) : revealed ? (
          <SafeImage
            src={characterMediaUrl(girl, intimacy >= 75 ? "nude" : "lingerie")}
            fallbackId={girl.id}
            alt={girl.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 bg-[radial-gradient(circle_at_50%_30%,rgba(255,30,142,0.16),rgba(5,5,10,0.98)_70%)]">
            <EyeOff className="h-10 w-10 text-[#ff1e8e]" />
            <p className="text-sm text-[#f7f7fc] text-center max-w-xs">
              Blindfold on. Match the live phase beat — reveal unlocks at {REVEAL_AT}% intimacy ({intimacy}% now).
            </p>
            <div className="flex h-16 items-end justify-center gap-2 py-2" aria-label="Neon beat visualizer">
              {beatBars.map((h, i) => (
                <span
                  key={i}
                  className={`w-2.5 rounded-full transition-all duration-300 ${
                    beatActive ? "animate-pulse" : "opacity-55"
                  }`}
                  style={{
                    height: `${h}%`,
                    backgroundColor: i % 2 === 0 ? phaseCfg.accentHex : "#00f5ff",
                    boxShadow: beatActive ? `0 0 12px ${phaseCfg.accentHex}` : "none",
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChat(girl.id)}
              className="mt-1 px-4 py-2 rounded-xl neon-btn-primary text-xs font-semibold"
            >
              Raise intimacy in chat
            </button>
          </div>
        )}
      </div>

      {/* Live AI Cue & 4 Instant Reaction Controls */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d16]/90 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#a6a6c4]">
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: phaseCfg.accentHex }}>
            <Sparkles className="h-3.5 w-3.5" /> {phaseCfg.label} · {paceState.userName ? `Personalized for ${paceState.userName}` : "Live AI Cue"}
          </span>
          <span className="tabular-nums">Turn #{paceState.turnCount + 1}</span>
        </div>

        <p className="text-sm sm:text-base leading-relaxed font-medium text-white">
          {loadingCue ? "Generating live cue..." : line}
        </p>

        {/* 4 Live Neon Reaction Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REACTION_CONTROLS.map((btn) => (
            <button
              key={btn.signal}
              type="button"
              disabled={loadingCue}
              onClick={() => void triggerCue(btn.signal, btn.signal !== "freeze")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${btn.tone}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => void speakCue(line, paceState.style, paceState.phase)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl neon-btn-primary text-xs font-bold text-white"
          >
            <Volume2 className="h-4 w-4" /> Speak Cue
          </button>
          <button
            type="button"
            disabled={loadingCue}
            onClick={() => void triggerCue("continue")}
            className="px-3.5 py-2 rounded-xl border border-[#00f5ff]/45 bg-[#00f5ff]/10 text-xs font-bold text-[#00f5ff] hover:bg-[#00f5ff]/20 disabled:opacity-50"
          >
            Next Pre-Fetched Cue →
          </button>
          <button
            type="button"
            onClick={toggleBeat}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold ${
              beatActive ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-white/15 text-zinc-300"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> {beatActive ? `Beat ${paceState.bpm || 88} BPM` : "Start Beat"}
          </button>
          <button
            type="button"
            onClick={toggleAmbience}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold ${
              ambienceActive ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200" : "border-white/15 text-zinc-300"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" /> {ambienceActive ? "Breath ON" : "Breath Layer"}
          </button>
          <button
            type="button"
            onClick={triggerCountdown}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600/85 text-white text-xs font-bold"
          >
            <Timer className="h-3.5 w-3.5" />
            {countdownLeft !== null ? `${countdownLeft}s…` : "10s Finish"}
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-xl border border-white/15 text-xs text-zinc-300"
          >
            {running ? `Pause (${secs}s)` : "Session Timer"}
          </button>
          <button
            type="button"
            onClick={() => onChat(girl.id)}
            className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs font-semibold text-pink-200 hover:border-[#ff1e8e]"
          >
            Open Chat
          </button>
        </div>
      </div>
    </div>
  );
}
