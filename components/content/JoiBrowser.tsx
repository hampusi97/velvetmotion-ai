"use client";

import { useEffect, useState } from "react";
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
  getJoiScenario,
} from "@/lib/content";
import { JOI_PHASES, type JoiScenario, type JoiStep } from "@/lib/content/types";
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
import { runGenerativePrompt } from "@/lib/chatRouter";
import { buildGuidedSession } from "@/lib/guidedSession";
import { speakWithNeuralVoice, stopNeuralSpeech } from "@/lib/kokoroTts";
import {
  COMPANION_SESSION_THEMES,
  COMPANION_THEME_KEYS,
  recommendedCompanionThemes,
  type CompanionSessionTheme,
} from "@/lib/companionSessionThemes";
import { assertCompliance } from "@/lib/complianceFilter";
import { FLAGSHIP_COMPANIONS } from "@/data/companions";
import { SafeImage } from "@/components/SafeImage";
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";

const PHASE_LABEL: Record<(typeof JOI_PHASES)[number], string> = {
  "warm-up": "Warm-up",
  build: "Build",
  edge: "Edge",
  peak: "Peak",
  finish: "Finish",
};

const BPM_MODES = [
  { label: "Slow Tease", bpm: 65 },
  { label: "Steady", bpm: 95 },
  { label: "Fast", bpm: 130 },
  { label: "Frenzy", bpm: 160 },
] as const;

const SESSION_PACES = {
  unhurried: { timerScale: 1.25, voiceRate: 0.82 },
  steady: { timerScale: 1, voiceRate: 0.92 },
  quick: { timerScale: 0.8, voiceRate: 1.04 },
};

function playCue(step: JoiStep, voiceId: string | undefined, whispery: boolean, rate: number) {
  const text = `${step.title}. ${step.instruction}`;
  const tuning = { pitch: 1.04, rate, whispery };
  if (voiceId) {
    void speakWithNeuralVoice(text, { ...tuning, voiceId });
  } else {
    speak(text, tuning);
  }
}

