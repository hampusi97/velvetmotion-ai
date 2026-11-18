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
} from "lucide-react";
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
} from "@/lib/storage";
import { GIFTS, getGiftsFor, addGift } from "@/lib/gifts";
import { characterPortraitUrl } from "@/lib/portraits";
import { syncChatSessionToFirestore } from "@/lib/firebase";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  innerThought?: string | null;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  frames?: string[];
  mediaType?: string;
}

interface CharacterChatProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
}

const CHAT_MODELS = [
  { id: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen (Balanced)" },
  { id: "gemini-4-argon", label: "Gemini 4 Argon (Interactive)" },
  { id: "gemini-4-carbon", label: "Gemini 4 Carbon (Deep Reasoning)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite (Fast)" },
] as const;

const LIVE_VOICES = ["Kore", "Zephyr", "Puck", "Charon", "Fenrir"] as const;

const GEN_TYPES = [
  { id: "portrait", label: "Portrait", minInt: 0 },
  { id: "lingerie", label: "Lingerie", minInt: 20 },
  { id: "nude", label: "Nude", minInt: 40 },
  { id: "explicit", label: "Explicit", minInt: 60 },
  { id: "video", label: "Motion Video", minInt: 50 },
] as const;

const POSES = [
  "looking at viewer, seductive expression",
  "lying on bed, inviting pose",
  "from behind, looking over shoulder",
  "in shower, wet skin, steam",
  "kneeling, upward gaze",
  "close-up face, parted lips",
  "standing mirror selfie",
  "straddling, intimate angle",
  "on all fours, arched back",
  "legs spread, explicit view",
  "bent over, looking back",
  "riding, intense eye contact",
  "hands bound, submissive",
  "against the wall, passionate",
  "in lingerie, teasing undress",
];

export function CharacterChat({ character, romanceMode, onBack }: CharacterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: character.initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<(typeof CHAT_MODELS)[number]["id"]>(
    "gemini-4-hydrogen",
  );
  const [genOpen, setGenOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mindMapOpen, setMindMapOpen] = useState(false);

  // Nomi-style Mind Map & DreamGF/Kindroid Roleplay Director state
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>("desire");
  const [outfitId, setOutfitId] = useState<string>(WARDROBE_OPTIONS[0].id);
  const [sceneId, setSceneId] = useState<string>(SCENE_LOCATIONS[0].id);
  const [showInnerThoughts, setShowInnerThoughts] = useState<boolean>(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceName, setVoiceName] = useState<(typeof LIVE_VOICES)[number]>("Kore");
  const [voicePrompt, setVoicePrompt] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Ready for Gemini 3.8 Live voice conversation.");

  const [genType, setGenType] = useState<(typeof GEN_TYPES)[number]["id"]>("portrait");
  const [pose, setPose] = useState(POSES[0]);
  const [extra, setExtra] = useState("");
  const [dualId, setDualId] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);

  const [aiMode, setAiMode] = useState<string | null>(null);
  const [coins, setCoinsState] = useState(500);
  const [intimacy, setIntimacy] = useState(character.intimacy);
  const [giftIds, setGiftIds] = useState<string[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [moodTick, setMoodTick] = useState(0);
  const sessionStartRef = useRef<number>(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeOutfit = useMemo(
    () => WARDROBE_OPTIONS.find((w) => w.id === outfitId) || WARDROBE_OPTIONS[0],
    [outfitId],
  );
  const activeScene = useMemo(
    () => SCENE_LOCATIONS.find((s) => s.id === sceneId) || SCENE_LOCATIONS[0],
    [sceneId],
  );

  const baseAvatarSrc =
    character.avatar.startsWith("data:") || character.avatar.startsWith("/")
      ? character.avatar
      : characterPortraitUrl(character.id, character.figure, "seductive");

  const [displayedAvatar, setDisplayedAvatar] = useState(baseAvatarSrc);

  const moodState = useMemo(
    () =>
      computeMoodState({
        character,
        messages,
        durationSeconds,
        intimacy,
        romanceMode,
        giftCount: giftIds.length,
        periodicPhase: moodTick,
      }),
    [character, messages, durationSeconds, intimacy, romanceMode, giftIds.length, moodTick],
  );

  // Periodically update conversation duration & Mood Engine phase every 15 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      setMoodTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Update dynamic portrait appearance when moodState.portraitMood changes
  useEffect(() => {
    if (character.avatar.startsWith("data:")) {
      setDisplayedAvatar(character.avatar);
      return;
    }
    const targetUrl = characterPortraitUrl(
      character.id,
      character.figure,
      moodState.portraitMood,
    );
    setDisplayedAvatar(targetUrl);
  }, [character.id, character.figure, character.avatar, moodState.portraitMood]);

  useEffect(() => {
    const saved = loadChat(character.id);
    if (saved.length > 0) setMessages(saved);
    else setMessages([{ role: "assistant", content: character.initialMessage }]);
    setInput("");
    sessionStartRef.current = Date.now();
    setDurationSeconds(0);
    setMoodTick(0);
    setDisplayedAvatar(baseAvatarSrc);
    setIntimacy(getIntimacy(character.id, character.intimacy));
    setGiftIds(getGiftsFor(character.id));
    setMemories(loadMemories(character.id));
    const rpCtx = loadRoleplayContext(character.id);
    setOutfitId(rpCtx.outfitId);
    setSceneId(rpCtx.sceneId);
    setShowInnerThoughts(rpCtx.showInnerThoughts);
  }, [character.id, character.initialMessage, character.intimacy, baseAvatarSrc]);

  useEffect(() => {
    saveRoleplayContext(character.id, { outfitId, sceneId, showInnerThoughts });
  }, [character.id, outfitId, sceneId, showInnerThoughts]);

  useEffect(() => {
    if (messages.length > 0) {
      saveChat(character.id, messages);
      const last = messages[messages.length - 1]?.content || character.initialMessage;
      void syncChatSessionToFirestore({
        characterId: character.id,
        intimacy,
        gifts: giftIds,
        lastMessage: last,
      }).catch(() => {});
    }
  }, [messages, character.id, character.initialMessage, intimacy, giftIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, genLoading]);

  useEffect(() => {
    setCoinsState(getCoins());
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setAiMode(d.premium ? "premium" : "free"))
      .catch(() => setAiMode("free"));
  }, []);

  // She texts first when intimacy is high and chat is short
  useEffect(() => {
    if (intimacy < 70 || messages.length > 3) return;
    const t = setTimeout(() => {
      setMessages((m) => {
        if (m.length > 3) return m;
        if (m.some((x) => x.content.includes("reached out first"))) return m;
        return [
          ...m,
          {
            role: "assistant",
            content: `(She reached out first.) Missed you. Intimacy is ${intimacy}% — want a photo, or should I talk dirty?`,
          },
        ];
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [character.id, intimacy, messages.length]);

  const refreshCoins = () => setCoinsState(getCoins());

  const requestAssistantReply = async (
    historyToUse: ChatMessage[],
    currentMemories: MemoryNode[],
    directorNote?: "spicier" | "romantic",
  ) => {
    const elapsedNow = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    setDurationSeconds(elapsedNow);
    setIsLoading(true);

    const activeMood = computeMoodState({
      character,
      messages: historyToUse,
      durationSeconds: elapsedNow,
      intimacy,
      romanceMode,
      giftCount: giftIds.length,
      periodicPhase: moodTick,
    });

    const lastUserMsg =
      [...historyToUse].reverse().find((m) => m.role === "user")?.content || "Tell me more";

    let reply = fallbackReply(character, lastUserMsg, romanceMode, activeMood);
    let innerThought: string | null = showInnerThoughts
      ? buildInnerMonologue({
          characterName: character.name,
          moodLabel: activeMood.label,
          outfitLabel: activeOutfit.label,
          sceneLabel: activeScene.label,
          intimacy,
        })
      : null;

    const giftLines = giftIds
      .map((id) => GIFTS.find((g) => g.id === id)?.line)
      .filter(Boolean);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: historyToUse.map(({ role, content }) => ({ role, content })),
          characterId: character.id,
          romanceMode,
          intimacy,
          durationSeconds: elapsedNow,
          moodState: activeMood,
          gifts: giftLines,
          memories: currentMemories.map((m) => m.text),
          outfitLabel: activeOutfit.label,
          sceneLabel: activeScene.label,
          showInnerThoughts,
          directorNote,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reply?: string; innerThought?: string | null };
        if (typeof data.reply === "string" && data.reply.trim()) reply = data.reply;
        if (data.innerThought !== undefined) innerThought = data.innerThought;
      }
    } catch {
      /* fallback */
    }

    setMessages([...historyToUse, { role: "assistant", content: reply, innerThought }]);
    setIntimacy(bumpIntimacy(character.id, 2));
    setIsLoading(false);
    const moodVoice = {
      ...character.voice,
      rate:
        activeMood.mood === "excited"
          ? Math.min(1.25, character.voice.rate + 0.08)
          : activeMood.mood === "shy" || activeMood.mood === "devoted"
            ? Math.max(0.75, character.voice.rate - 0.06)
            : character.voice.rate,
    };
    speak(reply, moodVoice);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    // Auto-extract persistent Nomi-style Mind Map memories from user message
    const updatedMemories = extractMemoriesFromMessage(text, memories);
    if (updatedMemories.length !== memories.length) {
      setMemories(updatedMemories);
      saveMemories(character.id, updatedMemories);
    }

    await requestAssistantReply(nextMessages, updatedMemories);
  };

  /** DreamGF / Kindroid: Reroll or escalate the last assistant message */
  const handleRerollLastReply = async (directorNote?: "spicier" | "romantic") => {
    if (isLoading || messages.length === 0) return;
    const trimmed =
      messages[messages.length - 1]?.role === "assistant" && messages.length > 1
        ? messages.slice(0, -1)
        : messages;
    await requestAssistantReply(trimmed, memories, directorNote);
  };

  /** Candy.ai: One-tap Contextual Selfie matching current Outfit + Scene + Mood */
  const handleAskContextualSelfie = async () => {
    if (genLoading) return;
    const selfieType =
      activeOutfit.id === "bare-skin" && intimacy >= 40
        ? "nude"
        : intimacy >= 20
          ? "lingerie"
          : "portrait";
    const cost = 8;
    if (!spendCoins(cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Need ${cost} coins for an instant contextual selfie.` },
      ]);
      refreshCoins();
      return;
    }
    refreshCoins();
    setGenLoading(true);
    try {
      const contextualExtra = `${activeOutfit.prompt}, ${activeScene.prompt}, ${moodState.label.toLowerCase()} expression`;
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          type: selfieType,
          pose: "standing mirror selfie, looking at viewer",
          extra: contextualExtra,
        }),
      });
      const data = await res.json();
      if (data.url) {
        addToGallery({
          characterId: character.id,
          characterName: character.name,
          type: selfieType,
          url: data.url,
          prompt: data.prompt,
        });
        setMessages((m) => [
          ...m,
          { role: "user", content: "📸 Send me a selfie right now." },
          {
            role: "assistant",
            innerThought: showInnerThoughts
              ? `Posing in ${activeOutfit.label.toLowerCase()} inside the ${activeScene.label.toLowerCase()} just for you.`
              : null,
            content: `Just took this for you in the ${activeScene.label.toLowerCase()} (${activeOutfit.label}). Do you like what you see?`,
            imageUrl: data.url,
            mediaType: selfieType,
          },
        ]);
        setIntimacy(bumpIntimacy(character.id, 3));
      }
    } catch {
      /* ignore */
    } finally {
      setGenLoading(false);
      refreshCoins();
    }
  };

  const handleAddCustomMemory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newMemoryText.trim();
    if (!cleaned) return;
    const next: MemoryNode[] = [
      {
        id: `mem-${Date.now()}`,
        category: newMemoryCategory,
        text: cleaned.slice(0, 90),
        createdAt: Date.now(),
      },
      ...memories,
    ].slice(0, 25);
    setMemories(next);
    saveMemories(character.id, next);
    setNewMemoryText("");
  };

  const handleDeleteMemory = (id: string) => {
    const next = memories.filter((m) => m.id !== id);
    setMemories(next);
    saveMemories(character.id, next);
  };

  const handleSaveEditedMessage = (index: number) => {
    const cleaned = editingText.trim();
    if (!cleaned) return;
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, content: cleaned } : m)),
    );
    setEditingIndex(null);
    setEditingText("");
  };

  const handleVoiceTurn = async (spokenText: string) => {
    const cleaned = spokenText.trim() || "Whisper something intimate to me.";
    setVoiceBusy(true);
    setVoiceStatus(`Streaming to Gemini 3.8 Live (${voiceName})…`);
    try {
      const res = await fetch("/api/live-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          transcript: cleaned,
          romanceMode,
          intimacy,
          durationSeconds,
          voiceName,
        }),
      });
      const data = await res.json();
      const replyText =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply
          : fallbackReply(character, cleaned, romanceMode, moodState);

      setMessages((m) => [
        ...m,
        { role: "user", content: `🎙️ ${cleaned}` },
        {
          role: "assistant",
          content: replyText,
          audioUrl: data.audioUrl,
        },
      ]);
      setIntimacy(bumpIntimacy(character.id, 3));
      setVoiceStatus(`${character.name.split(" ")[0]} responded via Live Voice.`);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        void audio.play().catch(() => {
          speak(replyText, character.voice);
        });
      } else {
        speak(replyText, character.voice);
      }
    } catch {
      setVoiceStatus("Voice turn completed via local speech synthesizer.");
    } finally {
      setVoiceBusy(false);
      setVoicePrompt("");
    }
  };

  const startBrowserMicCapture = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      void handleVoiceTurn(voicePrompt || "Tell me how much you want me tonight.");
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setVoiceActive(true);
      setVoiceStatus("Listening to your microphone… speak now.");
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        setVoiceActive(false);
        if (transcript) {
          void handleVoiceTurn(transcript);
        }
      };
      recognition.onerror = () => {
        setVoiceActive(false);
        void handleVoiceTurn(voicePrompt || "Talk closely to me.");
      };
      recognition.onend = () => {
        setVoiceActive(false);
      };
      recognition.start();
    } catch {
      setVoiceActive(false);
      void handleVoiceTurn(voicePrompt || "Talk closely to me.");
    }
  };

  const handleGenerateMusicInChat = async () => {
    if (musicLoading) return;
    setMusicLoading(true);
    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "lyria-3-clip-preview",
          prompt: `Sensual ${moodState.label.toLowerCase()} bedroom R&B soundtrack for ${character.name} in ${activeScene.label}, slow velvet pulse`,
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `I put on a mood track for us (${moodState.label} vibe in the ${activeScene.label.toLowerCase()}). Press play and come closer.`,
            audioUrl: data.audioUrl,
            mediaType: "music",
          },
        ]);
      }
    } catch {
      /* ignore */
    } finally {
      setMusicLoading(false);
    }
  };

  const handleUploadReferencePhoto = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const runGenerate = async (type: (typeof GEN_TYPES)[number]["id"], overrideDual = dualId) => {
    if (genLoading) return;
    const meta = GEN_TYPES.find((t) => t.id === type);
    if (meta && intimacy < meta.minInt) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Undress ladder: need ${meta.minInt}% intimacy for ${meta.label} (you have ${intimacy}%). Chat more or send a gift.`,
        },
      ]);
      setGenOpen(false);
      return;
    }
    const cost = (GEN_COST[type] ?? 15) + (overrideDual ? 15 : 0);
    if (!spendCoins(cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Not enough coins (${cost} needed). Claim daily or swipe more.` },
      ]);
      setGenOpen(false);
      refreshCoins();
      return;
    }
    refreshCoins();
    setGenLoading(true);
    setGenType(type);
    const dual = overrideDual ? CHARACTERS.find((c) => c.id === overrideDual) : null;
    const dualExtra = dual
      ? `, two women together, ${character.name} and ${dual.name}, dual girl intimate scene`
      : "";
    const sceneAndWardrobeContext = `, ${activeOutfit.prompt}, ${activeScene.prompt}`;
    try {
      if (type === "video") {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            pose,
            aspectRatio: videoAspectRatio,
            referenceImageBase64: uploadedPhotoDataUrl || undefined,
            prompt: `${extra || pose}${sceneAndWardrobeContext}${dualExtra}`,
          }),
        });
        const data = await res.json();
        const url = data.videoUrl || data.imageUrl;
        const frames: string[] | undefined = Array.isArray(data.frames) ? data.frames : undefined;
        if (url || frames?.length) {
          addToGallery({
            characterId: character.id,
            characterName: character.name,
            type: "video",
            url: url || frames![0],
            frames,
            prompt: data.promptUsed,
          });
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: uploadedPhotoDataUrl
                ? `Animated your reference photo into a ${videoAspectRatio} motion sequence.`
                : dual
                  ? `Two-girl ${videoAspectRatio} sequence with ${dual.name.split(" ")[0]}. Want another angle?`
                  : `Here's your ${videoAspectRatio} motion scene in the ${activeScene.label.toLowerCase()}. Want it hotter?`,
              videoUrl: url,
              frames,
              mediaType: "video",
            },
          ]);
          setIntimacy(bumpIntimacy(character.id, 4));
        }
      } else {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: character.id,
            type,
            pose,
            extra: `${extra}${sceneAndWardrobeContext}${dualExtra}`,
            dual: dual?.figure || "",
            referenceImageBase64: uploadedPhotoDataUrl || undefined,
          }),
        });
        const data = await res.json();
        if (data.url) {
          addToGallery({
            characterId: character.id,
            characterName: character.name,
            type,
            url: data.url,
            prompt: data.prompt,
          });
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: uploadedPhotoDataUrl
                ? "Edited your photo with Nano Banana 2.1 — how do I look?"
                : dual
                  ? `With ${dual.name.split(" ")[0]} — how do we look?`
                  : `Taken in the ${activeScene.label.toLowerCase()} — how do I look?`,
              imageUrl: data.url,
              mediaType: type,
            },
          ]);
          setIntimacy(bumpIntimacy(character.id, 3));
        }
      }
      setGenOpen(false);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Generation failed — wait ~30s." },
      ]);
    } finally {
      setGenLoading(false);
      refreshCoins();
    }
  };

  const sendGift = (giftId: string) => {
    const g = GIFTS.find((x) => x.id === giftId);
    if (!g) return;
    if (!spendCoins(g.cost)) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Need ${g.cost} coins to send ${g.name}. Claim daily or swipe.` },
      ]);
      setGiftOpen(false);
      return;
    }
    const next = addGift(character.id, g.id);
    setGiftIds(next);
    refreshCoins();
    const nextIntimacy = bumpIntimacy(character.id, 5);
    setIntimacy(nextIntimacy);
    const replyLine = `She notices the ${g.name.toLowerCase()}. ${g.line} “Thank you… I'll remember that.”`;
    setMessages((m) => [
      ...m,
      { role: "user", content: `(Sent gift: ${g.name})` },
      { role: "assistant", content: replyLine },
    ]);
    void syncChatSessionToFirestore({
      characterId: character.id,
      intimacy: nextIntimacy,
      gifts: next,
      lastMessage: replyLine,
    }).catch(() => {});
    setGiftOpen(false);
  };

  const costLabel = (GEN_COST[genType] ?? 15) + (dualId ? 15 : 0);

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span>
          {aiMode === "premium" ? "Gemini 4 Active." : "Mood AI Active."} Chat synced · intimacy{" "}
          {intimacy}% · {coins} coins
          {giftIds.length > 0 ? ` · gifts: ${giftIds.length}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="chat-model-select" className="text-[11px] text-zinc-500">
            Model:
          </label>
          <select
            id="chat-model-select"
            aria-label="Select Gemini chat model"
            value={selectedModel}
            onChange={(e) =>
              setSelectedModel(e.target.value as (typeof CHAT_MODELS)[number]["id"])
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-pink-200"
          >
            {CHAT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button onClick={onBack} className="text-pink-400 text-sm shrink-0">
          ← Profile
        </button>
        <div className="relative shrink-0">
          <div
            aria-hidden="true"
            className="absolute -inset-1 rounded-full blur-sm transition-all duration-700"
            style={{ background: moodState.auraColor }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayedAvatar}
            alt={`${character.name} (${moodState.label})`}
            onError={(e) => {
              e.currentTarget.src = character.avatar.startsWith("/")
                ? character.avatar
                : "/avatars/maren.svg";
            }}
            style={{
              filter: moodState.avatarFilter,
              boxShadow: `0 0 22px ${moodState.auraColor}`,
            }}
            className={`relative w-12 h-12 rounded-full object-cover bg-zinc-800 transition-all duration-700 ${
              moodState.mood === "excited" || moodState.mood === "flirty" ? "scale-105" : ""
            } ${moodState.ringClass}`}
          />
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${moodState.dotClass} animate-pulse`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm truncate">
              {character.name}, {character.age}
            </span>
            <span
              data-testid="mood-status-badge"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-500 ${moodState.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${moodState.dotClass}`} />
              {moodState.statusText}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <div
              className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden max-w-[9rem]"
              title={`Closeness ${intimacy}%`}
            >
              <div
                className="h-full bg-gradient-to-r from-pink-600 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${intimacy}%` }}
              />
            </div>
            <span data-testid="mood-engine-meta" className="text-[11px] text-zinc-400">
              Style: <span className="text-zinc-200">{moodState.styleTag}</span> · Intensity{" "}
              {moodState.intensity}% · {Math.max(1, Math.ceil((durationSeconds + 1) / 60))}m
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMindMapOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 text-violet-200 text-xs"
        >
          <Brain className="h-3.5 w-3.5" /> Mind Map ({memories.length})
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs"
        >
          <PhoneCall className="h-3.5 w-3.5" /> Live Voice
        </button>
        <button
          type="button"
          disabled={musicLoading}
          onClick={() => void handleGenerateMusicInChat()}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 text-xs disabled:opacity-50"
        >
          <Music className="h-3.5 w-3.5" /> {musicLoading ? "Scoring…" : "Mood Music"}
        </button>
        <button
          type="button"
          onClick={() => setGiftOpen(true)}
          className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-200 text-xs"
        >
          Gift
        </button>
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-medium"
        >
          Generate / Animate
        </button>
      </div>

      {/* Roleplay Director Bar: Wardrobe, Scene Location, Inner Thoughts & Instant Contextual Selfie */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5">
            <Shirt className="h-3.5 w-3.5 text-pink-400" />
            <select
              aria-label="Select companion outfit"
              value={outfitId}
              onChange={(e) => setOutfitId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-pink-100"
            >
              {WARDROBE_OPTIONS.map((w) => (
                <option key={w.id} value={w.id}>
                  Outfit: {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-fuchsia-400" />
            <select
              aria-label="Select scene location"
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-fuchsia-100"
            >
              {SCENE_LOCATIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  Scene: {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowInnerThoughts((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
              showInnerThoughts
                ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                : "border-zinc-800 bg-zinc-950 text-zinc-500"
            }`}
          >
            💭 Inner Thoughts: {showInnerThoughts ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={genLoading}
            onClick={() => void handleAskContextualSelfie()}
            className="inline-flex items-center gap-1 rounded-xl border border-pink-500/40 bg-pink-500/20 px-2.5 py-1 text-[11px] font-medium text-pink-100 hover:bg-pink-500/30 disabled:opacity-50"
          >
            <Camera className="h-3 w-3" /> Ask for Selfie (8c)
          </button>
        </div>
      </div>

      {/* Quick generate strip */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {(["lingerie", "nude", "explicit", "video"] as const).map((t) => {
          const meta = GEN_TYPES.find((x) => x.id === t)!;
          const locked = intimacy < meta.minInt;
          return (
            <button
              key={t}
              type="button"
              disabled={genLoading || locked}
              onClick={() => void runGenerate(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                locked
                  ? "border-zinc-800 text-zinc-600"
                  : "border-pink-500/40 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20"
              }`}
            >
              {meta.label}
              {locked ? " 🔒" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-3">
        {messages.map((message, index) => {
          const isLastAssistant =
            message.role === "assistant" && index === messages.length - 1;
          return (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                message.role === "assistant"
                  ? "bg-zinc-900 text-zinc-100"
                  : "bg-pink-600 text-white ml-auto"
              }`}
            >
              {message.role === "assistant" && showInnerThoughts && message.innerThought && (
                <div
                  data-testid="inner-thought-bubble"
                  className="mb-2 rounded-xl border border-violet-500/30 bg-violet-950/40 px-2.5 py-1.5 text-xs italic text-violet-200"
                >
                  💭 {message.innerThought}
                </div>
              )}
              {message.imageUrl && !message.frames?.length && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.imageUrl}
                  alt=""
                  className="rounded-xl mb-2 max-h-80 w-full object-cover"
                />
              )}
              {message.frames && message.frames.length > 0 && (
                <div className="mb-2 max-w-xs">
                  <MotionSequencePlayer frames={message.frames} />
                </div>
              )}
              {message.videoUrl && message.videoUrl.startsWith("data:video/") && (
                <video
                  src={message.videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="rounded-xl mb-2 max-h-80 w-full object-cover"
                />
              )}
              {message.audioUrl && (
                <audio src={message.audioUrl} controls className="mb-2 h-8 w-full max-w-xs" />
              )}

              {editingIndex === index ? (
                <div className="space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-pink-500/40 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEditedMessage(index)}
                      className="inline-flex items-center gap-1 rounded-lg bg-pink-600 px-2.5 py-1 text-xs text-white"
                    >
                      <Check className="h-3 w-3" /> Save Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p>{message.content}</p>
              )}

              {message.role === "assistant" && editingIndex !== index && (
                <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-white/5 pt-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => speak(message.content, character.voice)}
                    className="text-pink-300 hover:text-pink-200"
                  >
                    Speak
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIndex(index);
                      setEditingText(message.content);
                    }}
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  {isLastAssistant && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleRerollLastReply()}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                      >
                        <RotateCcw className="h-3 w-3" /> Reroll
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleRerollLastReply("spicier")}
                        className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 disabled:opacity-40"
                      >
                        <Flame className="h-3 w-3" /> Make It Spicier
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(isLoading || genLoading) && (
          <p className="text-xs text-zinc-500">
            {genLoading ? "Generating media…" : "She's writing…"}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="shrink-0 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-pink-400"
          title="Generate or Animate Media"
        >
          📷
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="shrink-0 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center"
          title="Live Voice Conversation"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${character.name.split(" ")[0]} (she remembers your name & kinks)`}
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 rounded-xl bg-pink-600 text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {/* NOMI-STYLE MIND MAP / LONG-TERM MEMORY DRAWER */}
      {mindMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMindMapOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-violet-500/40 bg-zinc-950 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="font-semibold text-base text-white">
                    {character.name.split(" ")[0]}&apos;s Mind Map
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Persistent relationship memory & persona facts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMindMapOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomMemory} className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value as MemoryCategory)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-violet-200"
                >
                  <option value="nickname">Nickname</option>
                  <option value="desire">Turn-On / Kink</option>
                  <option value="memory">Shared Moment</option>
                  <option value="persona">Persona Rule</option>
                </select>
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Add fact (e.g. Call me Sir, loves slow teasing)…"
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </form>

            {memories.length === 0 ? (
              <p className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-xs text-zinc-400 text-center">
                No memories logged yet. Tell {character.name.split(" ")[0]} your name (&ldquo;Call me…&rdquo;) or what turns you on (&ldquo;I love when you…&rdquo;), or add a memory above!
              </p>
            ) : (
              <ul className="space-y-2">
                {memories.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-violet-500/20 bg-violet-950/20 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="uppercase tracking-wider text-[10px] text-violet-300 font-semibold mr-2">
                        [{m.category}]
                      </span>
                      <span className="text-zinc-100">{m.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(m.id)}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* LIVE VOICE CALL MODAL (Gemini 3.8 Live) */}
      {voiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setVoiceOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/30 bg-zinc-950 p-6 space-y-4 text-center">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Gemini 3.8 Live Voice Session
              </span>
              <button
                type="button"
                onClick={() => setVoiceOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto relative w-24 h-24">
              <div
                className={`absolute -inset-2 rounded-full blur-md transition-all ${
                  voiceActive || voiceBusy ? "bg-emerald-500/40 scale-110" : "bg-pink-500/25"
                }`}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayedAvatar}
                alt={character.name}
                className="relative w-24 h-24 rounded-full object-cover border-2 border-emerald-400/50"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">{character.name}</h3>
              <p className="text-xs text-zinc-400 mt-1">{voiceStatus}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {LIVE_VOICES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVoiceName(v)}
                  className={`rounded-full px-2.5 py-1 text-[11px] border ${
                    voiceName === v
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-zinc-800 text-zinc-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={voicePrompt}
                onChange={(e) => setVoicePrompt(e.target.value)}
                placeholder="Or type what to say aloud…"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                disabled={voiceBusy}
                onClick={() => void handleVoiceTurn(voicePrompt)}
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                Speak Turn
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={voiceBusy}
                onClick={startBrowserMicCapture}
                className={`flex-1 py-3 rounded-2xl font-medium text-xs inline-flex items-center justify-center gap-2 ${
                  voiceActive
                    ? "bg-red-600 text-white"
                    : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200"
                }`}
              >
                {voiceActive ? (
                  <>
                    <MicOff className="h-4 w-4" /> Listening…
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" /> Push to Talk (Mic)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setVoiceOpen(false)}
                className="py-3 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 inline-flex items-center gap-1"
              >
                <PhoneOff className="h-3.5 w-3.5" /> End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE / EDIT IMAGE & ANIMATE VIDEO MODAL */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGenOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-pink-400" /> Create, Edit & Animate Media
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Nano Banana 2.1 Images & Omni 1.2 Flash Videos ({intimacy}% intimacy)
                </p>
              </div>
              <button type="button" onClick={() => setGenOpen(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {GEN_TYPES.map((t) => {
                const locked = intimacy < t.minInt;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => !locked && setGenType(t.id)}
                    className={`px-2 py-2 rounded-xl text-xs font-medium border ${
                      genType === t.id
                        ? "border-pink-500 bg-pink-500/15 text-pink-200"
                        : locked
                          ? "border-zinc-800 text-zinc-600"
                          : "border-zinc-800 text-zinc-300"
                    }`}
                  >
                    {t.label}
                    {locked ? " 🔒" : ""}
                  </button>
                );
              })}
            </div>

            {/* Optional Reference Photo Upload for Image Editing or Photo-to-Video Animation */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">
                  {genType === "video"
                    ? "Animate Reference Photo to Video (Optional)"
                    : "Edit Reference Photo (Optional)"}
                </span>
                {uploadedPhotoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setUploadedPhotoDataUrl(null)}
                    className="text-[11px] text-rose-400"
                  >
                    Clear Photo
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-pink-500/40 bg-pink-500/10 py-2.5 px-3 text-xs text-pink-200 cursor-pointer hover:bg-pink-500/20">
                <Upload className="h-3.5 w-3.5" />
                {uploadedPhotoDataUrl
                  ? "Reference photo attached ✓"
                  : "Upload photo to edit or animate"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadReferencePhoto(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {genType === "video" && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Video Aspect Ratio (Omni Flash)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["9:16", "16:9"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setVideoAspectRatio(ratio)}
                      className={`py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 ${
                        videoAspectRatio === ratio
                          ? "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-200"
                          : "border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Film className="h-3.5 w-3.5" />
                      {ratio === "9:16" ? "9:16 Portrait" : "16:9 Landscape"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-500 block mb-1">Dual-girl (optional)</label>
              <select
                value={dualId}
                onChange={(e) => setDualId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Solo</option>
                {CHARACTERS.filter((c) => c.id !== character.id).map((c) => (
                  <option key={c.id} value={c.id}>
                    + {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Pose & Motion</label>
              <select
                value={pose}
                onChange={(e) => setPose(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                {POSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Prompt / Edit instruction: candlelight, silk robe, slow arch…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Cost</span>
              <span className="text-amber-300">{costLabel} coins</span>
            </div>
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void runGenerate(genType)}
              className="w-full py-3 rounded-2xl bg-pink-600 font-medium disabled:opacity-50"
            >
              {genLoading
                ? "Rendering…"
                : genType === "video"
                  ? uploadedPhotoDataUrl
                    ? `Animate Photo to ${videoAspectRatio} Video`
                    : `Generate ${videoAspectRatio} Video`
                  : uploadedPhotoDataUrl
                    ? "Edit Image with Prompt"
                    : `Generate ${genType}`}
            </button>
          </div>
        </div>
      )}

      {giftOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGiftOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-lg">Send a gift</h3>
            <p className="text-xs text-zinc-500">She remembers gifts in this browser. +intimacy.</p>
            {GIFTS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => sendGift(g.id)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm hover:border-pink-500/40"
              >
                <span>
                  {g.name}
                  {giftIds.includes(g.id) ? " ✓" : ""}
                  <span className="block text-[11px] text-zinc-500">{g.tag}</span>
                </span>
                <span className="text-amber-300 text-xs">{g.cost} ◆</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
