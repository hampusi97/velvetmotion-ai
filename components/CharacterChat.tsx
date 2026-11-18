"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Music,
  Upload,
  Film,
  Sparkles,
  Brain,
  Shirt,
  MapPin,
  Camera,
  RotateCcw,
  Flame,
  Pencil,
  Check,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Gift,
  Heart,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import {
  startIntimacyAudio,
  stopIntimacyAudio,
  updateIntimacyAudioIntensity,
} from "@/lib/audioEngine";
import { fallbackReply, CHARACTERS, type Character } from "@/lib/characters";
import { computeMoodState } from "@/lib/moodEngine";
import {
  WARDROBE_OPTIONS,
  SCENE_LOCATIONS,
  extractMemoriesFromMessage,
  buildInnerMonologue,
  loadMemories,
  saveMemories,
  loadRoleplayContext,
  saveRoleplayContext,
  type MemoryNode,
  type MemoryCategory,
} from "@/lib/memoryMap";
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
import { characterMediaUrl, type MediaMood } from "@/lib/media";
import { syncChatSessionToFirestore } from "@/lib/firebase";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

type ChatMessage = StoredMessage & { id?: string };

type CharacterChatProps = {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
};

const NSFW_CHIPS = [
  { id: "lingerie", label: "Lingerie", mood: "lingerie" as MediaMood, cost: GEN_COST.lingerie },
  { id: "nude", label: "Nude", mood: "nude" as MediaMood, cost: GEN_COST.nude },
  { id: "explicit", label: "Explicit", mood: "explicit" as MediaMood, cost: GEN_COST.explicit },
  { id: "sex", label: "Sex sequence", mood: "sex" as MediaMood, cost: GEN_COST.video },
];

