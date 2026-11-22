"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Volume2,
  VolumeX,
  Activity,
  Flame,
  Timer,
  Sparkles,
  Play,
  Square,
  HeartPulse,
} from "lucide-react";
import { ACCENT_CLASS } from "@/components/content/accents";
import {
  ALL_JOI_PRESETS,
  CONTENT_DISCLAIMER,
  EXPANDED_JOI_IDS,
  INTENSE_RELATIONSHIP_JOI_PRESETS,
  INTERRACIAL_JOI_PRESETS,
  getJoiScenario,
} from "@/lib/content";
import { CONTENT_THEME_LABELS, JOI_PHASES, type ContentTheme, type JoiScenario } from "@/lib/content/types";
import {
  JOI_DIRTY_TRACKS,
  speak,
  startVoiceCountdown,
  stopSpeaking,
} from "@/lib/speech";
import {
  startIntimacyAudio,
  stopIntimacyAudio,
  startJoiBeat,
  stopJoiBeat,
} from "@/lib/audioEngine";
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

const PHASE_LABEL: Record<(typeof JOI_PHASES)[number], string> = {
  "warm-up": "Warm-up",
  build: "Build",
  edge: "Edge",
  peak: "Peak",
  finish: "Finish",
};

const ROMANCE_PHASE_LABEL = { ...PHASE_LABEL, edge: "Anticipation", peak: "Connection", finish: "Check-in" };
const KINK_PHASE_LABEL = { ...PHASE_LABEL, edge: "Choices", peak: "Roleplay", finish: "Check-in" };
const SESSION_FILTERS = [null, "interracial", "kink"] as const;
const THEMED_SESSIONS: Record<ContentTheme, JoiScenario[]> = {
  interracial: INTERRACIAL_JOI_PRESETS,
  kink: INTENSE_RELATIONSHIP_JOI_PRESETS,
};
const themeBySessionId = new Map<string, ContentTheme>([
  ...INTERRACIAL_JOI_PRESETS.map(({ id }) => [id, "interracial"] as const),
  ...INTENSE_RELATIONSHIP_JOI_PRESETS.map(({ id }) => [id, "kink"] as const),
]);

const BPM_MODES = [
  { label: "Slow Tease", bpm: 65 },
  { label: "Steady", bpm: 95 },
  { label: "Fast", bpm: 130 },
  { label: "Frenzy", bpm: 160 },
] as const;

