"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, clampVoice } from "@/lib/speech-text.mjs";

export type SpeechPrefs = {
  voiceURI: string;
  pitch: number;
  rate: number;
  lang?: string;
};

type Phase = "idle" | "playing" | "paused";

export function useSpeech(onError?: (message: string) => void) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const queueRef = useRef<string[]>([]);
  const tokenRef = useRef(0);
  const prefsRef = useRef<SpeechPrefs>({ voiceURI: "", pitch: 1, rate: 1 });
  const pausedRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  const pumpRef = useRef<(token: number) => void>(() => {});
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    tokenRef.current += 1;
    queueRef.current = [];
    pausedRef.current = false;
    activeIdRef.current = null;
    setActiveId(null);
    setPhase("idle");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    pumpRef.current = (token: number) => {
      if (token !== tokenRef.current || pausedRef.current) return;
      const next = queueRef.current.shift();
      if (!next) {
        activeIdRef.current = null;
        setActiveId(null);
        setPhase("idle");
        return;
      }
      const synth = window.speechSynthesis;
      const prefs = prefsRef.current;
      const clamped = clampVoice(prefs.pitch, prefs.rate);
      const utterance = new SpeechSynthesisUtterance(next);
      utterance.pitch = clamped.pitch;
      utterance.rate = clamped.rate;
      if (prefs.lang) utterance.lang = prefs.lang;
      const voice = synth.getVoices().find((item) => item.voiceURI === prefs.voiceURI);
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        if (token !== tokenRef.current) return;
        pumpRef.current(token);
      };
      utterance.onerror = (event) => {
        if (token !== tokenRef.current) return;
        if (event.error === "interrupted" || event.error === "canceled") return;
        queueRef.current = [];
        activeIdRef.current = null;
        setActiveId(null);
        setPhase("idle");
        onErrorRef.current?.("Couldn't play that message with the selected voice.");
      };
      synth.speak(utterance);
    };
  }, []);

  const speak = useCallback(
    (id: string, text: string, prefs: SpeechPrefs) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return "unavailable" as const;
      const chunks = chunkForSpeech(text);
      if (!chunks.length) return "empty" as const;
      stop();
      const token = tokenRef.current;
      prefsRef.current = prefs;
      queueRef.current = chunks;
      pausedRef.current = false;
      activeIdRef.current = id;
      setActiveId(id);
      setPhase("playing");
      window.setTimeout(() => pumpRef.current(token), 40);
      return "started" as const;
    },
    [stop],
  );

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !activeIdRef.current) return;
    pausedRef.current = true;
    setPhase("paused");
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !activeIdRef.current) return;
    pausedRef.current = false;
    setPhase("playing");
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
      return;
    }
    if (!synth.speaking) pumpRef.current(tokenRef.current);
  }, []);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      tokenRef.current += 1;
      queueRef.current = [];
      pausedRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  return { supported, voices, activeId, phase, speak, pause, resume, stop };
}
