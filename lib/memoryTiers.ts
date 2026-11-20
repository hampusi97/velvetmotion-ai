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

function cleanNotes(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const notes: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const note = entry.trim().slice(0, 200);
    const key = note.toLocaleLowerCase();
    if (!note || seen.has(key)) continue;
    seen.add(key);
    notes.push(note);
  }
  return notes.slice(-limit);
}

export function normalizeMemory(value: unknown): MemoryTier {
  if (!value || typeof value !== "object") return empty();
  const parsed = value as Partial<MemoryTier>;
  const short = Array.isArray(parsed.short) ? parsed.short.filter(
    (turn): turn is { role: "user" | "assistant"; content: string } =>
      !!turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string",
  ).slice(-SHORT_MAX).map(turn => ({ role: turn.role, content: turn.content.slice(0, 500) })) : [];
  return {
    short,
    mid: cleanNotes(parsed.mid, MID_MAX),
    long: cleanNotes(parsed.long, LONG_MAX),
    updatedAt: typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
      ? parsed.updatedAt : Date.now(),
  };
}

/** Portable JSON backup; no browser APIs required. */
export function exportMemoryBackup(memory: MemoryTier): string {
  return JSON.stringify({ version: 1, memory: normalizeMemory(memory) }, null, 2);
}

export function importMemoryBackup(json: string): MemoryTier {
  if (json.length > 256_000) throw new Error("Memory backup exceeds 256 KB.");
  const data: unknown = JSON.parse(json);
  if (!data || typeof data !== "object" || (data as { version?: unknown }).version !== 1 ||
      !("memory" in data)) throw new Error("Unsupported memory backup format.");
  return normalizeMemory((data as { memory: unknown }).memory);
}

function empty(): MemoryTier {
  return { short: [], mid: [], long: [], updatedAt: Date.now() };
}

export function loadMemory(characterId: string): MemoryTier {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(PREFIX + characterId);
    if (!raw) return empty();
    return normalizeMemory(JSON.parse(raw));
  } catch {
    return empty();
  }
}

export function saveMemory(characterId: string, mem: MemoryTier) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PREFIX + characterId,
      JSON.stringify(normalizeMemory({ ...mem, updatedAt: Date.now() })),
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
      mem.mid = cleanNotes([...mem.mid, content.slice(0, 160)], MID_MAX);
    }
  }
  saveMemory(characterId, mem);
  return mem;
}

export function pinLong(characterId: string, note: string) {
  const mem = loadMemory(characterId);
  mem.long = cleanNotes([...mem.long, note], LONG_MAX);
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