export function JoiBrowser({
  initialScenarioId = null,
  initialCompanionId,
}: {
  initialScenarioId?: string | null;
  initialCompanionId?: string;
}) {
  const initialCompanion = FLAGSHIP_COMPANIONS.find(({ id }) => id === initialCompanionId) ?? FLAGSHIP_COMPANIONS[0];
  const [draft, setDraft] = useState<JoiScenario | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState(initialCompanion.id);
  const companion = FLAGSHIP_COMPANIONS.find(({ id }) => id === selectedCompanion) ?? initialCompanion;
  const recommendedThemes = recommendedCompanionThemes(companion.category);
  const [sessionTheme, setSessionTheme] = useState<CompanionSessionTheme>(
    recommendedCompanionThemes(initialCompanion.category)[0],
  );
  const [sessionTone, setSessionTone] = useState("playful");
  const [sessionMinutes, setSessionMinutes] = useState<2 | 4 | 6>(4);
  const [sessionDirection, setSessionDirection] = useState("");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [pace, setPace] = useState<"unhurried" | "steady" | "quick">("steady");
  const [autoVoice, setAutoVoice] = useState(true);
  const [whisperMode, setWhisperMode] = useState(true);
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [beatBpm, setBeatBpm] = useState<number | null>(null);
  const [beatPulse, setBeatPulse] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);

  useEffect(() => {
    if (initialScenarioId) {
      setScenarioId(initialScenarioId);
      setStepIndex(0);
      setRemaining(null);
      setTimerDeadline(null);
    }
  }, [initialScenarioId]);

  const scenario: JoiScenario | undefined = scenarioId
    ? scenarioId === draft?.id ? draft : getJoiScenario(scenarioId)
    : undefined;
  const step = scenario?.steps[stepIndex];
  const sessionVoiceId = scenario?.persona.voiceId;
  const { timerScale, voiceRate } = SESSION_PACES[pace];

  useEffect(() => {
    if (!autoVoice || !step) return;
    playCue(step, sessionVoiceId, whisperMode, voiceRate);
    return () => {
      if (sessionVoiceId) stopNeuralSpeech();
      else stopSpeaking();
    };
  }, [autoVoice, sessionVoiceId, step, voiceRate, whisperMode]);

  useEffect(() => {
    return () => {
      stopNeuralSpeech();
      stopSpeaking();
      stopJoiBeat();
      stopIntimacyAudio();
    };
  }, []);

  const suggestedSeconds = step ? Math.max(1, Math.round(step.suggestedSeconds * timerScale)) : 0;

  useEffect(() => {
    if (timerDeadline === null || !step) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds > 0) return;

      const next = scenario?.steps[stepIndex + 1];
      if (autoAdvance && next) {
        const duration = Math.max(1, Math.round(next.suggestedSeconds * timerScale));
        setStepIndex(stepIndex + 1);
        setRemaining(duration);
        setTimerDeadline(Date.now() + duration * 1000);
      } else {
        setTimerDeadline(null);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [autoAdvance, scenario, step, stepIndex, timerDeadline, timerScale]);

  function moveToStep(index: number) {
    setStepIndex(index);
    setRemaining(null);
    setTimerDeadline(null);
    setCountdownLeft(null);
    stopSpeaking();
    stopNeuralSpeech();
  }

  function startTimer(seconds: number) {
    setRemaining(seconds);
    setTimerDeadline(Date.now() + seconds * 1000);
    if (step && autoVoice) playCue(step, sessionVoiceId, whisperMode, voiceRate);
  }

  function pauseTimer() {
    setTimerDeadline(null);
    setCountdownLeft(null);
    stopSpeaking();
    stopNeuralSpeech();
  }

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

  const companionPersona: JoiScenario["persona"] = {
    name: companion.name,
    age: companion.age,
    summary: companion.tagline,
    voiceId: companion.voiceId,
  };

  function loadCompanionScript() {
    setSessionError(null);
    try {
      setDraft(buildGuidedSession(
        JSON.stringify(companion.guidedPaceStages), companionPersona, "Companion pace", sessionMinutes, "companion",
      ));
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "This companion's script could not be loaded.");
    }
  }

  async function generateDraft() {
    if (sessionBusy) return;
    const direction = sessionDirection.trim();
    const safety = assertCompliance(direction);
    setSessionError(null);
    if (!safety.ok) {
      setSessionError(safety.reason);
      return;
    }

    setSessionBusy(true);
    setDraft(null);
    const theme = COMPANION_SESSION_THEMES[sessionTheme];
    try {
      const raw = await runGenerativePrompt(
        "Write three spoken cues for a private JOI session between consenting, unrelated fictional adults. Speak directly to the listener in first or second person. Bring in a specific detail from the chosen direction, give the build cue a fresh beat, and close with a supportive wind-down. Respect the user's limits and offer a way to slow down or stop. Treat identities with equal respect and avoid racial stereotypes or degradation. Return only a JSON array of three strings in order: warm-up, build, wind-down. Each cue contains at most two short sentences of exact spoken words. Omit narration, labels, dialogue tags, and stage directions.",
        `Fictional persona: ${companion.name}, age ${companion.age}. ${companion.personality}
Theme: ${theme.label}. ${theme.direction}
Tone: ${sessionTone}. Duration: ${sessionMinutes} minutes.
Direction and limits: ${direction || "No additional directions."}`,
        companion.name,
      );
      if (!raw) throw new Error("No draft came back. Check your chat model in Settings or use the companion script.");
      setDraft(buildGuidedSession(raw, companionPersona, `${sessionTone} · ${theme.label}`, sessionMinutes));
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not generate a session.");
    } finally {
      setSessionBusy(false);
    }
  }

  if (!scenario || !step) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-pink-400 mb-1 flex items-center gap-2">
            <Volume2 className="h-6 w-6 text-pink-400" /> Audio Voice JOI Studio
          </h2>
          <p className="text-xs text-zinc-400">{CONTENT_DISCLAIMER}</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-rose-200/20 bg-gradient-to-br from-[#2e1a27] to-[#141019] p-5 sm:p-7">
          <div className="flex gap-4">
            <SafeImage src={companion.portraitUrl}
              alt="" className="h-24 w-20 rounded-xl object-cover object-top" />
            <div>
              <h3 className="font-serif text-2xl text-rose-50">Build a private JOI session</h3>
              <p className="mt-1 max-w-md text-sm text-rose-100/75">Choose a fictional companion, set the pace, and review the generated script before starting.</p>
            </div>
          </div>
          <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void generateDraft(); }}>
            <fieldset disabled={sessionBusy} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-rose-100">Companion
                <select value={selectedCompanion} onChange={(event) => {
                  const profile = FLAGSHIP_COMPANIONS.find(({ id }) => id === event.target.value);
                  if (!profile) return;
                  setSelectedCompanion(profile.id);
                  setSessionTheme(recommendedCompanionThemes(profile.category)[0]);
                  setDraft(null);
                  setSessionError(null);
                }} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-sm">
                  {FLAGSHIP_COMPANIONS.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-rose-100">Kink or theme
                <select value={sessionTheme} onChange={(event) => {
                  setSessionTheme(event.target.value as CompanionSessionTheme);
                  setDraft(null);
                }} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-sm">
                  {COMPANION_THEME_KEYS.map((key) => (
                    <option key={key} value={key}>{COMPANION_SESSION_THEMES[key].label}{recommendedThemes.includes(key) ? " · Suggested" : ""}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-rose-100">Tone
                <select value={sessionTone} onChange={(event) => { setSessionTone(event.target.value); setDraft(null); }}
                  className="mt-1 block w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-sm">
                  <option value="playful">Playful</option><option value="gentle">Gentle</option><option value="confident">Confident</option>
                </select>
              </label>
              <label className="text-xs text-rose-100">Duration
                <select value={sessionMinutes} onChange={(event) => { setSessionMinutes(Number(event.target.value) as 2 | 4 | 6); setDraft(null); }}
                  className="mt-1 block w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-sm">
                  <option value={2}>2 minutes</option><option value={4}>4 minutes</option><option value={6}>6 minutes</option>
                </select>
              </label>
            </fieldset>
            <label className="block text-xs text-rose-100">Direction and limits
              <textarea value={sessionDirection} disabled={sessionBusy} onChange={(event) => { setSessionDirection(event.target.value); setDraft(null); }}
                maxLength={500} rows={2} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-sm"
                placeholder="Slow and playful, with a gentle wind-down" />
            </label>
            <p className="text-xs text-zinc-400">Your selected chat model receives your theme, tone, and directions. The companion script uses built-in cues.</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={sessionBusy} className="rounded-full bg-rose-200 px-4 py-2 text-sm font-semibold text-[#27121e] disabled:opacity-60">
                {sessionBusy ? "Writing session…" : "Generate draft"}
              </button>
              <button type="button" disabled={sessionBusy} onClick={loadCompanionScript}
                className="rounded-full border border-rose-200/30 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-200/10 disabled:opacity-60">
                Use companion script
              </button>
            </div>
          </form>
          {sessionError && <p role="alert" className="mt-3 text-sm text-rose-200">{sessionError}</p>}
          {draft && (
            <div className="mt-5 border-t border-white/15 pt-4">
              <h4 className="text-sm font-semibold">{draft.label} · {draft.summary}</h4>
              <ol className="mt-2 space-y-3 text-sm text-zinc-200">
                {draft.steps.map((cue) => <li key={cue.id}><strong>{cue.title}</strong> · {cue.instruction}</li>)}
              </ol>
              <button type="button" onClick={() => {
                stopSpeaking();
                setAutoVoice(false);
                moveToStep(0);
                setScenarioId(draft.id);
              }} className="mt-4 rounded-full border border-rose-200/40 px-4 py-2 text-sm text-rose-100 hover:bg-rose-200/10">
                Open guided session
              </button>
            </div>
          )}
        </div>

        {/* Instant Dirty Talk & Stroke Beat Audio Packs */}
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

        {/* Full Guided JOI Scenarios */}
        <div className="grid grid-cols-1 gap-2.5">
          {ALL_JOI_PRESETS.map((item, idx) => {
            const expanded = EXPANDED_JOI_IDS.includes(item.id);
            const char = CHARACTERS[idx % CHARACTERS.length];
            const thumb = characterMediaUrl(char, idx % 2 === 0 ? "lingerie" : "nude");
            return (
              <button
                key={item.id}
                onClick={() => {
                  setScenarioId(item.id);
                  moveToStep(0);
                }}
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
                        {expanded ? "Voice + Script" : "Audio Pack"}
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
  const atStart = stepIndex === 0;
  const atEnd = stepIndex === scenario.steps.length - 1;
  const progressPct =
    remaining !== null && step.suggestedSeconds > 0
      ? Math.max(0, Math.min(100, ((suggestedSeconds - remaining) / suggestedSeconds) * 100))
      : 0;

  return (
    <section className="max-w-lg mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => {
            stopSpeaking();
            stopNeuralSpeech();
            stopJoiBeat();
            setBeatBpm(null);
            stopIntimacyAudio();
            setAmbienceOn(false);
            setScenarioId(null);
            moveToStep(0);
          }}
          className="text-sm text-pink-400"
        >
          ← All JOI scenarios
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
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
              if (autoVoice) {
                stopSpeaking();
                stopNeuralSpeech();
              }
              setAutoVoice(!autoVoice);
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
          className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${ACCENT_CLASS[scenario.accent]} ${
            beatPulse ? "scale-110 ring-2 ring-pink-400" : ""
          } transition-transform duration-100`}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{scenario.label}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {scenario.persona.name}, {scenario.persona.age} · {scenario.tone}
          </p>
        </div>
      </div>

      {/* Live Beat + Countdown + Breathing Controls */}
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

      <div className="grid grid-cols-4 gap-1.5">
        {JOI_PHASES.map((phase, index) => (
          <div key={phase} className="text-center">
            <div
              className={`h-1.5 rounded-full ${index <= phaseIndex ? "bg-pink-500" : "bg-zinc-800"}`}
            />
            <div className={`text-[10px] mt-1 ${index === phaseIndex ? "text-pink-300" : "text-zinc-600"}`}>
              {PHASE_LABEL[phase]}
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
              onClick={() => playCue(step, sessionVoiceId, whisperMode, voiceRate)}
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

      <div className="space-y-3 rounded-2xl border border-rose-200/15 bg-[#211725] p-3 text-xs text-rose-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2">
            Pace
            <select value={pace} onChange={(event) => setPace(event.target.value as typeof pace)}
              disabled={remaining !== null && remaining > 0}
              className="rounded-lg border border-white/15 bg-[#151019] p-2">
              <option value="unhurried">Unhurried</option>
              <option value="steady">Steady</option>
              <option value="quick">Quick</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} />
            Auto-advance cues
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="tabular-nums">
            {remaining === null ? `Suggested ${suggestedSeconds}s` : remaining > 0 ? `${remaining}s remaining` : "Cue complete"}
          </span>
          {timerDeadline !== null ? (
            <button type="button" onClick={pauseTimer} className="rounded-full border border-white/20 px-3 py-2">
              Pause timer
            </button>
          ) : (
            <button type="button" onClick={() => startTimer(remaining && remaining > 0 ? remaining : suggestedSeconds)}
              className="rounded-full bg-rose-200 px-3 py-2 font-semibold text-[#291722]">
              {remaining && remaining > 0 ? "Resume timer" : remaining === 0 ? "Restart timer" : "Start timer"}
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => moveToStep(Math.max(0, stepIndex - 1))}
          disabled={atStart}
          className="flex-1 py-3 rounded-2xl border border-zinc-700 disabled:opacity-30"
        >
          Back
        </button>
        {atEnd ? (
          <button
            onClick={() => moveToStep(0)}
            className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
          >
            Replay
          </button>
        ) : (
          <button
            onClick={() => moveToStep(stepIndex + 1)}
            className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
