"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import type { Character } from "@/lib/charactersTypes";
import { generateCompanionReply } from "@/lib/chatRouter";
import {
  getPreferredVoiceEngine,
  setPreferredVoiceEngine,
  speakWithNeuralVoice,
  stopNeuralSpeech,
  type VoiceEngineId,
} from "@/lib/kokoroTts";
import { VOICE_ENGINE_OPTIONS } from "@/data/localModelCatalog";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { earnCompanionXp } from "@/lib/progression";
import { getTimeMood } from "@/lib/timeMood";
import { AmbientMixer } from "@/components/AmbientMixer";

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  [idx: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceCallModal({
  character,
  open,
  onClose,
}: {
  character: Character;
  open: boolean;
  onClose: () => void;
}) {
  const [connected, setConnected] = useState(true);
  const [muted, setMuted] = useState(false);
  const [whisperMode, setWhisperMode] = useState(() => getTimeMood().whisperBias);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string>(character.voiceIntro || `Hey... I'm right here.`);
  const [engineUsed, setEngineUsed] = useState<string>("Kokoro / WebSpeech");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineId>(() => getPreferredVoiceEngine());

  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(true);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: character.voiceIntro || character.initialMessage },
  ]);

  const stopAll = useCallback(() => {
    activeRef.current = false;
    stopNeuralSpeech();
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    setSpeaking(false);
  }, []);

  const startMicLoop = useCallback(() => {
    if (!activeRef.current || muted || typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onstart = () => setListening(true);
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.onresult = async (ev) => {
        const idx = ev.results.length - 1;
        const spoken = ev.results[idx]?.[0]?.transcript?.trim();
        if (!spoken || !activeRef.current) return;
        setTranscript(`You: “${spoken}”`);
        historyRef.current.push({ role: "user", text: spoken });

        const res = await generateCompanionReply(historyRef.current, {
          id: character.id,
          name: character.name,
          age: character.age,
          tagline: character.tagline,
          personality: character.personality,
          backstory: character.background,
        });
        if (!activeRef.current) return;
        historyRef.current.push({ role: "assistant", text: res.text });
        setTranscript(res.text);
        earnCompanionXp(character.id, 6);

        setSpeaking(true);
        const tts = await speakWithNeuralVoice(res.text, {
          voiceId: character.voiceId,
          whispery: whisperMode,
          pitch: character.voice?.pitch,
          rate: character.voice?.rate,
        });
        setEngineUsed(tts.label);
        setSpeaking(false);
        if (activeRef.current && !muted) startMicLoop();
      };
      recogRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
    }
  }, [character, muted, whisperMode]);

  useEffect(() => {
    if (!open) return;
    activeRef.current = true;
    setConnected(true);
    setElapsed(0);
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);

    // Speak opening line on call answer
    setSpeaking(true);
    void speakWithNeuralVoice(character.voiceIntro || `Hey, glad you called.`, {
      voiceId: character.voiceId,
      whispery: whisperMode,
    }).then((r) => {
      setEngineUsed(r.label);
      setSpeaking(false);
      if (activeRef.current && !muted) startMicLoop();
    });

    const onBossMute = () => {
      stopAll();
      onClose();
    };
    window.addEventListener("vm:boss-key-mute", onBossMute);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vm:boss-key-mute", onBossMute);
      stopAll();
    };
  }, [character, muted, onClose, open, startMicLoop, stopAll, whisperMode]);

  if (!open) return null;

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
      <div className="w-full max-w-sm neon-border-sweep">
        <div className="neon-sweep-inner p-6 text-center space-y-5">
          <div className="flex items-center justify-between text-[11px] text-[#a6a6c4]">
            <span className="inline-flex items-center gap-1.5 text-[#00ffa3] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#00ffa3] animate-pulse" />
              {connected ? `Live · ${mins}:${secs}` : "Ended"}
            </span>
            <span className="rounded-full border border-[#00f5ff]/35 bg-[#00f5ff]/10 px-2.5 py-0.5 text-[#00f5ff]">
              {engineUsed}
            </span>
          </div>

          {/* Pulsing Neon Circular Audio Waveform Avatar */}
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            <span
              className={`absolute inset-0 rounded-full border-2 ${
                speaking
                  ? "border-[#ff1e8e] shadow-[0_0_32px_rgba(255,30,142,0.85)] animate-ping"
                  : listening
                    ? "border-[#00f5ff] shadow-[0_0_26px_rgba(0,245,255,0.7)] animate-pulse"
                    : "border-white/20"
              }`}
            />
            <img
              src={staticPortraitUrl(character.id)}
              alt={character.name}
              className="relative h-28 w-28 rounded-full object-cover object-top ring-2 ring-[#ff1e8e]/70"
            />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-[#f7f7fc]">{character.name}</h2>
            <p className="text-xs text-[#00f5ff] mt-0.5">
              {speaking ? "Speaking..." : listening ? "Listening hands-free..." : "Tap mic or speak naturally"}
            </p>
          </div>

          <div className="min-h-[3.5rem] rounded-2xl border border-white/10 bg-[#05050a]/80 p-3 text-xs text-[#f7f7fc] leading-relaxed">
            {transcript}
          </div>

          <AmbientMixer compact={false} />

          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#141418] px-3 py-2 text-left">
            <span className="text-[11px] font-semibold text-zinc-400 shrink-0">Voice Engine</span>
            <select
              aria-label="Voice Engine"
              value={voiceEngine}
              onChange={(e) => {
                const next = e.target.value as VoiceEngineId;
                setVoiceEngine(next);
                setPreferredVoiceEngine(next);
              }}
              className="min-w-0 flex-1 bg-transparent text-right text-[11px] font-semibold text-[#ff8aa1] outline-none"
            >
              {VOICE_ENGINE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#141418] text-white">
                  {v.label} ({v.footprint})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMuted((m) => !m);
                if (!muted) {
                  try {
                    recogRef.current?.stop();
                  } catch {}
                  setListening(false);
                } else {
                  startMicLoop();
                }
              }}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                muted
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                  : "border-[#00f5ff]/50 bg-[#00f5ff]/15 text-[#00f5ff]"
              }`}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                stopNeuralSpeech();
                setSpeaking(false);
                startMicLoop();
              }}
              title="Interrupt & speak"
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-[#00f5ff]/50"
            >
              Interrupt
            </button>

            <button
              type="button"
              onClick={() => setWhisperMode((w) => !w)}
              aria-label="Toggle whisper voice mood"
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                whisperMode
                  ? "border-[#ff1e8e] bg-[#ff1e8e]/20 text-[#ff1e8e]"
                  : "border-white/15 bg-white/5 text-zinc-300"
              }`}
              title="Whisper mode"
            >
              {whisperMode ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                stopAll();
                onClose();
              }}
              aria-label="End Call"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.65)] hover:bg-rose-500"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