export function CharacterChat({ character, romanceMode, onBack }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [coins, setCoinsState] = useState(600);
  const [intimacy, setIntimacy] = useState(character.intimacy);
  const [voiceOn, setVoiceOn] = useState(true);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultNote, setVaultNote] = useState("");
  const [activeMedia, setActiveMedia] = useState<{ url: string; frames?: string[]; type: string } | null>(null);
  const [gifts, setGifts] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loaded = loadChat(character.id);
    if (loaded.length > 0) {
      setMessages(loaded);
    } else {
      setMessages([{ role: "assistant", content: character.initialMessage }]);
    }
    setIntimacy(getIntimacy(character.id, character.intimacy));
    setCoinsState(getCoins());
    setGifts(getGiftsFor(character.id));
    try {
      const note = localStorage.getItem(`vm-vault-${character.id}`);
      if (note) setVaultNote(note);
    } catch {}
  }, [character.id, character.initialMessage, character.intimacy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMedia]);

  useEffect(() => {
    return () => {
      stopIntimacyAudio();
    };
  }, []);

  const persist = (next: ChatMessage[]) => {
    setMessages(next);
    saveChat(character.id, next);
    void syncChatSessionToFirestore?.(character.id, next).catch(() => {});
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: next.slice(-12),
          romanceMode,
          intimacy,
        }),
      });
      let replyText = "";
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply || data.message || "";
      }
      if (!replyText) {
        const mood = computeMoodState?.(character, text, intimacy);
        replyText = fallbackReply(character, text, romanceMode, mood);
      }
      const assistantMsg: ChatMessage = { role: "assistant", content: replyText };
      const final = [...next, assistantMsg];
      persist(final);
      const newInt = bumpIntimacy(character.id, 3);
      setIntimacy(newInt);
      if (voiceOn) {
        speak(replyText.slice(0, 280), { ...character.voice });
      }
      updateIntimacyAudioIntensity?.(Math.min(100, newInt));
    } catch {
      const fallback = fallbackReply(character, text, romanceMode);
      persist([...next, { role: "assistant", content: fallback }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const generate = async (mood: MediaMood, label: string, cost: number) => {
    if (busy) return;
    if (!spendCoins(cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Not enough coins for ${label}. Claim daily or keep chatting to earn more.` },
      ]);
      return;
    }
    setCoinsState(getCoins());
    setBusy(true);
    try {
      const url = characterMediaUrl(character, mood);
      const frames =
        mood === "sex"
          ? [
              characterMediaUrl(character, "lingerie", "starting undress"),
              characterMediaUrl(character, "nude", "aroused"),
              characterMediaUrl(character, "explicit", "intense"),
              characterMediaUrl(character, "sex", "climax"),
            ]
          : undefined;

      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: mood === "sex" ? "video" : mood,
        url,
        frames,
        prompt: `${character.name} ${mood}`,
      });

      const mediaMsg: ChatMessage = {
        role: "assistant",
        content:
          mood === "sex"
            ? `*${character.name} starts a private sequence for you…*`
            : `*${character.name} sends you something ${mood}…*`,
        imageUrl: url,
        frames,
        mediaType: mood,
      };
      const next = [...messages, mediaMsg];
      persist(next);
      setActiveMedia({ url, frames, type: mood });
      const newInt = bumpIntimacy(character.id, mood === "sex" ? 8 : 5);
      setIntimacy(newInt);
      if (voiceOn) {
        speak(
          mood === "sex"
            ? "Watch me. Don't look away."
            : `I took this just for you. Tell me how hard you are.`,
          { ...character.voice },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const sendGift = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (!spendCoins(gift.cost || 12)) {
      setMessages((m) => [...m, { role: "assistant", content: "Not enough coins for that gift." }]);
      return;
    }
    setCoinsState(getCoins());
    addGift(character.id, giftId);
    setGifts(getGiftsFor(character.id));
    const reply = `*${character.name} receives the ${gift.name}.* “${gift.reaction || "Mmm… you know me."}`;
    persist([...messages, { role: "user", content: `[Gift: ${gift.name}]` }, { role: "assistant", content: reply }]);
    bumpIntimacy(character.id, 4);
    setIntimacy(getIntimacy(character.id));
  };

  const saveVault = () => {
    try {
      localStorage.setItem(`vm-vault-${character.id}`, vaultNote);
    } catch {}
    setVaultOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <button type="button" onClick={onBack} className="text-pink-400 text-sm hover:text-pink-300">
          ← Back
        </button>
        <div className="h-11 w-11 rounded-full overflow-hidden border border-pink-500/40 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterMediaUrl(character, "beauty")}
            alt={character.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-cream truncate">{character.name}</div>
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="text-pink-300">{intimacy}% intimacy</span>
            <span>·</span>
            <span>{coins} coins</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVoiceOn((v) => !v)}
          className="p-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
          title={voiceOn ? "Mute voice" : "Enable voice"}
        >
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setVaultOpen((v) => !v)}
          className="p-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
          title="Private vault"
        >
          {vaultOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </button>
      </div>

      {/* Vault panel */}
      {vaultOpen && (
        <div className="mt-3 rounded-2xl border border-pink-500/30 bg-zinc-900/80 p-4 space-y-2">
          <div className="text-sm font-medium text-pink-200">Private vault — only you see this</div>
          <textarea
            value={vaultNote}
            onChange={(e) => setVaultNote(e.target.value)}
            rows={3}
            placeholder="Notes, kinks she responded to, private fantasies…"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm resize-none outline-none focus:border-pink-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveVault}
              className="px-3 py-1.5 rounded-xl bg-pink-600 text-sm font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setVaultOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-white/15 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-pink-600/90 text-white"
                  : "bg-zinc-900/80 border border-white/10 text-zinc-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
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
        ))}
        {busy && (
          <div className="text-xs text-zinc-500 animate-pulse">She is typing…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Active media preview */}
      {activeMedia && (
        <div className="mb-2 rounded-2xl overflow-hidden border border-pink-500/40 relative">
          {activeMedia.frames && activeMedia.frames.length > 1 ? (
            <MotionSequencePlayer frames={activeMedia.frames} alt={character.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeMedia.url} alt="" className="w-full max-h-64 object-cover" />
          )}
          <button
            type="button"
            onClick={() => setActiveMedia(null)}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-xs"
          >
            Close
          </button>
        </div>
      )}

      {/* NSFW chips */}
      <div className="flex flex-wrap gap-2 pb-2 shrink-0">
        {NSFW_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={busy}
            onClick={() => generate(chip.mood, chip.label, chip.cost)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-500/40 bg-pink-500/10 text-xs font-medium text-pink-100 hover:bg-pink-500/20 disabled:opacity-50"
          >
            {chip.id === "sex" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {chip.label}
            <span className="text-pink-300/70">{chip.cost}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            startIntimacyAudio?.(Math.min(90, intimacy + 10));
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/15 text-xs text-zinc-300"
        >
          <Flame className="h-3.5 w-3.5" /> Ambience
        </button>
      </div>

      {/* Gifts row */}
      <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
        {GIFTS.slice(0, 6).map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => sendGift(g.id)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-zinc-300 hover:border-pink-500/40"
          >
            <Gift className="h-3 w-3" /> {g.name}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-1 shrink-0">
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
          className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none outline-none focus:border-pink-500 max-h-28"
        />
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
          className="px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
