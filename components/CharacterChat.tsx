"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  Copy,
  Cpu,
  Dices,
  Download,
  Flame,
  Gift,
  GitBranch,
  Heart,
  Image as ImageIcon,
  Maximize2,
  Pencil,
  Phone,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { startIntimacyAudio, stopIntimacyAudio, updateIntimacyAudioIntensity } from "@/lib/audioEngine";
import { CHARACTERS, fallbackReply, type Character } from "@/lib/characters";
import { continueCompanionScene, generateCompanionReply, sanitizeCompanionReply } from "@/lib/chatRouter";
import { assertCompliance } from "@/lib/complianceFilter";
import {
  listChatBranchesDB,
  loadChatDB,
  loadGalleryDB,
  saveChatBranchDB,
  saveChatDB,
  saveGalleryDB,
  type BranchRow,
} from "@/lib/db";
import { getTimeMood } from "@/lib/timeMood";
import { playLevelUpSwell } from "@/lib/neonAudio";
import { hapticLevelUp } from "@/lib/haptics";
import { ChatMiniGames } from "@/components/ChatMiniGames";
import { AmbientMixer } from "@/components/AmbientMixer";
import { computeMoodState } from "@/lib/moodEngine";
import { extractMemoriesFromMessage, loadMemories, saveMemories, splitInnerThoughtAndReply } from "@/lib/memoryMap";
import { memoryPromptBlock, pinLong, pushShort } from "@/lib/memoryTiers";
import { buildLorebookContext, loadLorebook } from "@/lib/lorebook";
import { stageFromIntimacy } from "@/lib/relationship";
import { speak } from "@/lib/speech";
import { cleanSpeechText, speakWithNeuralVoice } from "@/lib/kokoroTts";
import { useCoinsStore } from "@/lib/coinsStore";
import {
  earnCompanionXp,
  getCompanionProgression,
  LEVEL_MILESTONES,
  levelProgressPercent,
  type CompanionProgression,
} from "@/lib/progression";
import {
  addToGallery,
  bumpIntimacy,
  GEN_COST,
  getGallery,
  getIntimacy,
  getKinks,
  loadChat,
  saveChat,
  type StoredMessage,
} from "@/lib/storage";
import { GIFTS, addGift, getGiftsFor } from "@/lib/gifts";
import { characterMediaUrl, resolveBestMediaUrl, type MediaMood } from "@/lib/media";
import { generateStudioVideoClip } from "@/lib/canvasVideoExporter";
import { useLocalEngineStatus } from "@/lib/localEngineBridge";
import { enhanceSequenceWithVideo, runSequenceGeneration, type SequenceKind } from "@/lib/videoModes";
import { LIVE_ACTION_PRESETS, type LiveActionPreset } from "@/lib/liveActionPresets";
import { toggleVaultItem } from "@/lib/vault";
import { saveTribute } from "@/lib/rewards";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";
import { VoiceCallModal } from "@/components/VoiceCallModal";
import { MemoryVaultDrawer, MemoryVaultPanel, loadCategorizedMemories, saveCategorizedMemories, type MemoryCategory } from "@/components/MemoryVaultDrawer";
import {
  buildProactiveFollowUp,
  extractInlineImageRequests,
  extractMemoriesFromMessage as extractDynamicMemories,
  generateQuickReplySuggestions,
  getLocalTimeVibe,
  splitIntoNaturalBubbles,
  type CompanionMemoryItem,
} from "@/lib/dynamicChatEngine";

function toDynamicMemories(characterId: string): CompanionMemoryItem[] {
  const mapCat = (c: MemoryCategory): CompanionMemoryItem["category"] => {
    if (c === "Preferences") return "preference";
    if (c === "Inside Jokes") return "inside_joke";
    if (c === "Pinned Rules") return "pinned_rule";
    return "about_user";
  };
  return loadCategorizedMemories(characterId).map((m) => ({
    id: m.id,
    category: mapCat(m.category),
    text: m.text,
    pinned: m.pinned,
    createdAt: m.updatedAt,
  }));
}

function toVaultCategory(cat: CompanionMemoryItem["category"]): MemoryCategory {
  if (cat === "preference") return "Preferences";
  if (cat === "inside_joke") return "Inside Jokes";
  if (cat === "pinned_rule") return "Pinned Rules";
  return "About You";
}
import { SafeImage } from "@/components/SafeImage";
import { ScenarioDirector } from "@/components/ScenarioDirector";
import { useDelayedLingerieDrop } from "@/components/ChatExtrasHooks";

type ChatMessage = StoredMessage & {
  id?: string;
  note?: string;
  isFallback?: boolean;
  error?: string;
  retrySpec?: { mood: MediaMood; label: string; cost: number; extra?: string };
};

type CharacterChatProps = {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
  onOpen3D?: (character: Character) => void;
  onSelectCompanion?: (character: Character) => void;
};

const QUICK_SCENE_SELFIES: Array<{ id: string; label: string; mood: MediaMood; scene: string }> = [
  { id: "mirror-selfie", label: "Mirror Selfie", mood: "lingerie", scene: "candid bedroom mirror selfie in soft lace loungewear, neon rim light" },
  { id: "neon-balcony", label: "Neon Balcony", mood: "seductive", scene: "high-rise neon balcony overlooking city skyline at night, magenta and cyan reflections" },
  { id: "late-night-bed", label: "Late Night Bed", mood: "nude", scene: "intimate candlelit bed sheets at midnight, warm glowing eyes looking at camera" },
  { id: "gym-glow", label: "Gym Glow", mood: "seductive", scene: "post-workout mirror selfie with glistening skin sheen and toned athletic outfit" },
  { id: "cocktail-lounge", label: "Cocktail Lounge", mood: "beauty", scene: "velvet cocktail lounge booth under moody neon magenta spotlight" },
  { id: "sunset-pool", label: "Sunset Pool", mood: "lingerie", scene: "infinity rooftop pool at twilight with shimmering neon water reflections" },
];

const NSFW_CHIPS = [
  { id: "lingerie", label: "Lingerie", mood: "lingerie" as MediaMood, cost: GEN_COST.lingerie },
  { id: "nude", label: "Nude", mood: "nude" as MediaMood, cost: GEN_COST.nude },
  { id: "explicit", label: "Explicit", mood: "explicit" as MediaMood, cost: GEN_COST.explicit },
  { id: "sex", label: "Intimate", mood: "sex" as MediaMood, cost: GEN_COST.explicit },
];

const VIDEO_CHIPS: { id: SequenceKind; label: string }[] = [
  { id: "joi", label: "JOI clip" },
  { id: "sex", label: "Motion clip" },
];

