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
import { VrmAvatarViewer } from "@/components/VrmAvatarViewer";
import { saveVrmAvatar, removeVrmAvatar } from "@/lib/vrmAvatarStore";
import { safeCompanionAvatarUrl } from "@/lib/avatarOptimize";
import { buildLorebookContext, loadLorebook } from "@/lib/lorebook";
import { memoryPromptBlock } from "@/lib/memoryTiers";
import { detectVoiceAction } from "@/lib/voiceCommands";

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
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  abort: () => void;
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
  const [status, setStatus] = useState("");
  const [thinking, setThinking] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const endButtonRef = useRef<HTMLButtonElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [whisperMode, setWhisperMode] = useState(() => getTimeMood().whisperBias);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [vrmMode, setVrmMode] = useState(false);
  const [vrmRevision, setVrmRevision] = useState(0);
  const [vrmBusy, setVrmBusy] = useState(false);
  const [vrmNotice, setVrmNotice] = useState("");
  const vrmFileRef = useRef<HTMLInputElement | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string>(character.voiceIntro || `Hey... I'm right here.`);
  const [engineUsed, setEngineUsed] = useState<string>("Kokoro / WebSpeech");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineId>(() => getPreferredVoiceEngine());

  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const turnRef = useRef(0);
  const busyRef = useRef(false);
  const mutedRef = useRef(muted);
  const whisperRef = useRef(whisperMode);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: character.voiceIntro || character.initialMessage },
  ]);

  const importAvatar = async (file?: File) => {
    if (!file) return;
    setVrmBusy(true);
    try {
      const info = await saveVrmAvatar(character.id, file);
      setVrmRevision(value=>value+1);
      setVrmMode(true);
      setVrmNotice(`Locally saved VRM ${info.version === 1 ? "1.0" : "0.x"} preview model.`);
    } catch (error) {
      setVrmNotice(error instanceof Error ? error.message : "Could not import VRM avatar.");
    } finally {
      if (vrmFileRef.current) vrmFileRef.current.value = "";
      setVrmBusy(false);
    }
  };
  const deleteAvatar = async () => {
    try {
      await removeVrmAvatar(character.id);
      setVrmMode(false);
      setVrmRevision(value=>value+1);
      setVrmNotice("3D avatar removed from this browser.");
    } catch (error) { setVrmNotice(error instanceof Error ? error.message : "Cannot remove VRM avatar."); }
  };

  const stopMic = useCallback(() => {
    const rec = recogRef.current;
    recogRef.current = null;
    setListening(false);
    try {
      rec?.abort();
    } catch {
      // The browser may already have ended recognition.
    }
  }, []);

  const cancelTurn = useCallback(() => {
    turnRef.current += 1;
    busyRef.current = false;
    stopMic();
    stopNeuralSpeech();
    setThinking(false);
    setSpeaking(false);
  }, [stopMic]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    cancelTurn();
    onClose();
  }, [cancelTurn, onClose]);

  const startMicLoop = useCallback(function listen() {
    if (!activeRef.current || mutedRef.current || busyRef.current || recogRef.current) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("Speech recognition is unavailable here. You can return to text chat.");
      return;
    }
    setStatus("Starting microphone…");
    try {
      const rec = new Ctor();
      recogRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      const ownsMic = () => recogRef.current === rec && activeRef.current;
      rec.onstart = () => {
        if (!ownsMic()) return;
        setListening(true);
        setStatus("");
      };
      rec.onerror = ({ error }) => {
        if (!ownsMic()) return;
        stopMic();
        setStatus(
          error === "not-allowed" || error === "service-not-allowed"
            ? "Microphone access was denied. Check permissions, then retry."
            : "Speech recognition stopped. Retry the microphone when you're ready.",
        );
      };
      rec.onend = () => {
        if (!ownsMic()) return;
        recogRef.current = null;
        setListening(false);
        setStatus("No speech captured. Retry the microphone when you're ready.");
      };
      rec.onresult = async ({ results }) => {
        if (!ownsMic() || mutedRef.current) return;
        const result = results[results.length - 1];
        const spoken = result?.[0]?.transcript?.trim();
        if (!spoken || result.isFinal === false) return;
        stopMic();

        const action = detectVoiceAction(spoken);
        if (action === "end-call") {
          endCall();
          return;
        }
        if (action === "pause-listening") {
          mutedRef.current = true;
          setMuted(true);
          setStatus("");
          return;
        }
        if (action === "resume-listening") {
          listen();
          return;
        }

        const turn = ++turnRef.current;
        const current = () => activeRef.current && turn === turnRef.current;
        const userMessage = { role: "user" as const, text: spoken };
        busyRef.current = true;
        setStatus("");
        setThinking(true);
        setTranscript(`You: “${spoken}”`);
        let listenAgain = false;
        try {
          const reply = await generateCompanionReply([...historyRef.current, userMessage], {
            id: character.id,
            name: character.name,
            age: character.age,
            tagline: character.tagline,
            personality: character.personality,
            backstory: character.background,
            memoryBlock: [
              memoryPromptBlock(character.id),
              buildLorebookContext(loadLorebook(character.id), spoken),
            ].filter(Boolean).join("\n"),
          });
          if (!current()) return;
          if (reply.providerUsed === "compliance-guard") {
            setStatus(reply.text);
            return;
          }
          if (reply.providerUsed === "in-character-fallback") {
            setStatus("The AI model isn't responding. Check your provider, then retry the microphone.");
            return;
          }

          historyRef.current.push(userMessage, { role: "assistant", text: reply.text });
          setTranscript(reply.text);
          earnCompanionXp(character.id, 6);
          setThinking(false);
          setSpeaking(true);
          const tts = await speakWithNeuralVoice(reply.text, {
            voiceId: character.voiceId,
            whispery: whisperRef.current,
            pitch: character.voice?.pitch,
            rate: character.voice?.rate,
          });
          if (!current()) return;
          setEngineUsed(tts.label);
          listenAgain = true;
        } catch {
          if (current()) setStatus("The call could not complete this turn. Retry the microphone.");
        } finally {
          if (current()) {
            busyRef.current = false;
            setThinking(false);
            setSpeaking(false);
            if (listenAgain) listen();
          }
        }
      };
      rec.start();
    } catch {
      stopMic();
      setStatus("Couldn't start the microphone. Check permissions and retry.");
    }
  }, [character, endCall, stopMic]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    endButtonRef.current?.focus({ preventScroll: true });
    activeRef.current = true;
    mutedRef.current = false;
    setMuted(false);
    setStatus("");
    setElapsed(0);
    setEngineUsed("Starting voice…");
    const greeting = character.voiceIntro || character.initialMessage || "Hey, glad you called.";
    setTranscript(greeting);
    historyRef.current = [{ role: "assistant", text: greeting }];
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    const turn = ++turnRef.current;
    busyRef.current = true;
    setSpeaking(true);

    void (async () => {
      const current = () => activeRef.current && turn === turnRef.current;
      try {
        const result = await speakWithNeuralVoice(greeting, {
          voiceId: character.voiceId,
          whispery: whisperRef.current,
        });
        if (current()) setEngineUsed(result.label);
      } catch {
        if (current()) setEngineUsed("Voice unavailable");
      } finally {
        if (current()) {
          busyRef.current = false;
          setSpeaking(false);
          startMicLoop();
        }
      }
    })();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        endCall();
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not(:disabled), select:not(:disabled), a[href], input:not(:disabled)",
      )).filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      const focused = document.activeElement;
      if (!dialog.contains(focused) || focused === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener("vm:boss-key-mute", endCall);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vm:boss-key-mute", endCall);
      document.removeEventListener("keydown", onKeyDown);
      activeRef.current = false;
      cancelTurn();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [character, endCall, open, startMicLoop, cancelTurn]);

  if (!open) return null;

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div ref={dialogRef} role="dialog" aria-label={`Voice call with ${character.name}`} aria-modal="true" className="fixed inset-0 z-[80] overflow-y-auto bg-black/90 p-4 backdrop-blur-xl">
      <div className="mx-auto my-4 w-full max-w-sm neon-border-sweep">
        <div className="neon-sweep-inner p-6 text-center space-y-5">
          <div className="flex items-center justify-between text-[11px] text-[#a6a6c4]">
            <span className="inline-flex items-center gap-1.5 text-[#00ffa3] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#00ffa3] animate-pulse" />
              {mins}:{secs}
            </span>
            <span className="rounded-full border border-[#00f5ff]/35 bg-[#00f5ff]/10 px-2.5 py-0.5 text-[#00f5ff]">
              {engineUsed}
            </span>
          </div>

          {/* Optional locally stored 3D VRM avatar for the active chat call. */}
          {vrmMode ? (
            <div className="relative mx-auto h-64 w-full max-w-[240px] overflow-hidden rounded-2xl border border-violet-300/40">
              <VrmAvatarViewer characterId={character.id} revision={vrmRevision} speaking={speaking} listening={listening} />
            </div>
          ) : (
            <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
              <span className={`absolute inset-0 rounded-full border-2 ${speaking
                  ? "border-[#ff1e8e] shadow-[0_0_32px_rgba(255,30,142,0.85)] animate-ping"
                  : listening ? "border-[#00f5ff] shadow-[0_0_26px_rgba(0,245,255,0.7)] animate-pulse" : "border-white/20"
                }`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeCompanionAvatarUrl(character.avatar) || staticPortraitUrl(character.id)}
                alt={character.name}
                className="relative h-28 w-28 rounded-full object-cover object-top ring-2 ring-[#ff1e8e]/70" />
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" aria-pressed={vrmMode} onClick={() => setVrmMode(value=>!value)}
              className={`rounded-xl border px-3 py-1.5 text-xs ${vrmMode
                ? "border-violet-300/60 bg-violet-600/20 text-violet-100"
                : "border-white/20 text-zinc-300"}`}>
              {vrmMode ? "3D preview ON" : "3D avatar"}
            </button>
            <input ref={vrmFileRef} type="file" accept=".vrm,model/gltf-binary"
              className="hidden" aria-label="Select a VRM avatar"
              onChange={e => { void importAvatar(e.target.files?.[0]); }} />
            <button type="button" disabled={vrmBusy} onClick={() => vrmFileRef.current?.click()}
              className="rounded-xl border border-white/20 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50">
              {vrmBusy ? "Saving avatar…" : "Import .vrm"}
            </button>
            {vrmMode && <button type="button" onClick={() => void deleteAvatar()}
              className="rounded-xl border border-white/20 px-3 py-1.5 text-xs text-zinc-300">
              Remove avatar
            </button>}
          </div>
          {vrmNotice && <p role="status" className="text-[11px] text-violet-200">{vrmNotice}</p>}

          <div>
            <h2 className="text-xl font-extrabold text-[#f7f7fc]">{character.name}</h2>
            <p className="text-xs text-[#00f5ff] mt-0.5">
              {thinking ? "Waiting for AI…" : speaking ? "Speaking…" : listening ? "Listening…" : muted ? "Microphone muted" : "Microphone idle"}
            </p>
          </div>

          <div className="min-h-[3.5rem] rounded-2xl border border-white/10 bg-[#05050a]/80 p-3 text-xs text-[#f7f7fc] leading-relaxed">
            {transcript}
          </div>
          {status && <p role="status" className="text-xs text-amber-200">{status}</p>}
          <p className="text-xs text-zinc-400">
            Your browser handles speech recognition and may use an online service.
          </p>

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
                const nextMuted = !mutedRef.current;
                mutedRef.current = nextMuted;
                setMuted(nextMuted);
                if (nextMuted) {
                  stopMic();
                  setStatus("");
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
                if (busyRef.current) cancelTurn();
                startMicLoop();
              }}
              disabled={muted || listening}
              title="Start listening or interrupt the current turn"
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-[#00f5ff]/50 disabled:opacity-40"
            >
              {thinking || speaking ? "Interrupt" : "Retry mic"}
            </button>

            <button
              type="button"
              onClick={() => {
                whisperRef.current = !whisperRef.current;
                setWhisperMode(whisperRef.current);
              }}
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
              ref={endButtonRef}
              onClick={endCall}
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
