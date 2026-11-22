/** Goon Streak & Intensity Tracker Engine — shim backed by `lib/relationshipState`. */
export * from "./relationshipState";
import { loadState, recordSession, recordVisit, saveState } from "./relationshipState";

const GLOBAL_ID = "__legacy__";

export interface GoonStats {
  streak: number;
  totalMinutes: number;
  sessions: number;
  maxIntensity: number; // 1 to 100
  rankTitle: string;
}

export function getGoonStats(): GoonStats {
  const s = loadState(GLOBAL_ID);
  const streak = s.streak.current;
  const totalSec = s.sessions.reduce((acc, rec) => acc + rec.durationSec, 0);
  const totalMinutes = Math.round(totalSec / 60);
  const sessions = s.sessions.length;
  const maxEdges = s.sessions.reduce((acc, rec) => Math.max(acc, rec.edges), 0);
  const maxIntensity = sessions > 0 ? Math.min(100, Math.max(10, 70 + maxEdges * 5)) : 0;

  let rankTitle = "Novice Seeker";
  if (streak >= 14 || maxIntensity >= 95) rankTitle = "Supreme Goon God";
  else if (streak >= 7 || maxIntensity >= 85) rankTitle = "Master Edger";
  else if (streak >= 3 || maxIntensity >= 70) rankTitle = "Dedicated Voyeur";

  return { streak, totalMinutes, sessions, maxIntensity, rankTitle };
}

export function recordGoonActivity(addedMinutes = 2, intensityBoost = 0): GoonStats {
  const visited = recordVisit(loadState(GLOBAL_ID));
  const updated = recordSession(visited, {
    id: `goon-${Date.now()}`,
    startedAt: new Date().toISOString(),
    durationSec: Math.max(60, addedMinutes * 60),
    edges: Math.max(1, Math.round(intensityBoost / 5)),
    tier: visited.sphTier,
  });
  saveState(updated);
  return getGoonStats();
}

export function recordNewSession(): GoonStats {
  return recordGoonActivity(5, 5);
}

export function getEdgeStreak(): number {
  return getGoonStats().streak;
}

export function recordTributeComplete(): { streak: number; unlockedDual: boolean } {
  const stats = recordNewSession();
  const s = loadState(GLOBAL_ID);
  const unlocked = stats.streak >= 3 || stats.maxIntensity >= 90;
  if (unlocked && !s.unlocks.includes("free-dual")) {
    saveState({ ...s, unlocks: [...s.unlocks, "free-dual"] });
  }
  return { streak: stats.streak, unlockedDual: hasFreeDual() };
}

export function hasFreeDual(): boolean {
  const s = loadState(GLOBAL_ID);
  return s.unlocks.includes("free-dual") || getGoonStats().streak >= 3;
}

export function consumeFreeDual(): boolean {
  if (!hasFreeDual()) return false;
  const s = loadState(GLOBAL_ID);
  saveState({ ...s, unlocks: s.unlocks.filter((u) => u !== "free-dual") });
  return true;
}
