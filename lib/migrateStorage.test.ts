import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { KEYS, LEGACY } from "./storageKeys";
import { migrateLegacyState } from "./migrateStorage";
import { loadState } from "./relationshipState";

const originalWindow = (globalThis as { window?: unknown }).window;

function installMockWindow(opts: { throwOnSet?: boolean } = {}) {
  const map = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error("QuotaExceededError");
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
  (globalThis as { window?: unknown }).window = { localStorage };
  return { map, localStorage };
}

beforeEach(() => {
  installMockWindow();
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe("migrateLegacyState", () => {
  it("runs once, copies the streak, deletes legacy keys, and is a no-op on second call", () => {
    const { localStorage } = installMockWindow();
    localStorage.setItem(LEGACY.goonStreak, "12");
    localStorage.setItem(LEGACY.goonSessions, "4");
    localStorage.setItem(LEGACY.edgeLock, "99999");

    migrateLegacyState();

    const migrated = loadState("__legacy__");
    assert.equal(migrated.streak.current, 12);
    assert.equal(migrated.sessions.length, 4);
    assert.equal(localStorage.getItem(KEYS.edgeLock), "99999");
    assert.equal(localStorage.getItem(LEGACY.goonStreak), null);
    assert.equal(localStorage.getItem(LEGACY.goonSessions), null);
    assert.equal(localStorage.getItem(KEYS.migrated), "1");

    // Second call is a no-op even if a legacy key is re-seeded while migrated marker is set
    localStorage.setItem(LEGACY.goonStreak, "99");
    migrateLegacyState();
    assert.equal(loadState("__legacy__").streak.current, 12);
  });

  it("leaves the marker unset when a write throws", () => {
    const { map } = installMockWindow({ throwOnSet: true });
    map.set(LEGACY.goonStreak, "15");

    migrateLegacyState();

    assert.equal(map.get(KEYS.migrated), undefined);
    assert.equal(map.get(LEGACY.goonStreak), "15");
  });
});
