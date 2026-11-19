/**
 * Local-First IndexedDB store via Dexie.js + full .json Export/Import backup.
 * Static-export safe; browser-only.
 */
import Dexie, { type Table } from "dexie";

export interface ChatRow {
  id: string;
  messages: unknown[];
  updatedAt: number;
}
export interface MemoryRow {
  id: string;
  facts: string[];
  updatedAt: number;
}
export interface MatchRow {
  id: string;
  matchedAt: number;
}
export interface GalleryRow {
  id: string;
  characterId?: string;
  url: string;
  mood: string;
  createdAt: number;
}
export interface ProgressionRow {
  id: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  unlockedMilestones: number[];
  updatedAt: number;
}
export interface CompanionRow {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
}
export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

class VelvetDB extends Dexie {
  chats!: Table<ChatRow, string>;
  memory!: Table<MemoryRow, string>;
  matches!: Table<MatchRow, string>;
  gallery!: Table<GalleryRow, string>;
  progression!: Table<ProgressionRow, string>;
  companions!: Table<CompanionRow, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super("velvetmotion");
    this.version(1).stores({
      chats: "id, updatedAt",
      memory: "id, updatedAt",
      matches: "id, matchedAt",
      gallery: "id, createdAt",
    });
    this.version(2).stores({
      chats: "id, updatedAt",
      memory: "id, updatedAt",
      matches: "id, matchedAt",
      gallery: "id, characterId, createdAt",
      progression: "id, level, updatedAt",
      companions: "id, createdAt",
      settings: "key, updatedAt",
    });
  }
}

let db: VelvetDB | null = null;
function getDb() {
  if (typeof window === "undefined") return null;
  if (!db) db = new VelvetDB();
  return db;
}

export async function saveChatDB(characterId: string, messages: unknown[]) {
  const d = getDb();
  if (!d) return;
  await d.chats.put({ id: characterId, messages, updatedAt: Date.now() });
}

export async function loadChatDB(characterId: string): Promise<unknown[] | null> {
  const d = getDb();
  if (!d) return null;
  const row = await d.chats.get(characterId);
  return row?.messages ?? null;
}

export async function saveMemoryDB(characterId: string, facts: string[]) {
  const d = getDb();
  if (!d) return;
  await d.memory.put({ id: characterId, facts, updatedAt: Date.now() });
}

export async function loadMemoryDB(characterId: string): Promise<string[]> {
  const d = getDb();
  if (!d) return [];
  const row = await d.memory.get(characterId);
  return row?.facts ?? [];
}

export async function saveMatchDB(characterId: string) {
  const d = getDb();
  if (!d) return;
  await d.matches.put({ id: characterId, matchedAt: Date.now() });
}

export async function loadMatchesDB(): Promise<string[]> {
  const d = getDb();
  if (!d) return [];
  const rows = await d.matches.toArray();
  return rows.map((r) => r.id);
}

export async function saveGalleryDB(item: GalleryRow) {
  const d = getDb();
  if (!d) return;
  await d.gallery.put(item);
}

export async function loadGalleryDB(): Promise<GalleryRow[]> {
  const d = getDb();
  if (!d) return [];
  return d.gallery.orderBy("createdAt").reverse().toArray();
}

export async function saveProgressionDB(row: ProgressionRow) {
  const d = getDb();
  if (!d) return;
  await d.progression.put(row);
}

export async function loadProgressionDB(characterId: string): Promise<ProgressionRow | null> {
  const d = getDb();
  if (!d) return null;
  return (await d.progression.get(characterId)) ?? null;
}

export async function saveCustomCompanionDB(id: string, data: Record<string, unknown>) {
  const d = getDb();
  if (!d) return;
  await d.companions.put({ id, data, createdAt: Date.now() });
}

export async function loadCustomCompanionsDB(): Promise<CompanionRow[]> {
  const d = getDb();
  if (!d) return [];
  return d.companions.toArray();
}

