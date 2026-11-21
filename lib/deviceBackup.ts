/** Portable content backups. Provider credentials, login sessions, PINs and endpoints are excluded. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const BACKUP_TABLES = [
  "chats",
  "memory",
  "matches",
  "gallery",
  "progression",
  "companions",
  "settings",
  "branches",
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupRow = Record<string, unknown>;
export type RestorePolicy = "keep-existing" | "use-backup";
export interface DeviceBackup {
  schema: "velvetmotion-backup-v3";
  exportedAt: string;
  localStorage: Record<string, string>;
  indexedDb: Record<BackupTable, BackupRow[]>;
}
export interface BackupPreview {
  backup: DeviceBackup;
  source: "v3" | "v2" | "legacy";
  keys: number;
  rows: number;
  skipped: number;
  warnings: string[];
}
const KEYS = new Set([
  "velvet-custom-girls",
  "vm-custom-girls",
  "vm-imported-cards",
  "velvet-shared-girls",
  "velvetmotion_custom_companions",
  "velvetmotion_matches",
  "vm:favorite-companions",
  "vm-pinned-girls",
  "vm-vault-ids",
  "vm-gallery",
  "vm-coins",
  "vm_daily_streak",
  "vm-daily-claim",
  "vm-streak-claim",
  "vm-kink-memory",
  "vm-unlocked-private-sets",
  "vm-storyboard-v1",
  "vm-ui-sound",
  "vm-neon-intensity",
  "vm-voice-engine",
  "vm-local-compute-mode",
  "vm-stealth-notif",
  "vm-user-prefs",
  "vm-discover-profile",
  "vm-goon-streak",
  "vm-goon-last-date",
  "vm-goon-total-minutes",
  "vm-goon-sessions",
  "vm-goon-max-intensity",
  "vm-free-dual",
  "vm-edge-streak",
  "vm-edge-last",
]);
const PREFIXES = [
  "vm-chat-",
  "vm-memory-",
  "vm-lorebook-",
  "vm-intimacy-",
  "vm_prog_",
  "vm-gifts-",
  "vm-face-seed-",
  "vm-ref-photo-",
  "velvetmotion_memory_",
  "velvet-mindmap-",
  "velvet-rp-context-",
];
export function isBackupStorageKey(key: string): boolean {
  return (
    key.length <= 256 &&
    (KEYS.has(key) ||
      PREFIXES.some(
        (prefix) => key.startsWith(prefix) && key.length > prefix.length,
      ))
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const finite = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const strings = (v: unknown) =>
  Array.isArray(v) && v.every((item) => typeof item === "string");
function mediaUrl(value: unknown): boolean {
  if (typeof value !== "string" || /[\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
    return true;
  if (
    /^data:(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm));base64,[a-z0-9+/=\s]+$/i.test(
      value,
    )
  )
    return true;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:", "blob:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
const messages = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (item) =>
      record(item) &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      [item.imageUrl, item.videoUrl].every(
        (url) => url === undefined || mediaUrl(url),
      ),
  );
const id = (v: unknown) =>
  typeof v === "string" && !!v.trim() && v.length <= 256;
export function validBackupRow(
  table: BackupTable,
  value: unknown,
): value is BackupRow {
  if (!record(value) || !id(table === "settings" ? value.key : value.id))
    return false;
  switch (table) {
    case "chats":
      return messages(value.messages) && finite(value.updatedAt);
    case "memory":
      return strings(value.facts) && finite(value.updatedAt);
    case "matches":
      return finite(value.matchedAt);
    case "gallery":
      return (
        mediaUrl(value.url) &&
        typeof value.mood === "string" &&
        finite(value.createdAt)
      );
    case "progression":
      return (
        finite(value.xp) &&
        finite(value.level) &&
        finite(value.streakDays) &&
        typeof value.lastActiveDate === "string" &&
        Array.isArray(value.unlockedMilestones) &&
        value.unlockedMilestones.every(finite) &&
        finite(value.updatedAt)
      );
    case "companions":
      return record(value.data) && finite(value.createdAt);
    case "settings":
      return "value" in value && finite(value.updatedAt);
    case "branches":
      return (
        id(value.characterId) &&
        id(value.branchId) &&
        typeof value.label === "string" &&
        messages(value.messages) &&
        finite(value.createdAt)
      );
  }
}
export function emptyBackup(): DeviceBackup {
  return {
    schema: "velvetmotion-backup-v3",
    exportedAt: new Date().toISOString(),
    localStorage: {},
    indexedDb: {
      chats: [],
      memory: [],
      matches: [],
      gallery: [],
      progression: [],
      companions: [],
      settings: [],
      branches: [],
    },
  };
}

/** Validate the complete input before callers touch either storage system. */
export function previewDeviceBackup(raw: string): BackupPreview {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)
    throw new Error("Backup exceeds the 50 MB import limit.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!record(parsed)) throw new Error("Select a VelvetMotion backup object.");
  const source =
    parsed.schema === "velvetmotion-backup-v3"
      ? "v3"
      : parsed.schema === "velvetmotion-backup-v2"
        ? "v2"
        : "legacy";
  if ("schema" in parsed && source === "legacy")
    throw new Error("This backup version is not supported.");
  const backup = emptyBackup();
  if (typeof parsed.exportedAt === "string")
    backup.exportedAt = parsed.exportedAt;
  const storage = source === "legacy" ? parsed : parsed.localStorage;
  if (!record(storage))
    throw new Error("Backup local storage is missing or invalid.");
  let skipped = 0;
  for (const [key, value] of Object.entries(storage)) {
    if (!isBackupStorageKey(key)) {
      skipped++;
      continue;
    }
    if (typeof value !== "string")
      throw new Error(`Invalid stored value for ${key}.`);
    if (COLLECTIONS.has(key) || SETS.has(key)) {
      // Validate even when restoring into an empty device.
      mergeBackupStorage(key, "[]", value, "use-backup");
    } else if (key.startsWith("vm-chat-")) {
      let turns: unknown;
      try {
        turns = JSON.parse(value);
      } catch {
        throw new Error(`Invalid conversation ${key}.`);
      }
      if (!messages(turns)) throw new Error(`Invalid conversation ${key}.`);
    } else if (
      key.startsWith("vm-memory-") ||
      key.startsWith("vm-lorebook-") ||
      key.startsWith("vm_prog_") ||
      key.startsWith("velvetmotion_memory_") ||
      key.startsWith("velvet-mindmap-") ||
      key.startsWith("velvet-rp-context-")
    ) {
      try {
        if (!JSON.parse(value)) throw new Error();
      } catch {
        throw new Error(`Invalid saved content ${key}.`);
      }
    }
    backup.localStorage[key] = value;
  }
  if (source !== "legacy") {
    if (!record(parsed.indexedDb))
      throw new Error("Backup database records are missing or invalid.");
    for (const table of BACKUP_TABLES) {
      const rows = parsed.indexedDb[table] ?? [];
      if (!Array.isArray(rows) || rows.length > 20_000)
        throw new Error(`Invalid ${table} collection.`);
      const seen = new Set<string>();
      for (const row of rows) {
        if (!validBackupRow(table, row))
          throw new Error(`Invalid record in ${table}; no data was restored.`);
        if (table === "settings" && !isBackupStorageKey(String(row.key))) {
          skipped++;
          continue;
        }
        const key = String(table === "settings" ? row.key : row.id);
        if (seen.has(key))
          throw new Error(`Duplicate record in ${table}: ${key}.`);
        seen.add(key);
        backup.indexedDb[table].push(row);
      }
    }
  }
  const keys = Object.keys(backup.localStorage).length;
  const rows = BACKUP_TABLES.reduce(
    (n, name) => n + backup.indexedDb[name].length,
    0,
  );
  if (!keys && !rows)
    throw new Error("This file contains no supported companion content.");
  return {
    backup,
    source,
    keys,
    rows,
    skipped,
    warnings: [
      ...(skipped
        ? [
            `${skipped} account, connection, security or unsupported settings were excluded.`,
          ]
        : []),
      ...(source !== "v3"
        ? ["Older backups may omit chat branches, favorites or progression."]
        : []),
      "Backups are unencrypted and may contain private conversations and images. Separate VRM files and remote media bytes are not included.",
    ],
  };
}

