/**
 * Local-First IndexedDB store via Dexie.js + full .json Export/Import backup.
 * Static-export safe; browser-only.
 */
import Dexie, { type Table } from "dexie";
import {
  BACKUP_TABLES,
  MAX_BACKUP_BYTES,
  emptyBackup,
  isBackupStorageKey,
  previewDeviceBackup,
  planBackupStorage,
  rollbackBackupStorage,
  type RestorePolicy,
  type DeviceBackup,
} from "./deviceBackup";
import { notifyCompanionLibrary } from "./companionLibrary";

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

export async function loadChatDB(
  characterId: string,
): Promise<unknown[] | null> {
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

/** Remove a gallery row from IndexedDB, not just the browser's localStorage index. */
export async function deleteGalleryDB(id: string): Promise<void> {
  const db = getDb();
  if (db) await db.gallery.delete(id);
}

export async function loadGalleryDB(
  characterId?: string,
): Promise<GalleryRow[]> {
  const d = getDb();
  if (!d) return [];
  if (characterId) {
    return d.gallery
      .where("characterId")
      .equals(characterId)
      .reverse()
      .sortBy("createdAt");
  }
  return d.gallery.orderBy("createdAt").reverse().toArray();
}

export async function saveChatBranchDB(
  branch: Omit<BranchRow, "id">,
): Promise<BranchRow> {
  const full: BranchRow = {
    ...branch,
    id: `${branch.characterId}::${branch.branchId}`,
  };
  const d = getDb();
  if (d) await d.branches.put(full);
  return full;
}

export async function listChatBranchesDB(
  characterId: string,
): Promise<BranchRow[]> {
  const d = getDb();
  if (!d) return [];
  return d.branches
    .where("characterId")
    .equals(characterId)
    .sortBy("createdAt");
}

export async function deleteChatBranchDB(
  characterId: string,
  branchId: string,
) {
  const d = getDb();
  if (!d) return;
  await d.branches.delete(`${characterId}::${branchId}`);
}

export async function saveProgressionDB(row: ProgressionRow) {
  const d = getDb();
  if (!d) return;
  await d.progression.put(row);
}

export async function loadProgressionDB(
  characterId: string,
): Promise<ProgressionRow | null> {
  const d = getDb();
  if (!d) return null;
  return (await d.progression.get(characterId)) ?? null;
}

export async function saveCustomCompanionDB(
  id: string,
  data: Record<string, unknown>,
) {
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

export async function loadSettingDB<T = unknown>(
  key: string,
): Promise<T | null> {
  const d = getDb();
  if (!d) return null;
  const row = await d.settings.get(key);
  return (row?.value as T) ?? null;
}

export type FullBackupPayload = DeviceBackup;

export async function exportFullBackupJson(): Promise<string> {
  if (typeof window === "undefined")
    throw new Error("Backups need browser storage.");
  const payload = emptyBackup();
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !isBackupStorageKey(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) payload.localStorage[key] = value;
  }
  const d = getDb();
  if (!d) throw new Error("The local database is unavailable.");
  await d.transaction(
    "r",
    BACKUP_TABLES.map((name) => d.table(name)),
    async () => {
      for (const name of BACKUP_TABLES) {
        const rows = await d.table(name).toArray();
        payload.indexedDb[name] =
          name === "settings"
            ? rows.filter((row) => isBackupStorageKey(row.key))
            : rows;
      }
    },
  );
  const json = JSON.stringify(payload, null, 2);
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES)
    throw new Error(
      "This backup exceeds 50 MB. Export large media separately before creating a portable backup.",
    );
  return json;
}

export async function importFullBackupJson(
  rawText: string,
  policy: RestorePolicy = "keep-existing",
): Promise<{ restoredKeys: number; restoredRows: number }> {
  if (typeof window === "undefined")
    throw new Error("Restoring needs browser storage.");
  const { backup } = previewDeviceBackup(rawText);
  const d = getDb();
  if (!d) throw new Error("The local database is unavailable.");
  let changes = planBackupStorage(window.localStorage, backup, policy);
  let restoredRows = 0;
  let restoredKeys = 0;
  const attempted: typeof changes = [];
  try {
    await d.transaction(
      "rw",
      BACKUP_TABLES.map((name) => d.table(name)),
      async () => {
        const writes = new Map<string, Record<string, unknown>[]>();
        // Resolve conflicts inside the same database transaction before any mutations.
        for (const name of BACKUP_TABLES) {
          const incoming = backup.indexedDb[name];
          const keys = incoming.map((row) =>
            String(name === "settings" ? row.key : row.id),
          );
          const existing = await d.table(name).bulkGet(keys);
          const selected = incoming.filter((row, index) => {
            if (policy === "use-backup") return true;
            if (name === "chats") {
              const key = `vm-chat-${row.id}`;
              if (existing[index])
                changes = changes.filter((change) => change.key !== key);
              // Either current chat store wins over a backup when preserving existing content.
              if (existing[index] || window.localStorage.getItem(key) !== null)
                return false;
            }
            return !existing[index];
          });
          writes.set(name, selected);
        }
        for (const change of changes) {
          attempted.push(change);
          window.localStorage.setItem(change.key, change.after);
          restoredKeys++;
        }
        for (const name of BACKUP_TABLES) {
          const selected = writes.get(name)!;
          if (!selected.length) continue;
          await d.table(name).bulkPut(selected);
          restoredRows += selected.length;
        }
      },
    );
  } catch (error) {
    const rolledBack = rollbackBackupStorage(window.localStorage, attempted);
    const detail =
      error instanceof Error ? error.message : "Storage is unavailable.";
    throw new Error(
      rolledBack
        ? `Restore failed; database changes were cancelled and local changes were rolled back. ${detail}`
        : `Restore failed and some local values could not be rolled back. Keep your backup file and free browser storage before retrying. ${detail}`,
    );
  }
  notifyCompanionLibrary();
  window.dispatchEvent(new Event("vm:device-backup-restored"));
  return { restoredKeys, restoredRows };
}
