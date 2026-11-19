/** Client-side portrait cache so we don't re-hit Pollinations rate limits. */
const CACHE_KEY = "vm-portrait-cache-v1";
const MAX = 80;

type Entry = { url: string; ts: number };

function load(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(map: Record<string, Entry>) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX) {
      const sorted = keys.sort((a, b) => map[a].ts - map[b].ts);
      for (const k of sorted.slice(0, keys.length - MAX)) delete map[k];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function getCachedPortrait(id: string): string | null {
  if (typeof window === "undefined") return null;
  const map = load();
  return map[id]?.url || null;
}

export function setCachedPortrait(id: string, url: string) {
  if (typeof window === "undefined") return;
  const map = load();
  map[id] = { url, ts: Date.now() };
  save(map);
}

/** Stagger so we don't fire 64 requests at once. */
export function staggeredSrc(id: string, url: string, index: number): string {
  const cached = getCachedPortrait(id);
  if (cached) return cached;
  // First 8 load immediately, rest wait
  if (index < 8) return url;
  return url; // browser will naturally queue; cache on load
}
