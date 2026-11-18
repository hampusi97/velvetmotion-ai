/** Daily rewards, streak bonuses, dual-gen unlocks. */

import { addCoins, getCoins } from "./storage";
import { getEdgeStreak } from "./streaks";

const DAILY_KEY = "vm-daily-claim";
const STREAK_CLAIM_KEY = "vm-streak-claim";
const TRIBUTE_GALLERY_KEY = "vm-tribute-gallery";

export type TributeSave = {
  id: string;
  characterId: string;
  characterName: string;
  url: string;
  frames?: string[];
  note?: string;
  createdAt: number;
};

export function canClaimDaily(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = localStorage.getItem(DAILY_KEY);
    if (!last) return true;
    return new Date(last).toDateString() !== new Date().toDateString();
  } catch {
    return true;
  }
}

/** Base 100 + streak bonus (up to +50). */
export function claimDailyReward(): { coins: number; streak: number; dualUnlocked: boolean } {
  if (!canClaimDaily()) return { coins: 0, streak: getEdgeStreak(), dualUnlocked: false };
  const streak = getEdgeStreak();
  const bonus = Math.min(50, streak * 5);
  const total = 100 + bonus;
  try {
    localStorage.setItem(DAILY_KEY, new Date().toISOString());
  } catch {}
  addCoins(total);
  const dualUnlocked = streak >= 3;
  return { coins: total, streak, dualUnlocked };
}

/** Dual-girl free gen unlock after 3-day edge streak. */
export function dualGenUnlocked(): boolean {
  return getEdgeStreak() >= 3;
}

export function saveTribute(item: Omit<TributeSave, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const full: TributeSave = {
    ...item,
    id: `trib-${Date.now()}`,
    createdAt: Date.now(),
  };
  try {
    const raw = localStorage.getItem(TRIBUTE_GALLERY_KEY);
    const list: TributeSave[] = raw ? JSON.parse(raw) : [];
    list.unshift(full);
    localStorage.setItem(TRIBUTE_GALLERY_KEY, JSON.stringify(list.slice(0, 80)));
  } catch {}
}

export function loadTributes(): TributeSave[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRIBUTE_GALLERY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function rewardSummary() {
  return {
    coins: getCoins(),
    streak: getEdgeStreak(),
    canClaim: canClaimDaily(),
    dualUnlocked: dualGenUnlocked(),
  };
}
