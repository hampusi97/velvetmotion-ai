import { clampVoice } from "@/lib/speech-text.mjs";

const FAVORITES_KEY = "velvet-favorites";
const AUTOPLAY_KEY = "velvet-autoplay";
const VOICE_KEY = "velvet-voice-prefs";
const CHATS_KEY = "velvet-chats";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  choices?: string[];
  createdAt: string;
};

export type VoicePrefs = {
  voiceURI: string;
  pitch: number;
  rate: number;
};

type ChatRecord = {
  updatedAt: string;
  messages: StoredMessage[];
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private mode. The conversation still works for this visit.
  }
}

export function loadFavorites() {
  const ids = readJson<unknown>(FAVORITES_KEY, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export function saveFavorites(ids: string[]) {
  writeJson(FAVORITES_KEY, ids);
}

export function loadAutoplay() {
  return readJson<unknown>(AUTOPLAY_KEY, false) === true;
}

export function saveAutoplay(enabled: boolean) {
  writeJson(AUTOPLAY_KEY, enabled);
}

export function loadVoicePrefs(id: string, fallback: { pitch: number; rate: number }): VoicePrefs {
  const all = readJson<Record<string, Partial<VoicePrefs>>>(VOICE_KEY, {});
  const saved = all[id] || {};
  const clamped = clampVoice(saved.pitch ?? fallback.pitch, saved.rate ?? fallback.rate);
  return {
    voiceURI: typeof saved.voiceURI === "string" ? saved.voiceURI : "",
    pitch: clamped.pitch,
    rate: clamped.rate,
  };
}

export function saveVoicePrefs(id: string, prefs: VoicePrefs) {
  const all = readJson<Record<string, VoicePrefs>>(VOICE_KEY, {});
  const clamped = clampVoice(prefs.pitch, prefs.rate);
  all[id] = { voiceURI: prefs.voiceURI, pitch: clamped.pitch, rate: clamped.rate };
  writeJson(VOICE_KEY, all);
}

function readChats() {
  const all = readJson<Record<string, ChatRecord>>(CHATS_KEY, {});
  return all && typeof all === "object" ? all : {};
}

export function loadChat(id: string): StoredMessage[] {
  const record = readChats()[id];
  if (!record || !Array.isArray(record.messages)) return [];
  return record.messages.filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string");
}

export function saveChat(id: string, messages: StoredMessage[]) {
  const all = readChats();
  all[id] = {
    updatedAt: new Date().toISOString(),
    messages: messages.slice(-80),
  };
  writeJson(CHATS_KEY, all);
}

export function loadRecentChat() {
  const entries = Object.entries(readChats());
  let recent: { id: string; updatedAt: string } | null = null;
  for (const [id, record] of entries) {
    if (!record?.updatedAt || !Array.isArray(record.messages) || record.messages.length === 0) continue;
    if (!recent || record.updatedAt > recent.updatedAt) {
      recent = { id, updatedAt: record.updatedAt };
    }
  }
  return recent;
}
