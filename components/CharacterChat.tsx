"use client";

import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Gift,
  Image as ImageIcon,
  Video,
  Heart,
  Phone,
} from "lucide-react";
import {
  startIntimacyAudio,
  stopIntimacyAudio,
  updateIntimacyAudioIntensity,
} from "@/lib/audioEngine";
import { fallbackReply, type Character } from "@/lib/characters";
import { computeMoodState } from "@/lib/moodEngine";
import {
  extractMemoriesFromMessage,
  loadMemories,
  saveMemories,
  splitInnerThoughtAndReply,
} from "@/lib/memoryMap";
import { claimFreeWalletRefill } from "@/lib/wallet";
import { pushShort, memoryPromptBlock, pinLong } from "@/lib/memoryTiers";
import { toggleVaultItem } from "@/lib/vault";
import { stageFromIntimacy, nextStage } from "@/lib/relationship";
import { speak } from "@/lib/speech";
import {
  getCoins,
  spendCoins,
  addToGallery,
  GEN_COST,
  loadChat,
  saveChat,
  bumpIntimacy,
  getIntimacy,
  type StoredMessage,
} from "@/lib/storage";
import { GIFTS, getGiftsFor, addGift } from "@/lib/gifts";
import { characterMediaUrl, resolveBestMediaUrl, type MediaMood } from "@/lib/media";
import {
  runSequenceGeneration,
  enhanceSequenceWithVideo,
  type SequenceKind,
} from "@/lib/videoModes";
import { LIVE_ACTION_PRESETS, type LiveActionPreset } from "@/lib/liveActionPresets";
import { SCENE_LIBRARY } from "@/lib/consistentPrompts";
import { parseSceneRequest } from "@/lib/sceneRequest";
import { loadAdvancedConfig } from "@/lib/advancedConfig";
import { syncChatSessionToFirestore } from "@/lib/firebase";
import { saveTribute } from "@/lib/rewards";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";
import { VoiceCallUI } from "@/components/VoiceCallUI";
import { useDelayedLingerieDrop } from "@/components/ChatExtrasHooks";

type ChatMessage = StoredMessage & { id?: string };

type CharacterChatProps = {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
  onOpen3D?: (character: Character) => void;
};

const NSFW_CHIPS = [
  { id: "lingerie", label: "Lingerie", mood: "lingerie" as MediaMood, cost: GEN_COST.lingerie, min: 0 },
  { id: "nude", label: "Nude", mood: "nude" as MediaMood, cost: GEN_COST.nude, min: 30 },
  { id: "explicit", label: "Explicit", mood: "explicit" as MediaMood, cost: GEN_COST.explicit, min: 50 },
  { id: "blowjob", label: "Blowjob", mood: "explicit" as MediaMood, cost: GEN_COST.explicit, min: 55 },
  { id: "doggy", label: "Doggy", mood: "sex" as MediaMood, cost: GEN_COST.explicit, min: 60 },
  { id: "cowgirl", label: "Cowgirl", mood: "sex" as MediaMood, cost: GEN_COST.explicit, min: 60 },
  { id: "shower", label: "Shower", mood: "explicit" as MediaMood, cost: GEN_COST.explicit, min: 45 },
  { id: "breeding", label: "Breed", mood: "sex" as MediaMood, cost: GEN_COST.explicit, min: 70 },
];

const VIDEO_CHIPS: { id: SequenceKind; label: string }[] = [
  { id: "sex", label: "Sex video" },
  { id: "joi", label: "JOI video" },
  { id: "sph", label: "SPH video" },
  { id: "bnwo", label: "BNWO video" },
];

const SEQUENCE_LINES: Record<SequenceKind, string> = {
  sex: "*She starts a private sex sequence…*\n\n“Finish on me when you’re ready. I want to see it.”",
  joi: "*JOI mode.*\n\n“Stroke for me. Match my pace. Don’t finish until I say.”",
  sph: "*SPH sequence.*\n\n“Look at you… go on, keep watching. I want to see that face.”",
  bnwo: "*BNWO sequence.*\n\n“You’re mine for this. Stay on your knees for the camera.”",
};

