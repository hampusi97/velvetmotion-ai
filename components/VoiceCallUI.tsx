"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/charactersTypes";
import { speak, stopSpeaking } from "@/lib/speech";
import { characterMediaUrl, joiSequenceFrames } from "@/lib/media";
import { generateCompanionReply } from "@/lib/chatRouter";
import { pushShort, memoryPromptBlock } from "@/lib/memoryTiers";
import { detectVoiceAction } from "@/lib/voiceCommands";
import { buildLorebookContext, loadLorebook } from "@/lib/lorebook";
import { bumpIntimacy, getIntimacy } from "@/lib/storage";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

type Props = {
  character: Character;
  onClose: () => void;
};

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function VoiceCallUI({ character, onClose }: Props) {
  const [live, setLive] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [micPaused, setMicPaused] = useState(false);
  const pausedRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState("Tap Start call");
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCamActive(false);
  };

  const toggleCamera = async () => {
    if (camActive) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCamActive(true);
      setVideoMode(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      setStatus("Camera permission denied or unavailable — continuing with companion video.");
      setVideoMode(true);
    }
  };

  useEffect(() => {
    if (camActive && localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [camActive, videoMode]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopSpeaking();
      stopCamera();
      try {
        audioRef.current?.pause();
        recogRef.current?.stop();
      } catch {
        /* */
      }
    };
  }, []);

  const append = (line: string) => setLog((L) => [...L.slice(-12), line]);

  const replyTo = async (userText: string) => {
    pushShort(character.id, "user", userText);
    append(`You: ${userText}`);
    setStatus("Connecting to your selected AI model…");
    try {
      // This is a static-export desktop/browser frontend. There are no
      // built-in /api/live-voice or /api/chat routes; use the same tested
      // user-selected model router as companion chat and voice calls.
      const result = await generateCompanionReply(
        [{ role: "user", text: userText }],
        {
          id: character.id,
          name: character.name,
          age: character.age,
          tagline: character.tagline,
          personality: character.personality,
          backstory: character.background,
          memoryBlock: [memoryPromptBlock(character.id), buildLorebookContext(loadLorebook(character.id), userText)]
            .filter(Boolean).join("\n"),
          relationshipLevel: getIntimacy(character.id, character.intimacy),
        },
      );
      if (result.providerUsed === "provider-unavailable" || result.providerUsed === "compliance-guard") {
        setStatus(result.text);
        append(result.text);
        setSpeaking(false);
        return;
      }
      const reply = result.text.replace(/\\*[^]*?\\*/g, " ").replace(/\\s+/g, " ").trim().slice(0, 350);
      if (!reply) {
        setStatus("The AI provider returned an empty reply. Check Settings and retry.");
        return;
      }
      pushShort(character.id, "assistant", reply);
      bumpIntimacy(character.id, 2);
      append(`${character.name.split(" ")[0]}: ${reply}`);
      setSpeaking(true);
      setStatus("Companion voice is playing…");
      speak(reply, { ...character.voice }, {
        onEnd: () => {
          setSpeaking(false);
          if (activeRef.current && !pausedRef.current) startListen();
          else setStatus("Call ended");
        },
      });
    } catch {
      setSpeaking(false);
      setStatus("Your AI model could not respond. Verify the chosen local or online provider.");
    }
  };

  const startListen = () => {
    if (!activeRef.current || pausedRef.current) return;
    const SR =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              SpeechRecognition?: SpeechRecognitionCtor;
              webkitSpeechRecognition?: SpeechRecognitionCtor;
            }
          ).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
            .webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setStatus("Speech recognition not supported in this browser — use Chrome/Edge.");
      return;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* */
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onstart = () => {
      setListening(true);
      setStatus("Listening… speak now");
    };
    recog.onend = () => {
      setListening(false);
    };
    recog.onerror = () => {
      setListening(false);
      if (activeRef.current) setStatus("Didn't catch that — tap mic or speak again");
    };
    recog.onresult = (ev: SpeechRecognitionResultEventLike) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (!text) return;
      const action = detectVoiceAction(text);
      if (action === "end-call") { endCall(); return; }
      if (action === "pause-listening") {
        pausedRef.current = true;
        setMicPaused(true);
        setStatus("Microphone paused. Tap Resume mic to continue.");
        recog.stop();
        return;
      }
      if (action) return;
      void replyTo(text);
    };
    recogRef.current = recog;
    try {
      recog.start();
    } catch {
      setStatus("Mic busy — try again");
    }
  };

  const startCall = () => {
    activeRef.current = true;
    pausedRef.current = false;
    setMicPaused(false);
    setLive(true);
    setLog([]);
    const hi =
      character.voiceIntro ||
      `Hey, it's ${character.name.split(" ")[0]}. I'm on the line. Talk to me.`;
    append(`${character.name.split(" ")[0]}: ${hi}`);
    setSpeaking(true);
    setStatus("Connecting…");
    speak(
      hi,
      { ...character.voice },
      {
        onEnd: () => {
          setSpeaking(false);
          if (activeRef.current) startListen();
        },
      },
    );
  };

  const endCall = () => {
    activeRef.current = false;
    pausedRef.current = false;
    setMicPaused(false);
    setLive(false);
    setListening(false);
    setSpeaking(false);
    stopSpeaking();
    stopCamera();
    try {
      audioRef.current?.pause();
      recogRef.current?.stop();
    } catch {
      /* */
    }
    setStatus("Call ended");
    onClose();
  };

  const frames = joiSequenceFrames(character);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-full flex justify-center">
            {videoMode ? (
              <div className="relative w-full aspect-[3/4] max-h-64 rounded-2xl overflow-hidden border-2 border-pink-500/50 bg-black">
                <MotionSequencePlayer frames={frames} alt={character.name} />
                {camActive && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-2 right-2 h-20 w-16 rounded-xl border border-white/30 object-cover bg-zinc-950"
                  />
                )}
              </div>
            ) : (
              <div
                className={`h-28 w-28 rounded-full overflow-hidden border-2 ${
                  speaking ? "border-pink-400 animate-pulse" : listening ? "border-emerald-400" : "border-white/20"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterMediaUrl(character, "beauty")}
                  alt={character.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {live && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600">
                {speaking ? "Speaking" : listening ? "Listening" : "…"}
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-lg text-cream">{character.name}</div>
            <div className="text-xs text-zinc-400">{status}</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVideoMode((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs border ${
                videoMode ? "border-pink-500 bg-pink-500/20 text-pink-200" : "border-white/15 text-zinc-400"
              }`}
            >
              {videoMode ? "🎬 Live video ON" : "🎬 Companion video"}
            </button>
            <button
              type="button"
              onClick={() => void toggleCamera()}
              className={`rounded-full px-3 py-1 text-xs border ${
                camActive ? "border-emerald-500 bg-emerald-500/20 text-emerald-200" : "border-white/15 text-zinc-400"
              }`}
            >
              {camActive ? "📷 My cam ON" : "📷 My cam (PiP)"}
            </button>
          </div>

          <div className="w-full max-h-28 overflow-y-auto text-left space-y-1 text-xs text-zinc-400 px-1">
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {!live ? (
              <button
                type="button"
                onClick={startCall}
                className="flex-1 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 font-semibold"
              >
                Start call
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={speaking}
                  onClick={() => {
                    if (micPaused) { pausedRef.current = false; setMicPaused(false); }
                    else if (listening) { pausedRef.current = true; setMicPaused(true); recogRef.current?.stop(); setStatus("Microphone paused."); return; }
                    startListen();
                  }}
                  className="flex-1 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 py-3 text-sm font-medium disabled:opacity-40"
                >
                  {micPaused ? "🎤 Resume mic" : listening ? "🔇 Pause mic" : "🎤 Talk"}
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="flex-1 rounded-2xl bg-red-600/90 py-3 text-sm font-semibold"
                >
                  End
                </button>
              </>
            )}
          </div>
          {!live && (
            <button type="button" onClick={onClose} className="text-xs text-zinc-500">
              Close
            </button>
          )}
          <p className="text-[10px] text-zinc-600">
            Voice chat uses optional browser speech recognition. Say “end call” or “stop listening” during a call; no voice commands run system programs.
          </p>
        </div>
      </div>
    </div>
  );
}

// Minimal types for browsers that expose webkit prefix
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}