const SEQUENCE_LINES: Record<SequenceKind, string> = {
  sex: "*She starts an intimate motion sequence...*\n\n“Watch me move closely for you.”",
  doggy: "*From behind.*\n\n“Right here with you.”",
  cowgirl: "*On top.*\n\n“Keep your eyes locked on me.”",
  shower: "*Warm steam.*\n\n“Stay right here against the glass.”",
  joi: "*JOI mode.*\n\n“Match my pace—wait for my cue.”",
  sph: "*Tease mode.*\n\n“Eyes on me while I set the rhythm.”",
  bnwo: "*Neon night.*\n\n“Follow every beat.”",
};

export function CharacterChat({ character, romanceMode, onBack, onOpen3D, onSelectCompanion }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const [intimacy, setIntimacy] = useState(character.intimacy);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showScenes, setShowScenes] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [freeformPrompt, setFreeformPrompt] = useState("");
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("call") === "1") {
        setCallOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    frames?: string[];
    videoUrl?: string | null;
    type: string;
    note?: string;
  } | null>(null);
  const [gifts, setGifts] = useState<string[]>([]);
  const [clipStatus, setClipStatus] = useState<string | null>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [progression, setProgression] = useState<CompanionProgression>(() => getCompanionProgression(character.id));
  const [timeMood] = useState(() => getTimeMood());
  const [timeVibe] = useState(() => getLocalTimeVibe());
  const proactiveSentRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>("main");
  const [gamesOpen, setGamesOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"memory" | "diary">("memory");
  const [diaryPhotos, setDiaryPhotos] = useState<Array<{ id: string; url: string; label: string }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const { coins, spend, earn } = useCoinsStore();
  const engineStatus = useLocalEngineStatus();
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
  const progStats = levelProgressPercent(progression.xp);

  const refreshDiary = () => {
    const lsItems = getGallery()
      .filter((g) => g.characterId === character.id)
      .map((g) => ({ id: g.id, url: g.url, label: g.type || "selfie" }));
    void loadGalleryDB(character.id).then((dbItems) => {
      const merged = new Map<string, { id: string; url: string; label: string }>();
      for (const r of dbItems) merged.set(r.url, { id: r.id, url: r.url, label: r.mood || "selfie" });
      for (const l of lsItems) if (!merged.has(l.url)) merged.set(l.url, l);
      setDiaryPhotos(Array.from(merged.values()));
    });
  };

  useEffect(() => {
    proactiveSentRef.current = false;
    setProgression(getCompanionProgression(character.id));
    setGifts(getGiftsFor(character.id));
    setIntimacy(getIntimacy(character.id, character.intimacy));
    setActiveBranchId("main");
    refreshDiary();
    void listChatBranchesDB(character.id).then(setBranches);
    void (async () => {
      const dbLoaded = await loadChatDB(character.id);
      const loaded = (Array.isArray(dbLoaded) ? (dbLoaded as ChatMessage[]) : null) || loadChat(character.id);
      if (loaded.length > 0) setMessages(loaded);
      else {
        const adapted = `${character.initialMessage}\n\n*${timeMood.label}:* ${timeMood.greetingLine(character.name.split(" ")[0])}`;
        setMessages([{ role: "assistant", content: adapted }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, character.initialMessage, character.intimacy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMedia, generatingPhoto]);

  useEffect(() => () => stopIntimacyAudio(), []);

  const persist = (next: ChatMessage[]) => {
    setMessages(next);
    if (activeBranchId === "main") {
      void saveChatDB(character.id, next);
      saveChat(character.id, next);
    } else {
      const active = branches.find((b) => b.branchId === activeBranchId);
      void saveChatBranchDB({
        characterId: character.id,
        branchId: activeBranchId,
        label: active?.label || `Timeline ${activeBranchId}`,
        messages: next,
        createdAt: active?.createdAt || Date.now(),
      }).then(() => listChatBranchesDB(character.id).then(setBranches));
    }
  };

  const quickReplies = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content || character.initialMessage || "";
    return generateQuickReplySuggestions(lastAssistant, character.name.split(" ")[0]);
  }, [character.initialMessage, character.name, messages]);

  // Gentle idle double-text timer (75s inactivity in an open chat, max once per session)
  useEffect(() => {
    if (proactiveSentRef.current || busy || generatingPhoto || input.trim() || messages.length === 0) return;
    const timer = window.setTimeout(() => {
      if (!mountedRef.current || proactiveSentRef.current) return;
      proactiveSentRef.current = true;
      const followUp = buildProactiveFollowUp(
        {
          id: character.id,
          name: character.name,
          age: character.age,
          personality: character.personality,
          backstory: character.background,
          mood: timeMood.badge,
        },
        toDynamicMemories(character.id),
      );
      const nextMsgs: ChatMessage[] = [...messages, { role: "assistant", content: followUp }];
      setMessages(nextMsgs);
      void saveChatDB(character.id, nextMsgs);
      saveChat(character.id, nextMsgs);
    }, 75_000);
    return () => window.clearTimeout(timer);
  }, [busy, character.age, character.background, character.id, character.name, character.personality, generatingPhoto, input, messages, timeMood.badge]);

  const forkFromMessage = async (idx: number) => {
    const slice = messages.slice(0, idx + 1);
    const branchId = `b-${Date.now().toString(36)}`;
    const label = `What-If #${branches.length + 1}`;
    const saved = await saveChatBranchDB({
      characterId: character.id,
      branchId,
      label,
      messages: slice,
      parentBranch: activeBranchId,
      createdAt: Date.now(),
    });
    const nextList = await listChatBranchesDB(character.id);
    setBranches(nextList.length ? nextList : [...branches, saved]);
    setActiveBranchId(branchId);
    setMessages(slice);
    notifySaved(`Forked ${label}`);
  };

  const switchBranch = async (branchId: string) => {
    setActiveBranchId(branchId);
    if (branchId === "main") {
      const dbLoaded = await loadChatDB(character.id);
      const loaded = (Array.isArray(dbLoaded) ? (dbLoaded as ChatMessage[]) : null) || loadChat(character.id);
      setMessages(loaded.length ? loaded : [{ role: "assistant", content: character.initialMessage }]);
      return;
    }
    const found = branches.find((b) => b.branchId === branchId);
    if (found && Array.isArray(found.messages)) {
      setMessages(found.messages as ChatMessage[]);
    }
  };

  const notifySaved = (label: string) => {
    setSavedToast(label);
    setTimeout(() => setSavedToast(null), 2000);
  };

  const handleSaveToCollection = (url: string, mood = "selfie") => {
    const saved = addToGallery({
      characterId: character.id,
      characterName: character.name,
      type: mood,
      url,
      prompt: `${character.name} ${mood}`,
    });
    if (saved) {
      void saveGalleryDB({
        id: saved.id,
        characterId: saved.characterId,
        url: saved.url,
        mood,
        createdAt: saved.createdAt,
      }).then(refreshDiary);
    }
    notifySaved("Saved to Collection & Photo Diary");
  };

  const buildPersonaPayload = (recentUserText = "") => {
    const dynamicMemories = toDynamicMemories(character.id);
    const vaultNotes = loadCategorizedMemories(character.id)
      .slice(0, 8)
      .map((m) => `- [${m.category}] ${m.text}`)
      .join("\n");
    const loreContext = buildLorebookContext(loadLorebook(character.id), recentUserText);
    const memoryBlock = [vaultNotes, memoryPromptBlock(character.id), loreContext].filter(Boolean).join("\n");
    return {
      id: character.id,
      name: character.name,
      age: character.age,
      tagline: character.tagline,
      personality: progression.customPromptOverride || character.personality,
      backstory: character.background,
      memoryBlock,
      memories: dynamicMemories,
      relationshipLevel: progStats.level,
      recentMood: timeMood.badge,
    };
  };

  const requestReplyForHistory = async (historyMsgs: ChatMessage[], userPrompt: string) => {
    const safety = assertCompliance(userPrompt);
    if (!safety.ok) {
      setSafetyError(safety.reason);
      return null;
    }
    setSafetyError(null);

    try {
      pushShort(character.id, "user", userPrompt);
      const existing = loadMemories(character.id);
      saveMemories(character.id, extractMemoriesFromMessage(userPrompt, existing));

      const extractedFacts = extractDynamicMemories(userPrompt);
      if (extractedFacts.length > 0) {
        const currentVault = loadCategorizedMemories(character.id);
        const newVaultItems = extractedFacts
          .filter((f) => !currentVault.some((v) => v.text.toLowerCase() === f.text.toLowerCase()))
          .map((f, idx) => ({
            id: `dyn-${Date.now()}-${idx}`,
            category: toVaultCategory(f.category),
            text: f.text,
            pinned: Boolean(f.pinned),
            updatedAt: Date.now(),
          }));
        if (newVaultItems.length > 0) {
          saveCategorizedMemories(character.id, [...newVaultItems, ...currentVault]);
          notifySaved("🧠 Saved to Memory Vault");
        }
      }

      if (/(always remember|never forget|my name is|call me)/i.test(userPrompt)) {
        pinLong(character.id, userPrompt.slice(0, 180));
      }
    } catch {
      /* ignore */
    }

    const routed = await generateCompanionReply(
      historyMsgs.slice(-16).map((m) => ({ role: m.role as "user" | "assistant", text: m.content })),
      buildPersonaPayload(userPrompt),
    );

    const sanitized = sanitizeCompanionReply(routed.text, character.name);
    if (sanitized) return sanitized;

    const mood = computeMoodState?.({
      character,
      messages: historyMsgs,
      durationSeconds: 60,
      intimacy,
      romanceMode,
      giftCount: gifts.length,
    });
    return fallbackReply(character, userPrompt, romanceMode, mood);
  };

  const attachInlinePhotoAt = async (baseBatch: ChatMessage[], targetIdx: number, scenePrompt: string) => {
    setGeneratingPhoto(true);
    try {
      const resolved = await resolveBestMediaUrl(character, "scene", scenePrompt);
      const valid =
        resolved.url.startsWith("http://") ||
        resolved.url.startsWith("https://") ||
        resolved.url.startsWith("blob:") ||
        (resolved.url.startsWith("data:image/") && resolved.url.length > 64);

      if (!mountedRef.current) return;
      const updated = baseBatch.map((msg, idx) => {
        if (idx !== targetIdx) return msg;
        if (resolved.isFallback || !valid) {
          return {
            ...msg,
            isFallback: true,
            error: resolved.error || resolved.note || "Scene photo generator unavailable",
            mediaType: "scene",
            retrySpec: { mood: "scene" as MediaMood, label: "Scene Photo", cost: 0, extra: scenePrompt },
          };
        }
        return {
          ...msg,
          imageUrl: resolved.url,
          mediaType: "scene",
          note: resolved.note,
        };
      });
      persist(updated);
      if (!resolved.isFallback && valid) {
        addToGallery({
          characterId: character.id,
          characterName: character.name,
          type: "scene",
          url: resolved.url,
          prompt: scenePrompt,
        });
        void saveGalleryDB({
          id: `inline-${Date.now()}`,
          characterId: character.id,
          url: resolved.url,
          mood: "scene",
          createdAt: Date.now(),
        }).then(refreshDiary);
        setRevealed((s) => new Set(s).add(targetIdx));
      }
    } finally {
      if (mountedRef.current) setGeneratingPhoto(false);
    }
  };

  const send = async (overrideText?: string, bonusXp = 6) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    const guard = assertCompliance(text);
    if (!guard.ok) {
      setSafetyError(guard.reason);
      return;
    }

    if (!overrideText) setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    persist(next);
    setBusy(true);
    // Force a paint so the user bubble is visible before the reply
    await new Promise((r) => setTimeout(r, 40));

    try {
      const kinks = getKinks(character.id);
      const rawReply = (await requestReplyForHistory(next, text)) || fallbackReply(character, text, romanceMode);
      const sanitized = sanitizeCompanionReply(rawReply, character.name) || rawReply;
      const { cleanText, imagePrompts } = extractInlineImageRequests(sanitized);
      let replyText = cleanText || (imagePrompts.length > 0 ? "*Sends you a quick photo...*" : sanitized);
      if (kinks.length && Math.random() < 0.25) {
        replyText += `\n\n*She remembers.* “Still thinking about ${kinks[kinks.length - 1]}…”`;
      }

      pushShort(character.id, "assistant", replyText);
      const bubbles = splitIntoNaturalBubbles(replyText);
      let latestBatch: ChatMessage[] = [...next, { role: "assistant", content: bubbles[0] || replyText }];
      persist(latestBatch);

      if (bubbles.length > 1) {
        await new Promise((r) => setTimeout(r, 750));
        if (mountedRef.current) {
          latestBatch = [...latestBatch, { role: "assistant", content: bubbles.slice(1).join(" ") }];
          persist(latestBatch);
        }
      }

      if (imagePrompts.length > 0 && mountedRef.current) {
        await attachInlinePhotoAt(latestBatch, latestBatch.length - 1, imagePrompts[0]);
      }

      const newInt = bumpIntimacy(character.id, 3);
      setIntimacy(newInt);
      const { progression: nextProg, leveledUp } = earnCompanionXp(character.id, bonusXp);
      setProgression(nextProg);
      if (leveledUp) {
        playLevelUpSwell();
        hapticLevelUp();
        notifySaved(`Level ${nextProg.level} Unlocked! +15 🪙`);
      }

      if (voiceOn) {
        void speakWithNeuralVoice(cleanSpeechText(replyText).slice(0, 280), {
          voiceId: character.voiceId,
          whispery: progression.level >= 4 || timeMood.whisperBias,
          pitch: character.voice?.pitch,
          rate: character.voice?.rate,
        });
      }
      updateIntimacyAudioIntensity?.(Math.min(100, newInt));
    } finally {
      setBusy(false);
    }
  };

  const regenerateAt = async (assistantIndex: number) => {
    if (busy) return;
    const prior = messages.slice(0, assistantIndex);
    const lastUser = [...prior].reverse().find((m) => m.role === "user")?.content || "Continue right where we left off";
    setBusy(true);
    try {
      const rawReply = (await requestReplyForHistory(prior, lastUser)) || fallbackReply(character, lastUser, romanceMode);
      const { cleanText, imagePrompts } = extractInlineImageRequests(rawReply);
      const nextReply = cleanText || (imagePrompts.length > 0 ? "*Sends you a quick photo...*" : rawReply);
      const updated = [...prior, { role: "assistant" as const, content: nextReply }, ...messages.slice(assistantIndex + 1)];
      persist(updated);
      if (imagePrompts.length > 0 && mountedRef.current) {
        await attachInlinePhotoAt(updated, prior.length, imagePrompts[0]);
      }
    } finally {
      setBusy(false);
    }
  };

  const rewindTo = (index: number) => {
    setEditingIndex(null);
    persist(messages.slice(0, index + 1));
    notifySaved("Rewound thread");
  };

  const saveEditedMessage = (assistantIndex: number) => {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }
    const guard = assertCompliance(trimmed);
    if (!guard.ok) {
      setSafetyError(guard.reason);
      return;
    }
    setSafetyError(null);
    const updated = messages.map((msg, idx) =>
      idx === assistantIndex ? { ...msg, content: trimmed } : msg,
    );
    persist(updated);
    setEditingIndex(null);
    notifySaved("Saved edit to IndexedDB");
  };

  const continueAt = async (assistantIndex: number) => {
    if (busy) return;
    const baseMessages =
      editingIndex === assistantIndex && editDraft.trim()
        ? messages.map((msg, idx) =>
            idx === assistantIndex ? { ...msg, content: editDraft.trim() } : msg,
          )
        : messages;
    const target = baseMessages[assistantIndex];
    if (!target || target.role !== "assistant") return;

    const guard = assertCompliance(target.content);
    if (!guard.ok) {
      setSafetyError(guard.reason);
      return;
    }
    setSafetyError(null);
    setEditingIndex(null);
    if (editingIndex === assistantIndex) persist(baseMessages);

    setBusy(true);
    try {
      const slice = baseMessages.slice(0, assistantIndex + 1);
      const routed = await continueCompanionScene(
        slice.map((m) => ({ role: m.role as "user" | "assistant", text: m.content })),
        buildPersonaPayload(),
      );
      const cont = sanitizeCompanionReply(routed.text, character.name) || routed.text.trim();
      if (!cont) return;
      const baseText = target.content.trim();
      const joiner = /[.!?…"\u201D*]$/.test(baseText) ? " " : " ";
      const nextContent = `${baseText}${joiner}${cont}`.trim();
      const updated = baseMessages.map((msg, idx) =>
        idx === assistantIndex ? { ...msg, content: nextContent } : msg,
      );
      persist(updated);
      notifySaved("Continued scene");
    } finally {
      setBusy(false);
    }
  };

  const generate = async (mood: MediaMood, label: string, cost: number, extra = "") => {
    const check = assertCompliance(`${character.name} ${label} ${extra}`);
    if (!check.ok) {
      setSafetyError(check.reason);
      return;
    }
    setSafetyError(null);

    setBusy(true);
    setGeneratingPhoto(true);
    try {
      const themedExtra = [extra, timeMood.sceneLightingBias].filter(Boolean).join(", ");
      const resolved = await resolveBestMediaUrl(character, mood, themedExtra);
      const rawUrl = resolved?.url || "";
      const isValidUrl =
        rawUrl.startsWith("http://") ||
        rawUrl.startsWith("https://") ||
        rawUrl.startsWith("blob:") ||
        (rawUrl.startsWith("data:image/") && rawUrl.length > 64);

      if (resolved.isFallback || !isValidUrl) {
        const reason = resolved.error || resolved.note || "Live image generators unavailable (Quota/Offline)";
        const errMsg: ChatMessage = {
          role: "assistant",
          content: `*${label} couldn't render cleanly right now.*`,
          isFallback: true,
          error: reason,
          mediaType: mood,
          note: reason,
          retrySpec: { mood, label, cost, extra },
        };
        persist([...messages, errMsg]);
        setSafetyError(null);
        return;
      }

      if (cost > 0) spend(cost);
      const url = rawUrl;
      const note = resolved.note;

      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: mood,
        url,
        prompt: `${character.name} ${label}`,
      });
      void saveGalleryDB({
        id: `chat-${Date.now()}`,
        characterId: character.id,
        url,
        mood,
        createdAt: Date.now(),
      }).then(refreshDiary);

      const isExplicit = ["nude", "explicit", "sex"].includes(mood);
      const caption = `*${label} · ${note}*`;
      const mediaMsg: ChatMessage = { role: "assistant", content: caption, imageUrl: url, mediaType: mood, note };
      const next = [...messages, mediaMsg];
      persist(next);
      if (!isExplicit) {
        setRevealed((s) => new Set(s).add(next.length - 1));
      }
      setActiveMedia({ url, type: mood, note });
      setIntimacy(bumpIntimacy(character.id, 5));
      const { progression: nextProg } = earnCompanionXp(character.id, 8);
      setProgression(nextProg);
    } catch (err) {
      setSafetyError(err instanceof Error ? err.message : "Could not generate Scene Selfie. Please try again.");
    } finally {
      setGeneratingPhoto(false);
      setBusy(false);
    }
  };

  const generateSequence = async (kind: SequenceKind) => {
    setBusy(true);
    setClipStatus("Checking compatible video generator...");
    try {
      const result = runSequenceGeneration(character, kind);
      const existingLiveImg = [...messages].reverse().find((m) => m.imageUrl && !m.isFallback)?.imageUrl;
      let baseImageUrl = existingLiveImg || "";
      if (!baseImageUrl) {
        const liveShot = await resolveBestMediaUrl(character, kind === "joi" ? "joi" : "seductive", "cinematic framing");
        if (liveShot.isFallback || !liveShot.url) {
          throw new Error(liveShot.error || "A source image couldn't be generated. Connect an image model first.");
        }
        baseImageUrl = liveShot.url;
      }
      const frames = baseImageUrl ? [baseImageUrl, ...result.frames.slice(1)] : result.frames;
      const url = baseImageUrl || frames[frames.length - 1];

      let videoUrl: string | null = null;
      let note = "Video generator not configured";

      const enhanced = await enhanceSequenceWithVideo(character, kind, frames);
      videoUrl = enhanced.videoUrl;
      note = enhanced.note;

      if (!videoUrl && url) {
        try {
          const webmClip = await generateStudioVideoClip({
            imageUrl: url,
            motionId: kind === "joi" ? "club-light-pulse" : "slow-zoom-blink",
            durationSec: 5,
            speed: kind === "joi" ? 1.25 : 1,
            prompt: `${character.name} ${kind} video clip`,
            comfyOnline: engineStatus.comfyOnline,
          });
          videoUrl = webmClip.videoUrl;
          note = webmClip.engine;
        } catch {
          /* Headless or MediaRecorder-restricted environment: keep interactive sequence frames */
        }
      }

      const mediaMsg: ChatMessage = {
        role: "assistant",
        content: SEQUENCE_LINES[kind],
        imageUrl: url,
        videoUrl: videoUrl || undefined,
        frames,
        mediaType: kind,
        note,
      };
      persist([...messages, mediaMsg]);
      setActiveMedia({
        url,
        frames,
        videoUrl,
        type: kind,
        note,
      });
      setClipStatus(note);
      setIntimacy(bumpIntimacy(character.id, 7));
      const { progression: nextProg } = earnCompanionXp(character.id, 10);
      setProgression(nextProg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video generator failed";
      setSafetyError(message);
      setClipStatus(`Video unavailable: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const runLiveAction = (preset: LiveActionPreset) => {
    if (preset.kind === "photo" && preset.mood) {
      void generate(preset.mood, preset.label, GEN_COST.lingerie, preset.sceneExtra);
      return;
    }
    void generateSequence(preset.kind as SequenceKind);
  };

  const runFullScenePipeline = async () => {
    if (busy) return;
    const promptText =
      input.trim() || messages.filter((m) => m.role === "user").at(-1)?.content || "Pull me close into a private late-night scene.";
    if (input.trim()) setInput("");
    setBusy(true);
    setGeneratingPhoto(true);
    setClipStatus("Running Client Director Pipeline (Mood → Reply → Selfie)...");
    try {
      const nextWithUser: ChatMessage[] = [...messages, { role: "user", content: promptText }];
      const replyText = (await requestReplyForHistory(nextWithUser, promptText)) || fallbackReply(character, promptText, romanceMode);
      const mood: MediaMood = intimacy >= 60 ? "nude" : "lingerie";
      const photo = await resolveBestMediaUrl(character, mood, promptText.slice(0, 120));
      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: mood,
        url: photo.url,
        prompt: `${character.name} · ${promptText.slice(0, 60)}`,
      });
      const updated: ChatMessage[] = [
        ...nextWithUser,
        { role: "assistant", content: replyText, imageUrl: photo.url, mediaType: mood, note: photo.note },
      ];
      persist(updated);
      setRevealed((s) => new Set(s).add(updated.length - 1));
      setClipStatus("Scene pipeline complete");
    } finally {
      setGeneratingPhoto(false);
      setBusy(false);
    }
  };

  const sendGift = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    const res = spend(gift.cost || 12);
    if (!res.ok) {
      earn(25);
    }
    addGift(character.id, giftId);
    setGifts(getGiftsFor(character.id));
    persist([
      ...messages,
      { role: "user", content: `🎁 Sent gift: ${gift.name}` },
      { role: "assistant", content: `*${character.name} lights up receiving the ${gift.name}.* “${gift.line || gift.reaction || "You really know how to spoil me."}”` },
    ]);
    setIntimacy(bumpIntimacy(character.id, 6));
    const { progression: nextProg } = earnCompanionXp(character.id, 12);
    setProgression(nextProg);
    notifySaved(`Sent ${gift.name}`);
  };

  const localGallery = getGallery().filter((g) => g.characterId === character.id).slice(0, 6);

  return (
    <div className="h-[100dvh] lg:h-[calc(100dvh-4.5rem)] w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-[235px_1fr_290px] lg:gap-4 overflow-hidden">
      <VoiceCallModal character={character} open={callOpen} onClose={() => setCallOpen(false)} />
      <MemoryVaultDrawer
        open={memoryDrawerOpen}
        onClose={() => setMemoryDrawerOpen(false)}
        characterId={character.id}
        characterName={character.name}
      />

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/92 p-4 backdrop-blur-lg"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              aria-label="Close image preview"
              className="absolute right-2 top-2 z-10 rounded-full border border-[#ff1e8e] bg-black/75 p-2 text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SafeImage src={lightboxUrl} alt={character.name} className="w-full max-h-[75dvh] rounded-3xl object-contain bg-black border border-[#ff1e8e]/40" />
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveToCollection(lightboxUrl, "lightbox")}
                className="inline-flex items-center gap-1.5 rounded-full neon-btn-primary px-4 py-2 text-xs font-bold"
              >
                <BookmarkPlus className="h-3.5 w-3.5" /> Save to Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP LEFT COLUMN: Live Companion Switcher */}
      <aside className="hidden lg:flex flex-col rounded-3xl neon-glass p-3 overflow-hidden">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#00f5ff] px-2 pb-2 border-b border-white/10">
          Active Threads
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pt-2">
          {CHARACTERS.slice(0, 14).map((c) => {
            const isCur = c.id === character.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCompanion?.(c)}
                className={`w-full flex items-center gap-2.5 rounded-2xl p-2 text-left transition ${
                  isCur
                    ? "border border-[#ff1e8e]/70 bg-[#ff1e8e]/15 text-white shadow-[0_0_16px_rgba(255,30,142,0.2)]"
                    : "border border-transparent hover:bg-white/5 text-[#a6a6c4]"
                }`}
              >
                <div className="relative h-9 w-9 shrink-0">
                  <SafeImage src={staticPortraitUrl(c.id)} alt={c.name} className="h-9 w-9 rounded-full object-cover object-top" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00ffa3] ring-2 ring-[#05050a]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-[#f7f7fc]">{c.name}</div>
                  <div className="truncate text-[10px] text-[#a6a6c4]">{c.category}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER COLUMN: Live Neon Chat */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-none lg:rounded-3xl lg:neon-glass lg:p-3">
        {/* Clean Collision-Free Header */}
        <header className="shrink-0 bg-[#05050a]/95 backdrop-blur-md border-b border-white/10 px-2 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs text-[#00f5ff] hover:border-[#00f5ff]"
              >
                ←
              </button>
              <SafeImage
                src={staticPortraitUrl(character.id)}
                alt={character.name}
                className="h-10 w-10 rounded-full object-cover object-top border border-[#ff1e8e]/60 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm text-[#f7f7fc] truncate">{character.name}</span>
                  <span className="hidden sm:inline-block rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-2 py-0.5 text-[9px] font-bold text-[#00f5ff]">
                    {timeMood.badge}
                  </span>
                  {progression.level >= 10 && (
                    <span className="rounded-full bg-[#00f5ff]/20 border border-[#00f5ff] px-1.5 py-0.5 text-[9px] font-black text-[#00f5ff]">
                      SOULMATE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-[#a6a6c4] truncate">
                    <span className="text-[#00ffa3] font-semibold">Online</span> · {stage.label} · Lv. {progStats.level}
                  </p>
                  {branches.length > 0 && (
                    <select
                      aria-label="Switch What-If branch"
                      value={activeBranchId}
                      onChange={(e) => void switchBranch(e.target.value)}
                      className="rounded-full border border-[#ff1e8e]/50 bg-[#0c0c16] px-2 py-0.5 text-[10px] font-bold text-pink-200 outline-none"
                    >
                      <option value="main">Main Timeline</option>
                      {branches.map((b) => (
                        <option key={b.branchId} value={b.branchId}>
                          ⑂ {b.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <AmbientMixer compact />
              <span className="rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-200 tabular-nums">
                🪙 {coins}
              </span>
              <button
                type="button"
                onClick={() => setCallOpen(true)}
                aria-label="Start Voice Call"
                title="Live Neural Voice Call"
                className="p-2 rounded-xl border border-[#00ffa3]/45 bg-[#00ffa3]/10 text-[#00ffa3] hover:bg-[#00ffa3]/20"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                aria-label="Toggle auto voice"
                className="p-2 rounded-xl border border-white/15 text-zinc-300 hover:border-[#00f5ff]"
              >
                {voiceOn ? <Volume2 className="h-4 w-4 text-[#00f5ff]" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setMemoryDrawerOpen(true)}
                className="lg:hidden rounded-xl border border-[#ff1e8e]/45 bg-[#ff1e8e]/10 px-2.5 py-1.5 text-[11px] font-bold text-pink-200"
              >
                Memory
              </button>
            </div>
          </div>

          {/* Glowing Magenta-to-Cyan Relationship XP Bar + Local Time Vibe */}
          <div className="px-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff1e8e] via-[#c026d3] to-[#00f5ff] transition-all duration-500"
                style={{ width: `${Math.max(8, progStats.percent)}%` }}
              />
            </div>
            <span className="shrink-0 rounded-full border border-[#00f5ff]/35 bg-[#00f5ff]/10 px-2 py-0.5 text-[9px] font-bold text-[#00f5ff]">
              {timeVibe.label}
            </span>
          </div>
        </header>

        {(clipStatus || savedToast || safetyError) && (
          <div className="shrink-0 px-2 pt-1.5 space-y-1">
            {safetyError && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-[11px] text-rose-200">
                {safetyError}
              </div>
            )}
            {savedToast && (
              <div className="rounded-xl border border-[#00ffa3]/50 bg-[#00ffa3]/12 px-3 py-1 text-[11px] font-semibold text-[#00ffa3]">
                ✓ {savedToast}
              </div>
            )}
            {clipStatus && <div className="text-[11px] text-[#00f5ff] px-1">{clipStatus}</div>}
            {clipStatus?.toLowerCase().includes("fail") && (
              <button type="button" onClick={() => setClipStatus(null)} className="text-[11px] text-pink-300 underline">Try another mood</button>
            )}
          </div>
        )}

        {/* Scrollable Message List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-3">
          {messages.map((m, i) => {
            const parsed =
              m.role === "assistant"
                ? splitInnerThoughtAndReply(m.content)
                : { innerThought: null, spokenReply: m.content };
            const cleanDisplay = sanitizeCompanionReply(parsed.spokenReply, character.name) || parsed.spokenReply;

            return (
              <div key={i} className={`group flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "neon-btn-primary text-white"
                      : "border border-white/12 bg-[#0c0c16] text-[#f7f7fc]"
                  }`}
                >
                  {editingIndex === i ? (
                    <div className="space-y-2 min-w-[240px]">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        aria-label="Edit companion reply"
                        className="w-full rounded-xl border border-[#00f5ff]/45 bg-[#05050a] px-2.5 py-2 text-xs text-white outline-none focus:border-[#ff1e8e] resize-y"
                      />
                      <div className="flex items-center justify-end gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="rounded-lg border border-white/15 px-2.5 py-1 text-zinc-300 hover:bg-white/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditedMessage(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#00ffa3]/45 bg-[#00ffa3]/15 px-2.5 py-1 font-bold text-[#00ffa3] hover:bg-[#00ffa3]/25"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{cleanDisplay}</div>
                  )}

                  {m.isFallback || m.error ? (
                    <div className="mt-2 rounded-xl border border-amber-400/45 bg-amber-500/10 p-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                        <div className="space-y-0.5">
                          <div className="font-bold">Live image generator unavailable</div>
                          <div className="text-[11px] text-amber-100/85 break-words">
                            {m.error || "Local ComfyUI, Cloudflare Flux, and AI Horde could not complete this request."}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.retrySpec && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void generate(
                                m.retrySpec!.mood,
                                m.retrySpec!.label,
                                0,
                                m.retrySpec!.extra || "",
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[#00f5ff]/45 bg-[#00f5ff]/15 px-2.5 py-1 text-[11px] font-bold text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-45"
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </button>
                        )}
                        <Link
                          href="/download/"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ff1e8e]/45 bg-[#ff1e8e]/15 px-2.5 py-1 text-[11px] font-bold text-[#ff8aa1] hover:bg-[#ff1e8e]/25"
                        >
                          <Cpu className="h-3 w-3" /> Connect Local ComfyUI
                        </Link>
                      </div>
                    </div>
                  ) : m.videoUrl ? (
                    <div className="mt-2 space-y-1.5">
                      <video src={m.videoUrl} controls autoPlay loop muted playsInline className="w-full max-h-72 rounded-xl bg-black" />
                      {m.mediaType === "joi" && (
                        <Link
                          href="/?view=blindfold"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ff1e8e]/45 bg-[#ff1e8e]/15 px-2.5 py-1 text-[11px] font-bold text-[#ff8aa1] hover:bg-[#ff1e8e]/25"
                        >
                          <Volume2 className="h-3 w-3" /> Open Generative Audio / JOI Studio →
                        </Link>
                      )}
                    </div>
                  ) : m.imageUrl ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="rounded-xl overflow-hidden relative border border-[#ff1e8e]/30">
                        {m.frames && m.frames.length > 1 ? (
                          <MotionSequencePlayer frames={m.frames} alt={character.name} />
                        ) : (
                          <>
                            <SafeImage
                              src={m.imageUrl}
                              alt={character.name}
                              fallbackId={character.id}
                              onClick={() => m.imageUrl && setLightboxUrl(m.imageUrl)}
                              className={`w-full max-h-80 object-cover cursor-pointer transition ${
                                revealed.has(i) || m.mediaType === "beauty" || m.mediaType === "lingerie" || m.mediaType === "seductive" || m.mediaType === "scene"
                                  ? ""
                                  : "blur-xl scale-105"
                              }`}
                            />
                            {!revealed.has(i) &&
                              !(m.mediaType === "beauty" || m.mediaType === "lingerie" || m.mediaType === "seductive" || m.mediaType === "scene") && (
                                <button
                                  type="button"
                                  onClick={() => setRevealed((s) => new Set(s).add(i))}
                                  className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-bold text-white"
                                >
                                  Tap to reveal
                                </button>
                              )}
                            <div className="flex items-center justify-between gap-2 bg-black/70 px-2.5 py-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => m.imageUrl && setLightboxUrl(m.imageUrl)}
                                className="inline-flex items-center gap-1 text-[#00f5ff] hover:underline"
                              >
                                <Maximize2 className="h-3 w-3" /> Enlarge
                              </button>
                              <button
                                type="button"
                                onClick={() => m.imageUrl && handleSaveToCollection(m.imageUrl, m.mediaType || "selfie")}
                                className="inline-flex items-center gap-1 text-pink-200 hover:text-white"
                              >
                                <BookmarkPlus className="h-3 w-3" /> Save to Collection
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {m.mediaType === "joi" && (
                        <Link
                          href="/?view=blindfold"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ff1e8e]/45 bg-[#ff1e8e]/15 px-2.5 py-1 text-[11px] font-bold text-[#ff8aa1] hover:bg-[#ff1e8e]/25"
                        >
                          <Volume2 className="h-3 w-3" /> Open Generative Audio / JOI Studio →
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Per-Message Action Rail */}
                <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-[#a6a6c4] opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(cleanDisplay);
                      notifySaved("Copied");
                    }}
                    className="inline-flex items-center gap-0.5 hover:text-white"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                  {m.role === "assistant" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSpeakingId(i);
                          void speakWithNeuralVoice(cleanSpeechText(cleanDisplay), {
                            voiceId: character.voiceId,
                            whispery: progression.level >= 4,
                          }).finally(() => setSpeakingId(null));
                        }}
                        className="inline-flex items-center gap-0.5 text-[#00f5ff] hover:underline"
                      >
                        <Volume2 className="h-3 w-3" /> {speakingId === i ? "Playing" : "Voice"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(i);
                          setEditDraft(cleanDisplay);
                        }}
                        className="inline-flex items-center gap-0.5 hover:text-[#00f5ff]"
                        title="Edit her reply inline to steer the scene"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void continueAt(i)}
                        className="inline-flex items-center gap-0.5 text-[#ff8aa1] hover:text-[#ff1e8e]"
                        title="Seamlessly continue from this reply"
                      >
                        <ArrowRight className="h-3 w-3" /> Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => void regenerateAt(i)}
                        className="inline-flex items-center gap-0.5 hover:text-[#ff1e8e]"
                      >
                        <RefreshCw className="h-3 w-3" /> Regen
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void forkFromMessage(i)}
                    className="inline-flex items-center gap-0.5 text-[#00f5ff] hover:underline"
                    title="Fork What-If timeline from here"
                  >
                    <GitBranch className="h-3 w-3" /> Fork Here
                  </button>
                  <button
                    type="button"
                    onClick={() => rewindTo(i)}
                    className="inline-flex items-center gap-0.5 hover:text-amber-300"
                  >
                    <RotateCcw className="h-3 w-3" /> Rewind
                  </button>
                </div>
              </div>
            );
          })}

          {generatingPhoto && (
            <div className="max-w-[240px] rounded-2xl border border-[#ff1e8e]/45 bg-[#0c0c16] p-2.5 space-y-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-gradient-to-br from-[#ff1e8e]/25 via-[#a855f7]/20 to-[#00f5ff]/25 animate-pulse flex items-center justify-center text-xs font-bold text-[#00f5ff]">
                Rendering Scene Selfie...
              </div>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-[#00f5ff] animate-pulse px-2">
              <Sparkles className="h-3.5 w-3.5" /> {character.name.split(" ")[0]} is thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Active Media Quick Preview Strip */}
        {activeMedia && (
          <div className="shrink-0 mx-2 mb-1.5 rounded-2xl border border-[#ff1e8e]/45 bg-[#0c0c16] p-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <SafeImage src={activeMedia.url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-bold text-white">{activeMedia.note || activeMedia.type}</div>
                <button
                  type="button"
                  onClick={() => {
                    toggleVaultItem(`media-${character.id}-${activeMedia.url.slice(-24)}`);
                    saveTribute({
                      characterId: character.id,
                      characterName: character.name,
                      url: activeMedia.url,
                      frames: activeMedia.frames,
                      note: activeMedia.note || activeMedia.type,
                    });
                    notifySaved("Pinned to Vault");
                  }}
                  className="text-[10px] text-[#00f5ff] hover:underline"
                >
                  Pin to Vault ♥
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setActiveMedia(null)} className="rounded-full p-1 text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Explicit State Scene Selfies Panel + Action Controls + Gift Strip + Pinned Composer */}
        <div className="shrink-0 border-t border-white/10 bg-[#05050a]/95 px-2 pt-1.5 pb-[max(4.5rem,env(safe-area-inset-bottom)+3.5rem)] lg:pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              aria-expanded={showScenes}
              onClick={() => setShowScenes((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-[#ff1e8e]/35 bg-[#ff1e8e]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-pink-200 hover:border-[#ff1e8e]"
            >
              {showScenes ? "▼" : "▶"} SCENE SELFIES
            </button>
            <button
              type="button"
              onClick={() => setShowActions((v) => !v)}
              className="text-[10px] font-bold uppercase tracking-wide text-[#00f5ff] hover:underline"
            >
              {showActions ? "▼ Hide Studio Chips" : "▶ Studio & Clips"}
            </button>
          </div>

          {showScenes && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
              {QUICK_SCENE_SELFIES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void generate(scene.mood, scene.label, 0, scene.scene)}
                  className="shrink-0 rounded-full border border-[#00f5ff]/40 bg-[#00f5ff]/10 px-3 py-1 text-[11px] font-semibold text-[#f7f7fc] hover:border-[#ff1e8e] disabled:opacity-40"
                >
                  📸 {scene.label}
                </button>
              ))}
            </div>
          )}

          {showActions && (
            <div className="space-y-1.5 px-1 pb-1">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {NSFW_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void generate(chip.mood, chip.label, chip.cost)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#ff1e8e]/40 bg-[#ff1e8e]/12 px-2.5 py-1 text-[11px] font-semibold text-pink-100 disabled:opacity-45"
                  >
                    <ImageIcon className="h-3 w-3" /> {chip.label}
                  </button>
                ))}
                {VIDEO_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void generateSequence(chip.id)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-fuchsia-500/45 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-100 disabled:opacity-45"
                  >
                    <Video className="h-3 w-3" /> {chip.label}
                  </button>
                ))}
                {LIVE_ACTION_PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => runLiveAction(p)}
                    className="shrink-0 rounded-full border border-[#00ffa3]/35 bg-[#00ffa3]/10 px-2.5 py-1 text-[11px] text-[#00ffa3] disabled:opacity-45"
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runFullScenePipeline()}
                  className="shrink-0 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200 disabled:opacity-45"
                >
                  ⚡ Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => startIntimacyAudio?.(Math.min(90, intimacy + 10))}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300"
                >
                  <Flame className="h-3 w-3" /> Ambience
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={freeformPrompt}
                  onChange={(e) => setFreeformPrompt(e.target.value)}
                  placeholder="Custom selfie prompt (e.g. neon balcony lace)..."
                  className="flex-1 rounded-xl border border-white/15 bg-[#0c0c16] px-3 py-1.5 text-xs text-white outline-none focus:border-[#ff1e8e]"
                />
                <button
                  type="button"
                  disabled={busy || !freeformPrompt.trim()}
                  onClick={() => {
                    const p = freeformPrompt.trim();
                    setFreeformPrompt("");
                    void generate("seductive", "Custom Selfie", 0, p);
                  }}
                  className="rounded-xl neon-btn-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  Snap
                </button>
              </div>
            </div>
          )}

          <ScenarioDirector
            key={character.id}
            companionName={character.name}
            disabled={busy}
            onStart={(prompt) => { void send(prompt); }}
          />

          <ChatMiniGames
            open={gamesOpen}
            companionName={character.name}
            onClose={() => setGamesOpen(false)}
            onPlayPrompt={(prompt, bonusXp) => void send(prompt, bonusXp || 8)}
          />

          {/* Horizontal Zero-Clip Gift Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-1">
            {GIFTS.slice(0, 6).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => sendGift(g.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/12 bg-[#0c0c16] px-2.5 py-1 text-[11px] text-[#f7f7fc] hover:border-[#ff1e8e]"
              >
                <Gift className="h-3 w-3 text-[#ff1e8e]" /> {g.name}
              </button>
            ))}
          </div>

          {/* 3 Neon 1-Tap Quick Reply Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {quickReplies.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => {
                  const lower = chip.toLowerCase();
                  if (lower.includes("selfie") || lower.includes("photo") || lower.includes("pic")) {
                    void generate("seductive", "Selfie", 0, "candid selfie, phone camera, natural light");
                  } else {
                    void send(chip);
                  }
                }}
                className="rounded-full border border-[#00f5ff]/35 bg-[#00f5ff]/10 px-3 py-1 text-left text-[11px] font-medium text-[#e6faff] hover:border-[#ff1e8e] hover:bg-[#ff1e8e]/15 transition disabled:opacity-45"
              >
                {chip}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate("nude", "NSFW Selfie", 0, "nude selfie, soft light, looking at camera")}
              className="rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-[11px] font-medium text-pink-200 hover:bg-pink-500/20 transition disabled:opacity-45"
            >
              NSFW selfie
            </button>
            <span className="text-[10px] text-zinc-500">Free cloud may return SFW. Run ComfyUI (:8188) or SD web UI (:7860) for local NSFW.</span>
            <span className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">Local NSFW ready when engine is online</span>
          </div>

          {/* Pinned Bottom Composer */}
          <form
            className="flex gap-1.5 sm:gap-2 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <button
              type="button"
              onClick={() => setGamesOpen((g) => !g)}
              aria-label="Open Mini-Games"
              title="Truth or Dare & Neon Spin Wheel"
              className={`shrink-0 inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                gamesOpen
                  ? "border-[#00f5ff] bg-[#00f5ff]/20 text-[#00f5ff]"
                  : "border-white/15 bg-[#0c0c16] text-pink-200 hover:border-[#ff1e8e]"
              }`}
            >
              <Dices className="h-4 w-4" />
              <span className="hidden sm:inline">Games</span>
            </button>
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
              placeholder={`Message ${character.name.split(" ")[0]}...`}
              className="flex-1 rounded-2xl bg-[#0c0c16] border border-white/15 px-4 py-2.5 text-sm text-white resize-none outline-none focus:border-[#ff1e8e]"
            />
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void send()}
              className="px-4 sm:px-5 rounded-2xl neon-btn-primary font-bold text-sm text-white disabled:opacity-45"
            >
              Send
            </button>
          </form>
        </div>
      </section>

      {/* DESKTOP RIGHT COLUMN: Profile + Memory Vault + Selfie Gallery */}
      <aside className="hidden lg:flex flex-col rounded-3xl neon-glass p-4 space-y-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <SafeImage
            src={staticPortraitUrl(character.id)}
            alt={character.name}
            className="h-14 w-14 rounded-2xl object-cover object-top border border-[#ff1e8e]/50 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-[#f7f7fc] truncate">{character.name}</h3>
            <p className="text-[11px] text-[#ff1e8e]">{character.category} · Lv. {progStats.level}</p>
            <p className="text-[10px] text-[#a6a6c4] line-clamp-2 mt-0.5">{character.tagline}</p>
          </div>
        </div>

        {/* Relationship Milestones */}
        <div className="rounded-2xl border border-white/10 bg-[#05050a] p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#00f5ff]">
            <span>Relationship Unlocks</span>
            <span>{progression.xp} XP</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {LEVEL_MILESTONES.map((m) => {
              const unlocked = progStats.level >= m.level;
              return (
                <span
                  key={m.level}
                  title={m.description}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                    unlocked
                      ? "border-[#00ffa3]/55 bg-[#00ffa3]/15 text-[#00ffa3]"
                      : "border-white/10 text-zinc-500"
                  }`}
                >
                  Lv.{m.level} {m.title.split(" ")[0]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right Column Tabs: Memory Vault vs Instagram-Style Photo Diary */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#05050a] p-1 text-[11px] font-bold shrink-0">
          <button
            type="button"
            onClick={() => setRightTab("memory")}
            className={`rounded-lg py-1.5 transition ${rightTab === "memory" ? "neon-btn-primary text-white" : "text-[#a6a6c4]"}`}
          >
            Memory Vault
          </button>
          <button
            type="button"
            onClick={() => {
              setRightTab("diary");
              refreshDiary();
            }}
            className={`rounded-lg py-1.5 transition ${rightTab === "diary" ? "neon-btn-primary text-white" : "text-[#a6a6c4]"}`}
          >
            Diary ({diaryPhotos.length || localGallery.length})
          </button>
        </div>

        {rightTab === "memory" ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <MemoryVaultPanel characterId={character.id} characterName={character.name} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {diaryPhotos.length === 0 && localGallery.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#05050a]/70 p-4 text-center text-xs text-[#a6a6c4]">
                No photos collected for {character.name.split(" ")[0]} yet. Tap Scene Selfies to capture her first diary shot.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {(diaryPhotos.length ? diaryPhotos : localGallery.map((g) => ({ id: g.id, url: g.url, label: g.type }))).map((item) => (
                  <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#ff1e8e]">
                    <button type="button" onClick={() => setLightboxUrl(item.url)} className="h-full w-full">
                      <SafeImage src={item.url} alt={item.label} className="h-full w-full object-cover object-top" />
                    </button>
                    <a
                      href={item.url}
                      download={`${character.id}-${item.id}.jpg`}
                      aria-label="Download diary photo"
                      className="absolute right-1 bottom-1 rounded-md bg-black/75 p-1 text-[#00f5ff] opacity-0 group-hover:opacity-100 transition"
                    >
                      <Download className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
