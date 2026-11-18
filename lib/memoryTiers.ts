/**
 * Multi-tier companion memory (Haven / Nomi inspired).
 * short  — last N turns (working memory)
 * mid    — session facts / preferences extracted this week
 * long   — durable identity notes the user pins or high-intimacy moments
 */

export type MemoryTier = {
  short: { role: "user" | "assistant"; content: string }[];
  mid: string[];
  long: string[];
  updatedAt: number;
};

const PREFIX = "vm-memory-";
const SHORT_MAX = 24;
const MID_MAX = 40;
const LONG_MAX = 30;

function empty(): MemoryTier {
  return { short: [], mid: [], long: [], updatedAt: Date.now() };
}

export function loadMemory(characterId: string): MemoryTier {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(PREFIX + characterId);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as MemoryTier;
    return {
      short: Array.isArray(parsed.short) ? parsed.short.slice(-SHORT_MAX) : [],
      mid: Array.isArray(parsed.mid) ? parsed.mid.slice(-MID_MAX) : [],
      long: Array.isArray(parsed.long) ? parsed.long.slice(-LONG_MAX) : [],
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch {
    return empty();
  }
}

export function saveMemory(characterId: string, mem: MemoryTier) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PREFIX + characterId,
      JSON.stringify({ ...mem, updatedAt: Date.now() }),
    );
  } catch {
    /* quota */
  }
}

export function pushShort(
  characterId: string,
  role: "user" | "assistant",
  content: string,
) {
  const mem = loadMemory(characterId);
  mem.short = [...mem.short, { role, content: content.slice(0, 500) }].slice(-SHORT_MAX);
  // Light heuristic mid-term extraction
  if (role === "user") {
    const lower = content.toLowerCase();
    if (/(my name is|call me|i like|i hate|i prefer|don't|dont)/.test(lower)) {
      mem.mid = [...mem.mid, content.slice(0, 160)].slice(-MID_MAX);
    }
  }
  saveMemory(characterId, mem);
  return mem;
}

export function pinLong(characterId: string, note: string) {
  const mem = loadMemory(characterId);
  mem.long = [...mem.long, note.slice(0, 200)].slice(-LONG_MAX);
  saveMemory(characterId, mem);
  return mem;
}

/** Inject into system prompt for chat */
export function memoryPromptBlock(characterId: string): string {
  const mem = loadMemory(characterId);
  const parts: string[] = [];
  if (mem.long.length) {
    parts.push("Long-term memory (always honor):\n- " + mem.long.join("\n- "));
  }
  if (mem.mid.length) {
    parts.push("Recent preferences:\n- " + mem.mid.slice(-12).join("\n- "));
  }
  if (mem.short.length) {
    const tail = mem.short
      .slice(-8)
      .map((m) => `${m.role}: ${m.content.slice(0, 120)}`)
      .join("\n");
    parts.push("Recent turns:\n" + tail);
  }
  return parts.join("\n\n");
}
