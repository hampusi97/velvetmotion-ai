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
} from "@/lib/storage";
import { GIFTS, getGiftsFor, addGift } from "@/lib/gifts";
import { characterMediaUrl, type MediaMood } from "@/lib/media";
import { syncChatSessionToFirestore } from "@/lib/firebase";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

// NOTE: Full file restored in subsequent commit if truncated. Key features: vault pin, NSFW chips.
export function CharacterChat({ character, romanceMode, onBack }: { character: Character; romanceMode: boolean; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <button onClick={onBack}>Back</button>
      <h1>{character.name}</h1>
      <p>Chat loading — full CharacterChat with vault + chips is being restored.</p>
    </div>
  );
}
