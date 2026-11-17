/** Edging streak — consecutive days with a completed tribute. */

const STREAK_KEY = "vm-edge-streak";
const LAST_KEY = "vm-edge-last";
const FREE_DUAL_KEY = "vm-free-dual";

export function getEdgeStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Math.max(0, parseInt(localStorage.getItem(STREAK_KEY) || "0", 10) || 0);
  } catch {
    return 0;
  }
}

export function recordTributeComplete(): { streak: number; unlockedDual: boolean } {
  if (typeof window === "undefined") return { streak: 0, unlockedDual: false };
  const today = new Date().toDateString();
  let streak = getEdgeStreak();
  try {
    const last = localStorage.getItem(LAST_KEY);
    if (last === today) {
      return { streak, unlockedDual: hasFreeDual() };
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (last === yesterday.toDateString()) streak += 1;
    else streak = 1;
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(LAST_KEY, today);
    if (streak >= 3) {
      localStorage.setItem(FREE_DUAL_KEY, "1");
      return { streak, unlockedDual: true };
    }
  } catch {
    /* */
  }
  return { streak, unlockedDual: hasFreeDual() };
}

export function hasFreeDual(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FREE_DUAL_KEY) === "1";
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
