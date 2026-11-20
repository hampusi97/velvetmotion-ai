/**
 * Local-First IndexedDB store via Dexie.js + full .json Export/Import backup.
 * Static-export safe; browser-only.
 */
import Dexie, { type Table } from "dexie";
import { loadChat, saveChat, type StoredMessage } from "./storage";

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
  characterName?: string;
  prompt?: string;
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
export interface BranchRow {
  id: string;
  characterId: string;
  branchId: string;
  label: string;
  messages: unknown[];
  parentBranch?: string;
  createdAt: number;
}

class VelvetDB extends Dexie {
  chats!: Table<ChatRow, string>;
  memory!: Table<MemoryRow, string>;
  matches!: Table<MatchRow, string>;
  gallery!: Table<GalleryRow, string>;
  progression!: Table<ProgressionRow, string>;
  companions!: Table<CompanionRow, string>;
  settings!: Table<SettingRow, string>;
  branches!: Table<BranchRow, string>;

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
    this.version(3).stores({
      chats: "id, updatedAt",
      memory: "id, updatedAt",
      matches: "id, matchedAt",
      gallery: "id, characterId, createdAt",
      progression: "id, level, updatedAt",
      companions: "id, createdAt",
      settings: "key, updatedAt",
      branches: "id, characterId, createdAt",
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

/** Append to the main chat before a different view opens it. */
export async function appendMainChatMessage(
  characterId: string,
  message: StoredMessage,
  options: { initialMessage?: string; once?: boolean } = {},
) {
  const append = (messages: StoredMessage[]) => {
    if (options.once && messages.some((entry) => entry?.content === message.content)) return messages;
    const base = messages.length || !options.initialMessage
      ? messages : [{ role: "assistant" as const, content: options.initialMessage }];
    return [...base, message];
  };
  const db = getDb();
  const indexed = await db?.transaction("rw", db.chats, async () => {
    const row = await db.chats.get(characterId);
    const messages = append(Array.isArray(row?.messages) ? row.messages as StoredMessage[] : loadChat(characterId));
    await db.chats.put({ id: characterId, messages, updatedAt: Date.now() });
    return messages;
  }).catch(() => null);
  saveChat(characterId, indexed ?? append(loadChat(characterId)));
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

/** Remove a gallery row from IndexedDB, not just the browser's localStorage index. */
export async function deleteGalleryDB(id: string): Promise<void> {
  const db = getDb();
  if (db) await db.gallery.delete(id);
}

export async function loadGalleryDB(characterId?: string): Promise<GalleryRow[]> {
  const d = getDb();
  if (!d) return [];
  if (characterId) {
    return d.gallery.where("characterId").equals(characterId).reverse().sortBy("createdAt");
  }
  return d.gallery.orderBy("createdAt").reverse().toArray();
}

export async function saveChatBranchDB(branch: Omit<BranchRow, "id">): Promise<BranchRow> {
  const full: BranchRow = {
    ...branch,
    id: `${branch.characterId}::${branch.branchId}`,
  };
  const d = getDb();
  if (d) await d.branches.put(full);
  return full;
}

export async function listChatBranchesDB(characterId: string): Promise<BranchRow[]> {
  const d = getDb();
  if (!d) return [];
  return d.branches.where("characterId").equals(characterId).sortBy("createdAt");
}

export async function deleteChatBranchDB(characterId: string, branchId: string) {
  const d = getDb();
  if (!d) return;
  await d.branches.delete(`${characterId}::${branchId}`);
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