const COLLECTIONS = new Set([
  "velvet-custom-girls",
  "vm-custom-girls",
  "vm-imported-cards",
  "velvet-shared-girls",
  "velvetmotion_custom_companions",
  "vm-gallery",
]);
const SETS = new Set([
  "vm:favorite-companions",
  "velvetmotion_matches",
  "vm-pinned-girls",
  "vm-vault-ids",
  "vm-unlocked-private-sets",
]);
export function mergeBackupStorage(
  key: string,
  current: string | null,
  incoming: string,
  policy: RestorePolicy,
): string {
  if (current === null) return incoming;
  if (COLLECTIONS.has(key) || SETS.has(key)) {
    const a: unknown = JSON.parse(current),
      b: unknown = JSON.parse(incoming);
    if (!Array.isArray(a) || !Array.isArray(b))
      throw new Error(`Invalid collection ${key}.`);
    if (SETS.has(key)) {
      if (!strings(a) || !strings(b))
        throw new Error(`Invalid saved IDs in ${key}.`);
      return JSON.stringify([...new Set([...a, ...b])]);
    }
    const byId = new Map<string, unknown>();
    const first = policy === "keep-existing" ? b : a;
    const second = policy === "keep-existing" ? a : b;
    for (const item of [...first, ...second]) {
      if (!record(item) || !id(item.id))
        throw new Error(`Invalid companion or media record in ${key}.`);
      if (key === "vm-gallery") {
        if (!mediaUrl(item.url)) throw new Error("Invalid gallery image.");
      } else if (
        !id(item.name) ||
        !Number.isInteger(item.age) ||
        Number(item.age) < 18 ||
        Number(item.age) > 120
      )
        throw new Error(
          "Backup companions must declare a valid adult age and name.",
        );
      for (const field of ["avatar", "portraitUrl"]) {
        if (field in item && item[field] !== "" && !mediaUrl(item[field]))
          throw new Error("Invalid character portrait URL.");
      }
      byId.set(item.id as string, item);
    }
    return JSON.stringify([...byId.values()]);
  }
  return policy === "keep-existing" ? current : incoming;
}

export interface StorageChange {
  key: string;
  before: string | null;
  after: string;
}
export function planBackupStorage(
  storage: Pick<Storage, "getItem">,
  backup: DeviceBackup,
  policy: RestorePolicy,
): StorageChange[] {
  return Object.entries(backup.localStorage)
    .map(([key, incoming]) => {
      const before = storage.getItem(key);
      return {
        key,
        before,
        after: mergeBackupStorage(key, before, incoming, policy),
      };
    })
    .filter((change) => change.after !== change.before);
}
export function rollbackBackupStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  changes: StorageChange[],
): boolean {
  let complete = true;
  // Remove new keys first to make room for restoring previous values after a quota failure.
  const ordered = [
    ...changes.filter((c) => c.before === null),
    ...changes.filter((c) => c.before !== null),
  ];
  for (const change of ordered) {
    try {
      if (storage.getItem(change.key) !== change.after) continue;
      if (change.before === null) storage.removeItem(change.key);
      else storage.setItem(change.key, change.before);
    } catch {
      complete = false;
    }
  }
  return complete;
}