export async function saveSettingDB(key: string, value: unknown) {
  const d = getDb();
  if (!d) return;
  await d.settings.put({ key, value, updatedAt: Date.now() });
}

export async function loadSettingDB<T = unknown>(key: string): Promise<T | null> {
  const d = getDb();
  if (!d) return null;
  const row = await d.settings.get(key);
  return (row?.value as T) ?? null;
}

export interface FullBackupPayload {
  schema: "velvetmotion-backup-v2";
  exportedAt: string;
  localStorage: Record<string, string>;
  indexedDb: {
    chats: ChatRow[];
    memory: MemoryRow[];
    matches: MatchRow[];
    gallery: GalleryRow[];
    progression: ProgressionRow[];
    companions: CompanionRow[];
    settings: SettingRow[];
  };
}

export async function exportFullBackupJson(): Promise<string> {
  const ls: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith("vm-") || k.startsWith("velvet"))) {
        const val = window.localStorage.getItem(k);
        if (val !== null) ls[k] = val;
      }
    }
  }
  const d = getDb();
  const indexedDb = d
    ? {
        chats: await d.chats.toArray(),
        memory: await d.memory.toArray(),
        matches: await d.matches.toArray(),
        gallery: await d.gallery.toArray(),
        progression: await d.progression.toArray(),
        companions: await d.companions.toArray(),
        settings: await d.settings.toArray(),
      }
    : { chats: [], memory: [], matches: [], gallery: [], progression: [], companions: [], settings: [] };

  const payload: FullBackupPayload = {
    schema: "velvetmotion-backup-v2",
    exportedAt: new Date().toISOString(),
    localStorage: ls,
    indexedDb,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importFullBackupJson(rawText: string): Promise<{ restoredKeys: number; restoredRows: number }> {
  const parsed = JSON.parse(rawText) as Partial<FullBackupPayload> & Record<string, unknown>;
  let restoredKeys = 0;
  let restoredRows = 0;

  if (parsed && parsed.schema === "velvetmotion-backup-v2" && parsed.localStorage) {
    for (const [k, v] of Object.entries(parsed.localStorage)) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(k, String(v));
        restoredKeys++;
      }
    }
    const d = getDb();
    if (d && parsed.indexedDb) {
      if (parsed.indexedDb.chats?.length) { await d.chats.bulkPut(parsed.indexedDb.chats); restoredRows += parsed.indexedDb.chats.length; }
      if (parsed.indexedDb.memory?.length) { await d.memory.bulkPut(parsed.indexedDb.memory); restoredRows += parsed.indexedDb.memory.length; }
      if (parsed.indexedDb.matches?.length) { await d.matches.bulkPut(parsed.indexedDb.matches); restoredRows += parsed.indexedDb.matches.length; }
      if (parsed.indexedDb.gallery?.length) { await d.gallery.bulkPut(parsed.indexedDb.gallery); restoredRows += parsed.indexedDb.gallery.length; }
      if (parsed.indexedDb.progression?.length) { await d.progression.bulkPut(parsed.indexedDb.progression); restoredRows += parsed.indexedDb.progression.length; }
      if (parsed.indexedDb.companions?.length) { await d.companions.bulkPut(parsed.indexedDb.companions); restoredRows += parsed.indexedDb.companions.length; }
      if (parsed.indexedDb.settings?.length) { await d.settings.bulkPut(parsed.indexedDb.settings); restoredRows += parsed.indexedDb.settings.length; }
    }
    window.dispatchEvent(new Event("vm:coins-changed"));
    return { restoredKeys, restoredRows };
  }

  // Backward-compatible flat key/value JSON import
  for (const [k, v] of Object.entries(parsed || {})) {
    if (typeof window !== "undefined" && typeof v === "string") {
      window.localStorage.setItem(k, v);
      restoredKeys++;
    }
  }
  window.dispatchEvent(new Event("vm:coins-changed"));
  return { restoredKeys, restoredRows };
}
