/** Goon Streak & Intensity Tracker Engine + Tribute Edging Streak Bridge */

const STREAK_KEY = "vm-goon-streak";
const LAST_KEY = "vm-goon-last-date";
const TIME_KEY = "vm-goon-total-minutes";
const SESSIONS_KEY = "vm-goon-sessions";
const MAX_INTENSITY_KEY = "vm-goon-max-intensity";
const FREE_DUAL_KEY = "vm-free-dual";
const EDGE_STREAK_KEY = "vm-edge-streak";
const EDGE_LAST_KEY = "vm-edge-last";

export interface GoonStats {
  streak: number;
  totalMinutes: number;
  sessions: number;
  maxIntensity: number; // 1 to 100
  rankTitle: string;
}

export function getGoonStats(): GoonStats {
  if (typeof window === "undefined") {
    return { streak: 1, totalMinutes: 15, sessions: 3, maxIntensity: 85, rankTitle: "Master Edger" };
  }
  try {
    const streak = Math.max(1, parseInt(localStorage.getItem(STREAK_KEY) || "1", 10) || 1);
    const totalMinutes = Math.max(5, parseInt(localStorage.getItem(TIME_KEY) || "24", 10) || 24);
    const sessions = Math.max(1, parseInt(localStorage.getItem(SESSIONS_KEY) || "4", 10) || 4);
    const maxIntensity = Math.max(10, parseInt(localStorage.getItem(MAX_INTENSITY_KEY) || "92", 10) || 92);
    
    let rankTitle = "Novice Seeker";
    if (streak >= 14 || maxIntensity >= 95) rankTitle = "Supreme Goon God";
    else if (streak >= 7 || maxIntensity >= 85) rankTitle = "Master Edger";
    else if (streak >= 3 || maxIntensity >= 70) rankTitle = "Dedicated Voyeur";

    return { streak, totalMinutes, sessions, maxIntensity, rankTitle };
  } catch {
    return { streak: 1, totalMinutes: 15, sessions: 3, maxIntensity: 85, rankTitle: "Master Edger" };
  }
}

export function recordGoonActivity(addedMinutes = 2, intensityBoost = 0): GoonStats {
  if (typeof window === "undefined") return getGoonStats();
  const current = getGoonStats();
  const today = new Date().toDateString();
  const last = localStorage.getItem(LAST_KEY);

  let newStreak = current.streak;
  if (last !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (last === yesterday.toDateString()) {
      newStreak += 1;
    } else if (!last) {
      newStreak = 1;
    }
    localStorage.setItem(LAST_KEY, today);
    localStorage.setItem(STREAK_KEY, String(newStreak));
  }

  const newMinutes = current.totalMinutes + addedMinutes;
  const newIntensity = Math.min(100, Math.max(current.maxIntensity, current.maxIntensity + intensityBoost));

  localStorage.setItem(TIME_KEY, String(newMinutes));
  localStorage.setItem(MAX_INTENSITY_KEY, String(newIntensity));

  return getGoonStats();
}

export function recordNewSession(): GoonStats {
  if (typeof window === "undefined") return getGoonStats();
  const current = getGoonStats();
  const newSessions = current.sessions + 1;
  localStorage.setItem(SESSIONS_KEY, String(newSessions));
  return recordGoonActivity(5, 5);
}

// Compatibility exports for TributeBrowser / home-view
export function getEdgeStreak(): number {
  return getGoonStats().streak;
}

export function recordTributeComplete(): { streak: number; unlockedDual: boolean } {
  const stats = recordNewSession();
  const unlocked = stats.streak >= 3 || stats.maxIntensity >= 90;
  if (unlocked && typeof window !== "undefined") {
    localStorage.setItem(FREE_DUAL_KEY, "1");
  }
  return { streak: stats.streak, unlockedDual: hasFreeDual() };
}

export function hasFreeDual(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FREE_DUAL_KEY) === "1" || getGoonStats().streak >= 3;
  } catch {
    return false;
  }
}

export function consumeFreeDual(): boolean {
  if (!hasFreeDual()) return false;
  try {
    localStorage.removeItem(FREE_DUAL_KEY);
  } catch {
    /* */
  }
  return true;
}
