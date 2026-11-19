/**
 * Dexie IndexedDB store — replaces localStorage for chats, memory, matches, gallery.
 * Static-export safe; only used in the browser.
 */
import Dexie, { type Table } from "dexie";

export interface ChatRow { id: string; messages: unknown[]; updatedAt: number; }
export interface MemoryRow { id: string; facts: string[]; updatedAt: number; }
export interface MatchRow { id: string; matchedAt: number; }
export interface GalleryRow { id: string; url: string; mood: string; createdAt: number; }

class VelvetDB extends Dexie {
  chats!: Table<ChatRow, string>;
  memory!: Table<MemoryRow, string>;
  matches!: Table<MatchRow, string>;
  gallery!: Table<GalleryRow, string>;

  constructor() {
    super("velvetmotion");
    this.version(1).stores({
      chats: "id, updatedAt",
      memory: "id, updatedAt",
      matches: "id, matchedAt",
      gallery: "id, createdAt",
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
