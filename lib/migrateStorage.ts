import { KEYS, LEGACY } from "./storageKeys";
import { loadState, saveState, type RelationshipState } from "./relationshipState";

/** Copies legacy goon stats onto the global companion record once. */
export function migrateLegacyState(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(KEYS.migrated) === "1") return;

    const streak = Number(window.localStorage.getItem(LEGACY.goonStreak)) || 0;
    const sessions = Number(window.localStorage.getItem(LEGACY.goonSessions)) || 0;
    const lastDay = window.localStorage.getItem(LEGACY.goonLastDate) || undefined;

    // Legacy stats were global. Fold them onto a synthetic record so the
    // numbers survive without pretending they belong to one companion.
    if (streak > 0 || sessions > 0) {
      const legacy = loadState("__legacy__");
      const next: RelationshipState = {
        ...legacy,
        streak: { current: streak, best: streak, lastDay },
        sessions: Array.from({ length: Math.min(sessions, 50) }, (_, i) => ({
          id: `legacy-${i}`,
          startedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
          durationSec: 0,
          edges: 0,
          tier: 2 as const,
        })),
      };
      saveState(next, { throwOnError: true });
    }

    const lock = window.localStorage.getItem(LEGACY.edgeLock);
    if (lock) window.localStorage.setItem(KEYS.edgeLock, lock);

    // Only clear legacy keys after the new ones are written.
    for (const key of Object.values(LEGACY)) window.localStorage.removeItem(key);
    window.localStorage.setItem(KEYS.migrated, "1");
  } catch {
    /* leave the marker unset so the next load retries */
  }
}