export function JoiBrowser({ initialScenarioId = null, initialTheme = null }: {
  initialScenarioId?: string | null;
  initialTheme?: ContentTheme | null;
}) {
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId);
  const [theme, setTheme] = useState(initialTheme);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [autoVoice, setAutoVoice] = useState(() => !initialScenarioId || !themeBySessionId.has(initialScenarioId));
  const [paused, setPaused] = useState(false);
  const [whisperMode, setWhisperMode] = useState(true);
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [beatBpm, setBeatBpm] = useState<number | null>(null);
  const [beatPulse, setBeatPulse] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);

  useEffect(() => {
    if (initialScenarioId) {
      setScenarioId(initialScenarioId);
      setStepIndex(0);
      setStepHistory([]);
    }
  }, [initialScenarioId]);

  const scenario: JoiScenario | undefined = scenarioId
    ? getJoiScenario(scenarioId)
    : undefined;
  const step = scenario?.steps[stepIndex];
  const voiceGender = scenario?.persona.voiceGender;
  const scenarioTheme = scenario && themeBySessionId.get(scenario.id);
  const visibleScenarios = theme ? THEMED_SESSIONS[theme] : ALL_JOI_PRESETS;

  useEffect(() => {
    setRemaining(null);
  }, [scenarioId, stepIndex]);

  useEffect(() => {
    if (autoVoice && step && !paused) {
      speak(`${step.title}. ${step.instruction}`, {
        pitch: 1.04,
        rate: 0.92,
        whispery: whisperMode,
        gender: voiceGender,
      });
    }
  }, [autoVoice, step, whisperMode, paused, voiceGender]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopJoiBeat();
      stopIntimacyAudio();
    };
  }, []);

  useEffect(() => {
    if (paused || remaining === null || remaining <= 0) return;
    const timer = setTimeout(
      () => setRemaining((value) => (value === null ? value : value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining, paused]);

  const stopSessionAudio = () => {
    stopSpeaking();
    stopJoiBeat();
    stopIntimacyAudio();
    setBeatBpm(null);
    setBeatPulse(false);
    setAmbienceOn(false);
    setCountdownLeft(null);
  };

  const openScenario = (id: string) => {
    if (themeBySessionId.has(id)) {
      stopSessionAudio();
      setAutoVoice(false);
    }
    setPaused(false);
    setScenarioId(id);
    setStepIndex(0);
    setStepHistory([]);
  };

  const showStep = (index: number) => {
    if (scenarioTheme) stopSpeaking();
    setStepIndex(index);
  };

  const moveToStep = (index: number) => {
    setStepHistory((history) => [...history, stepIndex]);
    showStep(index);
  };

  const previousStep = () => {
    const index = stepHistory.at(-1);
    if (index === undefined) return;
    setStepHistory((history) => history.slice(0, -1));
    showStep(index);
  };

  const toggleBeat = (bpm: number) => {
    if (beatBpm === bpm) {
      stopJoiBeat();
      setBeatBpm(null);
      setBeatPulse(false);
    } else {
      setBeatBpm(bpm);
      startJoiBeat(bpm, () => {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 140);
      });
    }
  };

  const toggleAmbience = () => {
    const next = !ambienceOn;
    setAmbienceOn(next);
    if (next) {
      startIntimacyAudio(step?.phase === "finish" ? 95 : step?.phase === "edge" ? 80 : 60);
    } else {
      stopIntimacyAudio();
    }
  };

  const triggerCountdown = (secs: number) => {
    setCountdownLeft(secs);
    startVoiceCountdown(secs, {
      voice: { pitch: 1.0, rate: 0.94 },
      finishPhrase: "Cum for me right now. Empty everything while you look at me.",
      onTick: (rem) => setCountdownLeft(rem),
      onComplete: () => setCountdownLeft(null),
    });
  };

  const playDirtyTrack = (track: (typeof JOI_DIRTY_TRACKS)[number]) => {
    if (beatBpm !== track.bpm) {
      setBeatBpm(track.bpm);
      startJoiBeat(track.bpm, () => {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 140);
      });
    }
    if (!ambienceOn) {
      setAmbienceOn(true);
      startIntimacyAudio(82);
    }
    speak(track.lines.join(" "), {
      pitch: 1.02,
      rate: 0.9,
      whispery: whisperMode,
    });
  };

  if (!scenario || !step) {
    return (
      <section className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-pink-400 mb-1 flex items-center gap-2">
            <Volume2 className="h-6 w-6 text-pink-400" /> Audio Voice JOI Studio
          </h2>
          <p className="text-xs text-zinc-400">{CONTENT_DISCLAIMER}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Guided session filters">
          {SESSION_FILTERS.map((filter) => (
            <button key={filter ?? "all"} type="button" aria-pressed={theme === filter}
              onClick={() => { if (filter) stopSessionAudio(); setTheme(filter); }}
              className={`rounded-full border px-3 py-2 text-xs ${theme === filter ? "border-pink-500 bg-pink-500/20 text-pink-100" : "border-zinc-700 text-zinc-300"}`}>
              {filter ? CONTENT_THEME_LABELS[filter] : "All sessions"}
            </button>
          ))}
          {theme && (
            <Link href={`/?view=packs&theme=${theme}`} className="rounded px-2 py-2 text-sm font-medium text-pink-200 underline-offset-4 hover:underline">
              {theme === "interracial" ? "Browse interracial stories" : "Browse kink stories"}
            </Link>
          )}
        </div>

        {!theme && (
        <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-950/35 to-zinc-950 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-rose-400" /> Instant Dirty Talk & Pacemaker Packs
              </h3>
              <p className="text-[11px] text-zinc-400">
                Procedural Web Audio stroke beat + whispery spoken instructions & climax countdowns
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAmbience}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium ${
                  ambienceOn
                    ? "border-pink-500 bg-pink-600/30 text-pink-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                {ambienceOn ? "Breathing Layer: ON" : "Breathing Layer"}
              </button>
              <button
                type="button"
                onClick={() => triggerCountdown(10)}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1 text-[11px] font-semibold text-white shadow"
              >
                <Timer className="h-3.5 w-3.5" />
                {countdownLeft !== null ? `Cum in ${countdownLeft}s…` : "10s Climax Countdown"}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {JOI_DIRTY_TRACKS.map((track) => {
              const active = beatBpm === track.bpm;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => playDirtyTrack(track)}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? "border-pink-500 bg-pink-500/15"
                      : "border-white/10 bg-black/40 hover:border-pink-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Play className="h-3 w-3 text-pink-400 fill-current" /> {track.label}
                    </span>
                    <span className="text-[10px] rounded-full bg-pink-500/20 text-pink-200 px-2 py-0.5">
                      {track.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400 line-clamp-2 italic">
                    &ldquo;{track.lines[0]}&rdquo;
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Activity className={`h-3.5 w-3.5 ${beatPulse ? "text-pink-400 scale-125" : "text-zinc-500"}`} />
              Stroke Beat Pacemaker:
            </span>
            {BPM_MODES.map((m) => (
              <button
                key={m.bpm}
                type="button"
                onClick={() => toggleBeat(m.bpm)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  beatBpm === m.bpm
                    ? "border-pink-400 bg-pink-600 text-white"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {m.label} ({m.bpm})
              </button>
            ))}
            {beatBpm && (
              <button
                type="button"
                onClick={() => {
                  stopJoiBeat();
                  setBeatBpm(null);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 px-2.5 py-1 text-[11px] text-rose-300"
              >
                <Square className="h-2.5 w-2.5 fill-current" /> Stop Beat
              </button>
            )}
          </div>
        </div>
        )}

        {/* Full Guided JOI Scenarios */}
        <div className="grid grid-cols-1 gap-2.5">
          {visibleScenarios.map((item, idx) => {
            const expanded = EXPANDED_JOI_IDS.includes(item.id);
            const itemTheme = themeBySessionId.get(item.id);
            const legacyIndex = Math.max(0, idx - themeBySessionId.size);
            const char = CHARACTERS[legacyIndex % CHARACTERS.length];
            const thumb = item.persona.portraitUrl || characterMediaUrl(char, legacyIndex % 2 === 0 ? "lingerie" : "nude");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openScenario(item.id)}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left hover:border-pink-500/50 active:scale-[0.99] transition"
              >
                <div className="flex gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={item.persona.name}
                    className="h-16 w-14 shrink-0 rounded-xl object-cover border border-white/10"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-white">{item.label}</div>
                      <span className="text-[10px] rounded-full bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 text-pink-200">
                        {itemTheme ? CONTENT_THEME_LABELS[itemTheme] : expanded ? "Voice + Script" : "Audio Pack"}
                      </span>
                    </div>
                    <div className="text-xs text-pink-300 mt-0.5">
                      {item.persona.name}, {item.persona.age} · {item.tone}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.summary}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const phaseIndex = JOI_PHASES.indexOf(step.phase);
  const atStart = stepHistory.length === 0;
  const atEnd = stepIndex === scenario.steps.length - 1;
  const nextStep = scenario.steps[stepIndex + 1];
  const afterOptional = nextStep?.optional
    ? scenario.steps.findIndex((item, index) => index > stepIndex && !item.optional)
    : -1;
  const checkInIndex = scenarioTheme === "kink" && step.phase !== "finish"
    ? scenario.steps.findIndex((item) => item.phase === "finish")
    : -1;
  const phaseLabels = scenarioTheme === "kink" ? KINK_PHASE_LABEL : scenarioTheme === "interracial" ? ROMANCE_PHASE_LABEL : PHASE_LABEL;
  const progressPct =
    remaining !== null && step.suggestedSeconds > 0
      ? Math.max(0, Math.min(100, ((step.suggestedSeconds - remaining) / step.suggestedSeconds) * 100))
      : 0;

  return (
    <section className="max-w-lg mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => {
            stopSessionAudio();
            setPaused(false);
            setScenarioId(null);
            setStepIndex(0);
            setStepHistory([]);
          }}
          className="text-sm text-pink-400"
        >
          ← All JOI scenarios
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          {scenarioTheme && (
            <button type="button" aria-pressed={paused}
              onClick={() => { if (!paused) stopSpeaking(); setPaused(!paused); }}
              className="rounded-full border border-pink-300/35 px-3 py-1 text-xs text-pink-100">
              {paused ? "Resume session" : "Pause session"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setWhisperMode((w) => !w)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              whisperMode
                ? "border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            }`}
          >
            {whisperMode ? "Whisper Mode: ON" : "Normal Voice"}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !autoVoice;
              setAutoVoice(next);
              if (!next) stopSpeaking();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              autoVoice
                ? "border-pink-500 bg-pink-500/20 text-pink-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            }`}
          >
            {autoVoice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {autoVoice ? "Auto-Voice On" : "Auto-Voice Off"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div
          className={`h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${ACCENT_CLASS[scenario.accent]} ${
            beatPulse ? "scale-110 ring-2 ring-pink-400" : ""
          } transition-transform duration-100`}
          aria-hidden
        >
          {scenario.persona.portraitUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scenario.persona.portraitUrl} alt="" className="h-full w-full object-cover object-top" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{scenario.label}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {scenario.persona.name}, {scenario.persona.age} · {scenario.tone}
          </p>
        </div>
      </div>

      {!scenarioTheme && (
      <div className="rounded-2xl border border-pink-500/25 bg-zinc-900/70 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-pink-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Live JOI Audio Engine
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={toggleAmbience}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                ambienceOn
                  ? "border-pink-500 bg-pink-600/30 text-pink-100"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {ambienceOn ? "Breathing ON" : "+ Breathing Audio"}
            </button>
            <button
              type="button"
              onClick={() => triggerCountdown(10)}
              className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-medium text-white"
            >
              {countdownLeft !== null ? `Finish in ${countdownLeft}s` : "10s Voice Countdown"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BPM_MODES.map((m) => (
            <button
              key={m.bpm}
              type="button"
              onClick={() => toggleBeat(m.bpm)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                beatBpm === m.bpm
                  ? "border-pink-400 bg-pink-600 text-white"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {m.label} · {m.bpm} BPM
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {JOI_PHASES.map((phase, index) => (
          <div key={phase} className="text-center">
            <div
              className={`h-1.5 rounded-full ${index <= phaseIndex ? "bg-pink-500" : "bg-zinc-800"}`}
            />
            <div className={`text-[10px] mt-1 ${index === phaseIndex ? "text-pink-300" : "text-zinc-600"}`}>
              {phaseLabels[phase]}
            </div>
          </div>
        ))}
      </div>

      <article className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{step.title}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paused}
              onClick={() =>
                speak(`${step.title}. ${step.instruction}`, {
                  pitch: 1.04,
                  rate: 0.92,
                  whispery: whisperMode,
                  gender: voiceGender,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-xs text-pink-200 hover:bg-pink-500/20"
            >
              <Volume2 className="h-3.5 w-3.5" /> Speak Step
            </button>
            <span className="text-[11px] text-zinc-500">
              {stepIndex + 1} / {scenario.steps.length}
            </span>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-100">
          {step.instruction}
        </p>
        {remaining !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </article>

      <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span>Suggested {step.suggestedSeconds}s. Skip whenever you want.</span>
        {paused ? (
          <span role="status" className="font-medium text-pink-200">Session paused</span>
        ) : remaining === null ? (
          <button
            onClick={() => setRemaining(step.suggestedSeconds)}
            className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200"
          >
            Start timer
          </button>
        ) : remaining > 0 ? (
          <span className="text-pink-300 tabular-nums font-medium">{remaining}s remaining</span>
        ) : (
          <span className="text-pink-300 font-medium">Time&apos;s up — ready for next step</span>
        )}
      </div>
      {checkInIndex >= 0 && (
        <button type="button" onClick={() => moveToStep(checkInIndex)} className="text-sm text-pink-300 underline underline-offset-4">
          Skip to check-in
        </button>
      )}
      {nextStep?.optional && <p className="text-sm text-pink-100">Next optional step · {nextStep.title}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={previousStep}
          disabled={atStart}
          className="flex-1 py-3 rounded-2xl border border-zinc-700 disabled:opacity-30"
        >
          Back
        </button>
        {atEnd ? (
          <button
            onClick={() => { setStepHistory([]); showStep(0); }}
            className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
          >
            Replay
          </button>
        ) : (
          <>
            {afterOptional >= 0 && (
              <button type="button" onClick={() => moveToStep(afterOptional)} className="flex-1 py-3 rounded-2xl border border-zinc-700">
                Skip optional step
              </button>
            )}
            <button
              onClick={() => moveToStep(stepIndex + 1)}
              className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
            >
              {nextStep?.optional ? "Opt in" : "Next"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
