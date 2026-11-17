/** Client-side coins, gallery, and chat memory (localStorage sync). */

export type GalleryItem = {
  id: string;
  characterId: string;
  characterName: string;
  type: string;
  url: string;
  frames?: string[];
  prompt?: string;
  createdAt: number;
};

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  frames?: string[];
  mediaType?: string;
};

const COINS_KEY = "vm-coins";
const GALLERY_KEY = "vm-gallery";
const CHAT_PREFIX = "vm-chat-";
const INTIMACY_PREFIX = "vm-intimacy-";
const DEFAULT_COINS = 500;

export function getCoins(): number {
  if (typeof window === "undefined") return DEFAULT_COINS;
  try {
    const v = localStorage.getItem(COINS_KEY);
    if (v === null) return DEFAULT_COINS;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.max(0, n) : DEFAULT_COINS;
  } catch {
    return DEFAULT_COINS;
  }
}

export function setCoins(n: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COINS_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    /* private mode */
  }
}

export function spendCoins(cost: number): boolean {
  const current = getCoins();
  if (current < cost) return false;
  setCoins(current - cost);
  return true;
}

export function addCoins(amount: number) {
  setCoins(getCoins() + amount);
}

export function getGallery(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToGallery(item: Omit<GalleryItem, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const full: GalleryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [full, ...getGallery()].slice(0, 200);
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return full;
}

export function clearGallery() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GALLERY_KEY);
  } catch {
    /* */
  }
}

/** Persist chat thread per character (survives refresh). */
export function loadChat(characterId: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_PREFIX + characterId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-80) : [];
  } catch {
    return [];
  }
}

export function saveChat(characterId: string, messages: StoredMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_PREFIX + characterId, JSON.stringify(messages.slice(-80)));
  } catch {
    /* quota */
  }
}

export function getIntimacy(characterId: string, fallback = 50): number {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(INTIMACY_PREFIX + characterId);
    if (v === null) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
  } catch {
    return fallback;
  }
}

export function bumpIntimacy(characterId: string, delta = 2) {
  const next = Math.min(100, getIntimacy(characterId) + delta);
  try {
    localStorage.setItem(INTIMACY_PREFIX + characterId, String(next));
  } catch {
    /* */
  }
  return next;
}

/** Generation costs (coins). Chat is free. */
export const GEN_COST: Record<string, number> = {
  portrait: 8,
  lingerie: 12,
  nude: 15,
  explicit: 20,
  video: 35,
};
