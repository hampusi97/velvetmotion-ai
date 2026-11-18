/** Lightweight share / import for custom girls — localStorage first, Firebase optional later. */

import type { Character } from "./charactersTypes";

const SHARED_KEY = "velvet-shared-girls";
const CUSTOM_KEY = "velvet-custom-girls";

export type ShareableGirl = Pick<
  Character,
  | "id"
  | "name"
  | "age"
  | "tagline"
  | "category"
  | "avatar"
  | "voiceIntro"
  | "initialMessage"
  | "tags"
  | "intimacy"
  | "voice"
  | "personality"
  | "traits"
  | "background"
  | "figure"
  | "kink"
  | "reply"
>;

/** Encode a girl to a compact share code (base64 JSON). */
export function encodeShareCode(girl: ShareableGirl): string {
  const payload = {
    v: 1,
    ...girl,
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return "";
  }
}

/** Decode a share code back to a girl. Returns null on failure. */
export function decodeShareCode(code: string): ShareableGirl | null {
  try {
    const raw = decodeURIComponent(escape(atob(code.trim())));
    const data = JSON.parse(raw);
    if (!data || !data.name || !data.id) return null;
    return {
      id: data.id.startsWith("custom-") ? data.id : `custom-${Date.now()}`,
      name: String(data.name).slice(0, 40),
      age: Number(data.age) || 24,
      tagline: String(data.tagline || "").slice(0, 120),
      category: String(data.category || "Custom"),
      avatar: String(data.avatar || ""),
      voiceIntro: String(data.voiceIntro || `Hey… it's ${data.name}.`),
      initialMessage: String(data.initialMessage || `Hi, I'm ${data.name}.`),
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 8) : ["Custom"],
      intimacy: Math.min(100, Math.max(0, Number(data.intimacy) || 55)),
      voice: data.voice || { label: "Warm", pitch: 1.05, rate: 0.95, style: "Warm" },
      personality: String(data.personality || "Playful"),
      traits: Array.isArray(data.traits) ? data.traits : ["Custom"],
      background: String(data.background || "Shared fictional adult."),
      figure: String(data.figure || "beautiful adult woman"),
      kink: String(data.kink || "Teasing"),
      reply: String(data.reply || `She smiles. “I'm ${data.name}.”`),
    };
  } catch {
    return null;
  }
}

/** Save a girl into the local custom list. */
export function saveCustomGirl(girl: ShareableGirl) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const list: ShareableGirl[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((g) => g.id !== girl.id);
    filtered.unshift(girl);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(filtered.slice(0, 40)));
  } catch {
    /* quota */
  }
}

/** Load all local custom girls. */
export function loadCustomGirls(): ShareableGirl[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Copy share code to clipboard. */
export async function copyShareCode(girl: ShareableGirl): Promise<boolean> {
  const code = encodeShareCode(girl);
  if (!code) return false;
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}