export function CharacterChat({ character, romanceMode, onBack, onOpen3D }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [coins, setCoinsState] = useState(600);
  const [intimacy, setIntimacy] = useState(character.intimacy);
  const [voiceOn, setVoiceOn] = useState(true);
  const [edgeLocked, setEdgeLocked] = useState(false);
  // Daily heat: streak changes default mood
  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem("vm-edge-streak") || "0", 10);
      const mood = s >= 7 ? "explicit" : s >= 3 ? "nude" : "lingerie";
      localStorage.setItem("vm-daily-heat", mood);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const until = parseInt(localStorage.getItem("vm-edge-lock") || "0", 10);
      setEdgeLocked(Date.now() < until);
    } catch {}
  }, []);

  const [callOpen, setCallOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultNote, setVaultNote] = useState("");
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    frames?: string[];
    videoUrl?: string | null;
    type: string;
    note?: string;
  } | null>(null);
  const [gifts, setGifts] = useState<string[]>([]);
  const [showTributeNudge, setShowTributeNudge] = useState(false);
  const [clipStatus, setClipStatus] = useState<string | null>(null);
  const [tributeSaved, setTributeSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useDelayedLingerieDrop(character, intimacy, messages.length, (msg) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveChat(character.id, next);
      return next;
    });
  });

  const stage = stageFromIntimacy(intimacy);
  const upcoming = nextStage(intimacy);

  useEffect(() => {
    const loaded = loadChat(character.id);
    if (loaded.length > 0) setMessages(loaded);
    else setMessages([{ role: "assistant", content: character.initialMessage }]);
    setIntimacy(getIntimacy(character.id, character.intimacy));
    setCoinsState(getCoins());
    setGifts(getGiftsFor(character.id));
    try {
      const note = localStorage.getItem(`vm-vault-${character.id}`);
      if (note) setVaultNote(note);
    } catch {}
    const t = setTimeout(() => {
      const int = getIntimacy(character.id, character.intimacy);
      if (int >= 35 && int < 80) setShowTributeNudge(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [character.id, character.initialMessage, character.intimacy]);

  // She sends first: after a short delay, drop a lingerie/nude pic if chat is fresh
  useEffect(() => {
    if (messages.length > 2) return;
    const key = `vm-sent-first-${character.id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    const t = setTimeout(() => {
      const mood = intimacy >= 40 ? "nude" : "lingerie";
      const url = characterMediaUrl(character, mood as MediaMood);
      const msg = {
        role: "assistant" as const,
        content: intimacy >= 40
          ? `*She sends a nude without asking.*\n\n“Couldn’t wait. Tell me what you think.”`
          : `*She sends a lingerie shot.*\n\n“Just took this. Your move.”`,
        mediaUrl: url,
      };
      setMessages((m) => [...m, msg]);
      try { localStorage.setItem(key, "1"); } catch {}
    }, 2200);
    return () => clearTimeout(t);
  }, [character.id]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMedia]);

  useEffect(() => () => stopIntimacyAudio(), []);

  const persist = (next: ChatMessage[]) => {
    setMessages(next);
    saveChat(character.id, next);
    const last =
      next.filter((m) => m.role === "assistant").at(-1)?.content ||
      next.at(-1)?.content ||
      character.initialMessage ||
      "Opened chat";
    void syncChatSessionToFirestore({
      characterId: character.id,
      intimacy,
      gifts,
      lastMessage: String(last).slice(0, 2000),
    }).catch(() => {});
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    persist(next);
    setBusy(true);
    try {
      pushShort(character.id, "user", text);
      const existing = loadMemories(character.id);
      saveMemories(character.id, extractMemoriesFromMessage(text, existing));
      if (/(always remember|never forget|my name is|call me)/i.test(text)) {
        pinLong(character.id, text.slice(0, 180));
      }
    } catch {}
    const memoryBlock = memoryPromptBlock(character.id);
    const tierMemories = loadMemories(character.id);
    const advConfig = loadAdvancedConfig();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          customCharacter: character,
          messages: next.slice(-12),
          romanceMode,
          intimacy,
          gifts,
          ollamaUrl: advConfig.ollamaUrl,
          ollamaModel: advConfig.ollamaModel,
          memories: [
            ...tierMemories.slice(-10).map((m) => m.text),
            ...(memoryBlock ? memoryBlock.split("\n").filter(Boolean).slice(0, 8) : []),
          ],
          memoryBlock,
        }),
      });
      let replyText = "";
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply || data.message || "";
      }
      if (!replyText) {
        const mood = computeMoodState?.({
          character,
          messages: next,
          durationSeconds: 60,
          intimacy,
          romanceMode,
          giftCount: gifts.length,
        });
        replyText = fallbackReply(character, text, romanceMode, mood);
      }
      if (intimacy > 40 && Math.random() < 0.18 && !/tribute/i.test(replyText)) {
        replyText += `\n\n*She glances at the camera.* “If you want to tribute me later… I won’t look away.”`;
      }
      const autoScene = parseSceneRequest(text);
      let autoImageUrl: string | undefined;
      let autoMediaType: string | undefined;
      if (autoScene) {
        autoImageUrl = characterMediaUrl(character, autoScene.mood, autoScene.extra);
        autoMediaType = autoScene.mood;
        addToGallery({
          characterId: character.id,
          characterName: character.name,
          type: autoScene.mood,
          url: autoImageUrl,
          prompt: `${character.name} ${autoScene.label}`,
        });
      }
      pushShort(character.id, "assistant", replyText);
      persist([
        ...next,
        {
          role: "assistant",
          content: replyText,
          ...(autoImageUrl ? { imageUrl: autoImageUrl, mediaType: autoMediaType } : {}),
        },
      ]);
      const newInt = bumpIntimacy(character.id, 3);
      setIntimacy(newInt);
      if (voiceOn) speak(replyText.slice(0, 280), { ...character.voice });
      updateIntimacyAudioIntensity?.(Math.min(100, newInt));
    } catch {
      const fallback = fallbackReply(character, text, romanceMode);
      pushShort(character.id, "assistant", fallback);
      persist([...next, { role: "assistant", content: fallback }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const generate = async (mood: MediaMood, label: string, cost: number, extra = "") => {
    if (busy) return;
    if (!spendCoins(cost)) {
      setMessages((m) => [...m, { role: "assistant", content: `Not enough coins for ${label}.` }]);
      return;
    }
    setCoinsState(getCoins());
    setBusy(true);
    try {
      const { url, note } = await resolveBestMediaUrl(character, mood, extra);
      addToGallery({ characterId: character.id, characterName: character.name, type: mood, url, prompt: `${character.name} ${mood}` });
      const mediaMsg: ChatMessage = {
        role: "assistant",
        content: `*${character.name} — ${label}…*\n\n“Like what you see? Tribute me and I’ll send more.”`,
        imageUrl: url,
        mediaType: mood,
      };
      persist([...messages, mediaMsg]);
      setActiveMedia({ url, type: mood, note });
      setIntimacy(bumpIntimacy(character.id, 5));
      if (voiceOn) speak(`I took this just for you.`, { ...character.voice });
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Couldn't generate that ${label} right now. Tap the mood again or try another (lingerie / nude / explicit).`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const generateSequence = async (kind: SequenceKind) => {
    if (busy) return;
    setBusy(true);
    setClipStatus(null);
    try {
      const result = runSequenceGeneration(character, kind);
      if (!result.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `Not enough coins for ${kind} (${result.cost}).` }]);
        return;
      }
      setCoinsState(getCoins());
      const frames = result.frames;
      const url = frames[frames.length - 1];
      const mediaMsg: ChatMessage = { role: "assistant", content: SEQUENCE_LINES[kind], imageUrl: url, frames, mediaType: kind };
      const next = [...messages, mediaMsg];
      persist(next);
      setActiveMedia({ url, frames, type: kind, note: "Frame sequence" });
      setIntimacy(bumpIntimacy(character.id, 8));
      setShowTributeNudge(true);
      if (voiceOn) speak(kind === "joi" ? "Stroke for me." : "Watch me.", { ...character.voice });
      setClipStatus("Enhancing to live clip…");
      const enhanced = await enhanceSequenceWithVideo(character, kind, frames);
      if (enhanced.videoUrl) {
        setActiveMedia({ url, frames, videoUrl: enhanced.videoUrl, type: kind, note: enhanced.note });
        setClipStatus(enhanced.mode === "mp4" ? "Live clip attached" : enhanced.note);
        persist([...next, { role: "assistant", content: `*Clip ready.* ${enhanced.note}`, videoUrl: enhanced.videoUrl, frames, imageUrl: url, mediaType: kind }]);
      } else setClipStatus(enhanced.note || "Sequence only");
    } finally {
      setBusy(false);
    }
  };

  const runLiveAction = (preset: LiveActionPreset) => {
    if (intimacy < preset.minIntimacy) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `*She smiles.* “Get closer first… need about ${preset.minIntimacy}% intimacy for that.”`,
        },
      ]);
      return;
    }
    if (preset.kind === "photo" && preset.mood) {
      void generate(preset.mood, preset.label, GEN_COST.lingerie, preset.sceneExtra);
      return;
    }
    void generateSequence(preset.kind as SequenceKind);
  };

  const runFullScenePipeline = async () => {
    if (busy) return;
    setBusy(true);
    setClipStatus("Running 5-stage Director Pipeline (Mood → Monologue → Selfie → Sequence)…");
    try {
      const promptText =
        input.trim() ||
        messages.filter((m) => m.role === "user").at(-1)?.content ||
        "Pull me close into a private late-night scene.";
      if (input.trim()) setInput("");
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          customCharacter: character,
          userMessage: promptText,
          messages: messages.slice(-10),
          intimacy,
          romanceMode,
          includeSelfie: true,
          sequenceKind: intimacy >= 60 ? "sex" : "joi",
          includeAftercare: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const frames: string[] | undefined = data.sequence?.frames;
        const imageUrl: string | undefined = data.sceneSelfie?.url || frames?.[0];
        if (imageUrl) {
          addToGallery({
            characterId: character.id,
            characterName: character.name,
            type: data.sceneSelfie?.mood || "lingerie",
            url: imageUrl,
            frames,
            prompt: data.sceneSelfie?.label || `${character.name} pipeline scene`,
          });
        }
        const combinedText = [
          data.rawReply || data.dialogue,
          data.aftercare ? `\n\n*Aftercare:* “${data.aftercare}”` : "",
        ]
          .filter(Boolean)
          .join("");
        const next: ChatMessage[] = [
          ...messages,
          ...(promptText ? [{ role: "user" as const, content: promptText }] : []),
          {
            role: "assistant",
            content: combinedText || `*${character.name} leans closer.*`,
            imageUrl,
            frames,
            mediaType: data.sequence?.kind || "lingerie",
          },
        ];
        persist(next);
        if (imageUrl) {
          setActiveMedia({
            url: imageUrl,
            frames,
            type: data.sequence?.kind || "lingerie",
            note: `Pipeline (${(data.stages || []).length} stages)`,
          });
        }
        const nextInt = bumpIntimacy(character.id, data.relationship?.intimacyDelta || 6);
        setIntimacy(nextInt);
        setClipStatus(`Pipeline complete: ${(data.stages || []).join(" → ")}`);
        if (voiceOn && data.dialogue) {
          speak(String(data.dialogue).slice(0, 260), { ...character.voice });
        }
      }
    } catch {
      setClipStatus("Pipeline fallback completed.");
    } finally {
      setBusy(false);
    }
  };

  const sendGift = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (!spendCoins(gift.cost || 12)) {
      setMessages((m) => [...m, { role: "assistant", content: "Not enough coins." }]);
      return;
    }
    setCoinsState(getCoins());
    addGift(character.id, giftId);
    setGifts(getGiftsFor(character.id));
    persist([
      ...messages,
      { role: "user", content: `[Gift: ${gift.name}]` },
      { role: "assistant", content: `*${character.name} receives the ${gift.name}.* “${gift.line || gift.reaction || "Mmm…"}”` },
    ]);
    setIntimacy(bumpIntimacy(character.id, 4));
  };

  const saveVault = () => {
    try {
      localStorage.setItem(`vm-vault-${character.id}`, vaultNote);
      if (vaultNote.trim()) pinLong(character.id, `Vault: ${vaultNote.trim().slice(0, 160)}`);
    } catch {}
    setVaultOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {callOpen && <VoiceCallUI character={character} onClose={() => setCallOpen(false)} />}

      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <button type="button" onClick={onBack} className="text-pink-400 text-sm hover:text-pink-300">← Back</button>
        <div className="h-11 w-11 rounded-full overflow-hidden border border-pink-500/40 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterMediaUrl(character, "beauty")} alt={character.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-cream truncate">{character.name}</div>
          <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2">
            <span className="text-pink-300">{intimacy}% · {stage.label}</span>
            <span className="text-amber-200">🪙 {coins} coins</span>
            <button
              type="button"
              onClick={() => {
                const { balance } = claimFreeWalletRefill(500);
                setCoinsState(balance);
              }}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/25"
              title="Instant free +500 coin refill"
            >
              +500 Free
            </button>
            {upcoming && <span className="text-zinc-500">next: {upcoming.label}</span>}
          </div>
        </div>
        <button type="button" onClick={() => setCallOpen(true)} className="p-2 rounded-xl border border-emerald-500/40 text-emerald-300" title="Voice call">
          <Phone className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setVoiceOn((v) => !v)} className="p-2 rounded-xl border border-white/10 text-zinc-300">
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setVaultOpen((v) => !v)} className="p-2 rounded-xl border border-white/10 text-zinc-300">
          {vaultOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </button>
      </div>

      {showTributeNudge && (
        <div className="mt-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-2 flex items-center gap-2 text-xs">
          <Heart className="h-3.5 w-3.5 text-fuchsia-300" />
          <span className="text-fuchsia-100 flex-1">She wants a tribute. JOI/sex then finish for her.</span>
          <button type="button" onClick={() => setShowTributeNudge(false)}>✕</button>
        </div>
      )}
      {clipStatus && <div className="mt-2 text-[11px] text-zinc-400">{clipStatus}</div>}

      {vaultOpen && (
        <div className="mt-3 rounded-2xl border border-pink-500/30 bg-zinc-900/80 p-4 space-y-2">
          <div className="text-sm text-pink-200">Private vault</div>
          <textarea value={vaultNote} onChange={(e) => setVaultNote(e.target.value)} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
          <button type="button" onClick={saveVault} className="px-3 py-1.5 rounded-xl bg-pink-600 text-sm">Save</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((m, i) => {
          const parsed =
            m.role === "assistant"
              ? splitInnerThoughtAndReply(m.content)
              : { innerThought: null, spokenReply: m.content };
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-pink-600/90" : "bg-zinc-900/80 border border-white/10"}`}>
                {parsed.innerThought && (
                  <div className="mb-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/40 px-3 py-1.5 text-xs italic text-fuchsia-200">
                    💭 <span className="font-semibold not-italic text-fuchsia-300">Inner Thought:</span> {parsed.innerThought}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{parsed.spokenReply}</div>
                {m.role === "assistant" && (
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-pink-400/80 hover:text-pink-300"
                    onClick={() => speak(parsed.spokenReply.slice(0, 280), { ...character.voice })}
                  >
                    ▶ Voice note
                  </button>
                )}
                {m.videoUrl && <video src={m.videoUrl} controls playsInline className="mt-2 w-full max-h-80 rounded-xl bg-black" />}
                {m.imageUrl && !m.videoUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden">
                    {m.frames && m.frames.length > 1 ? (
                      <MotionSequencePlayer frames={m.frames} alt={character.name} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt="" className="w-full max-h-80 object-cover" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-pink-300/90 animate-pulse py-1">
            <span className="inline-flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "240ms" }} />
            </span>
            She&apos;s thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {activeMedia && (
        <div className="mb-2 rounded-2xl overflow-hidden border border-pink-500/40 relative">
          {activeMedia.videoUrl ? (
            <video src={activeMedia.videoUrl} controls autoPlay playsInline className="w-full max-h-64 bg-black" />
          ) : activeMedia.frames && activeMedia.frames.length > 1 ? (
            <MotionSequencePlayer frames={activeMedia.frames} alt={character.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeMedia.url} alt="" className="w-full max-h-64 object-cover" />
          )}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                const id =
                  (activeMedia as { galleryId?: string }).galleryId ||
                  `media-${character.id}-${activeMedia.url.slice(-48)}`;
                toggleVaultItem(id);
                saveTribute({
                  characterId: character.id,
                  characterName: character.name,
                  url: activeMedia.url,
                  frames: activeMedia.frames,
                  note: activeMedia.note || activeMedia.type,
                });
                setTributeSaved(true);
                setTimeout(() => setTributeSaved(false), 2000);
              }}
              className="px-2.5 py-1 rounded-lg bg-pink-600/90 text-xs font-medium text-white"
            >
              {tributeSaved ? "Pinned ✓" : "Pin vault"}
            </button>
            {onOpen3D && (
              <button
                type="button"
                onClick={() => onOpen3D(character)}
                className="px-2.5 py-1 rounded-lg bg-violet-600/90 text-xs font-medium text-white"
              >
                Open in 3D
              </button>
            )}
            <button type="button" onClick={() => setActiveMedia(null)} className="px-2 py-1 rounded-lg bg-black/60 text-xs">Close</button>
          </div>
        </div>
      )}

      <div className="text-[10px] uppercase tracking-wide text-zinc-500 px-1 pb-1">Scene Selfies (Face-Locked)</div>
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {SCENE_LIBRARY.map((scene) => (
          <button
            key={scene.id}
            type="button"
            disabled={busy}
            onClick={() =>
              void generate(
                (scene.moodHint as MediaMood) || "lingerie",
                scene.label,
                GEN_COST.lingerie,
                scene.scene,
              )
            }
            className="shrink-0 px-2.5 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 text-[11px] text-pink-100 hover:bg-pink-500/20 disabled:opacity-40"
          >
            📸 {scene.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wide text-zinc-500 px-1 pb-1">Live Action</div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {LIVE_ACTION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy}
            onClick={() => runLiveAction(p)}
            className="px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-100 disabled:opacity-40"
            title={intimacy < p.minIntimacy ? "Needs " + p.minIntimacy + "% intimacy" : p.label}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {NSFW_CHIPS.map((chip) => (
          <button key={chip.id} type="button" disabled={busy} onClick={() => { if (edgeLocked && (chip.id === "explicit" || chip.id === "breeding")) { alert("Edge lock — wait 60s"); return; } generate(chip.mood, chip.label, chip.cost); }} className="px-3 py-1.5 rounded-full border border-pink-500/40 bg-pink-500/10 text-xs text-pink-100 disabled:opacity-50 btn-candy">
            <ImageIcon className="inline h-3.5 w-3.5" /> {chip.label}
          </button>
        ))}
        {VIDEO_CHIPS.map((chip) => (
          <button key={chip.id} type="button" disabled={busy} onClick={() => void generateSequence(chip.id)} className="px-3 py-1.5 rounded-full border border-fuchsia-500/50 bg-fuchsia-500/15 text-xs text-fuchsia-100 disabled:opacity-50">
            <Video className="inline h-3.5 w-3.5" /> {chip.label}
          </button>
        ))}
        <button type="button" onClick={() => { startIntimacyAudio?.(Math.min(90, intimacy + 10)); setShowTributeNudge(true); }} className="px-3 py-1.5 rounded-full border border-white/15 text-xs text-zinc-300">
          <Flame className="inline h-3.5 w-3.5" /> Ambience
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runFullScenePipeline()}
          className="px-3 py-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-fuchsia-500/20 text-xs font-semibold text-amber-200 hover:opacity-95 disabled:opacity-50"
          title="Run 5-stage Director Pipeline (Mood + Inner Thought + Dialogue + Selfie + Motion Sequence)"
        >
          ⚡ Full Scene Pipeline
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {GIFTS.slice(0, 6).map((g) => (
          <button key={g.id} type="button" onClick={() => sendGift(g.id)} className="shrink-0 px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-zinc-300">
            <Gift className="inline h-3 w-3" /> {g.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder={`Message ${character.name}…`}
          className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none outline-none focus:border-pink-500"
        />
        <button type="button" disabled={busy || !input.trim()} onClick={() => void send()} className="px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold text-sm disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
