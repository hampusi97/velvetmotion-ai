/** Client-side coins, gallery, chat memory. Firebase sync is optional (never required). */

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
const DAILY_KEY = "vm-daily-claim";
const DEFAULT_COINS = 1200;
const DAILY_REWARD = 200;

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
  const clamped = Math.max(0, Math.floor(n));
  try {
    localStorage.setItem(COINS_KEY, String(clamped));
  } catch {
    /* private mode */
  }
  void import("@/lib/firebase")
    .then((m) => m.syncCoinsToFirestore?.(clamped))
    .catch(() => {});
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

/** Once per calendar day — free retention loop. */
export function canClaimDaily(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = localStorage.getItem(DAILY_KEY);
    if (!last) return true;
    const d = new Date(last);
    const now = new Date();
    return d.toDateString() !== now.toDateString();
  } catch {
    return true;
  }
}

export function claimDaily(): number {
  if (!canClaimDaily()) return 0;
  try {
    localStorage.setItem(DAILY_KEY, new Date().toISOString());
  } catch {
    /* */
  }
  addCoins(DAILY_REWARD);
  return DAILY_REWARD;
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
  const validType = (["portrait", "lingerie", "nude", "explicit", "video"].includes(item.type)
    ? item.type
    : "portrait") as "portrait" | "lingerie" | "nude" | "explicit" | "video";
  void import("@/lib/firebase")
    .then((m) =>
      m.saveMediaToFirestore?.({
        id: full.id,
        characterId: full.characterId,
        characterName: full.characterName,
        type: validType,
        url: full.url,
        prompt: full.prompt,
      }),
    )
    .catch(() => {});
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

/** Free-forever generous costs — daily claim + high default coins keep users generating. */
export const GEN_COST: Record<string, number> = {
  portrait: 4,
  beauty: 4,
  seductive: 5,
  lingerie: 6,
  nude: 8,
  explicit: 10,
  sex: 12,
  joi: 10,
  sph: 10,
  bnwo: 12,
  video: 14,
  aftercare: 5,
  dual: 12,
};


const PIN_KEY = "vm-pinned-girls";
export function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
}
export function togglePin(id: string): string[] {
  const cur = getPinned();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  try { localStorage.setItem(PIN_KEY, JSON.stringify(next.slice(0, 20))); } catch {}
  return next;
}


const KINK_KEY = "vm-kink-memory";
export function rememberKink(id: string, kink: string) {
  try {
    const all = JSON.parse(localStorage.getItem(KINK_KEY) || "{}");
    const list = all[id] || [];
    if (!list.includes(kink)) list.push(kink);
    all[id] = list.slice(-8);
    localStorage.setItem(KINK_KEY, JSON.stringify(all));
  } catch {}
}
export function getKinks(id: string): string[] {
  try { return JSON.parse(localStorage.getItem(KINK_KEY) || "{}")[id] || []; } catch { return []; }
}
