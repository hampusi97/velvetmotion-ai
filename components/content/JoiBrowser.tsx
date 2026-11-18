"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ACCENT_CLASS } from "@/components/content/accents";
import {
  CONTENT_DISCLAIMER,
  EXPANDED_JOI_IDS,
  JOI_PRESETS,
  getJoiScenario,
} from "@/lib/content";
import { JOI_PHASES, type JoiScenario } from "@/lib/content/types";
import { speak, stopSpeaking } from "@/lib/speech";

const PHASE_LABEL: Record<(typeof JOI_PHASES)[number], string> = {
  "warm-up": "Warm-up",
  build: "Build",
  edge: "Edge",
  finish: "Finish",
};

export function JoiBrowser({ initialScenarioId = null }: { initialScenarioId?: string | null }) {
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);

  useEffect(() => {
    if (initialScenarioId) {
      setScenarioId(initialScenarioId);
      setStepIndex(0);
    }
  }, [initialScenarioId]);

  const scenario: JoiScenario | undefined = scenarioId
    ? getJoiScenario(scenarioId)
    : undefined;
  const step = scenario?.steps[stepIndex];

  useEffect(() => {
    setRemaining(null);
    if (autoVoice && step) {
      speak(`${step.title}. ${step.instruction}`, { pitch: 1.05, rate: 0.92 });
    }
  }, [scenarioId, stepIndex, autoVoice, step]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => (value === null ? value : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (!scenario || !step) {
    return (
      <section className="max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-pink-400 mb-1">JOI Center</h2>
        <p className="text-xs text-zinc-500 mb-4">{CONTENT_DISCLAIMER}</p>
        <div className="grid grid-cols-1 gap-2.5">
          {JOI_PRESETS.map((item) => {
            const expanded = EXPANDED_JOI_IDS.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setScenarioId(item.id);
                  setStepIndex(0);
                }}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left hover:border-pink-500/50 active:scale-[0.99] transition"
              >
                <div className="flex gap-3">
                  <div
                    className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${ACCENT_CLASS[item.accent]}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{item.label}</div>
                      <span className="text-[10px] text-zinc-500">
                        {expanded ? "Expanded" : "New"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {item.persona.name}, {item.persona.age} · {item.tone}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.summary}</p>
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
      ? Math.max(0, Math.min(100, ((step.suggestedSeconds - remaining) / step.suggestedSeconds) * 100))
      : 0;

  return (
    <section className="max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={() => {
            stopSpeaking();
            setScenarioId(null);
            setStepIndex(0);
          }}
          className="text-sm text-pink-400"
        >
          ← All JOI scenarios
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !autoVoice;
            setAutoVoice(next);
            if (!next) stopSpeaking();
            else speak(`${step.title}. ${step.instruction}`, { pitch: 1.05, rate: 0.92 });
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
      <div className="flex gap-3 mb-4">
        <div
          className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${ACCENT_CLASS[scenario.accent]}`}
          aria-hidden
        />
        <div>
          <h2 className="text-xl font-bold">{scenario.label}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {scenario.persona.name}, {scenario.persona.age}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-4">
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
              onClick={() => speak(`${step.title}. ${step.instruction}`, { pitch: 1.05, rate: 0.92 })}
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
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span>Suggested {step.suggestedSeconds}s. Skip whenever you want.</span>
        {remaining === null ? (
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
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={atStart}
          className="flex-1 py-3 rounded-2xl border border-zinc-700 disabled:opacity-30"
        >
          Back
        </button>
        {atEnd ? (
          <button
            onClick={() => setStepIndex(0)}
            className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
          >
            Replay
          </button>
        ) : (
          <button
            onClick={() => setStepIndex((index) => index + 1)}
            className="flex-1 py-3 rounded-2xl bg-pink-600 font-medium"
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
