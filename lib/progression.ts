/**
 * Relationship Levels (Lv. 1-10), XP & Daily Check-in Streaks
 * 100% free local-first progression persisted to localStorage + IndexedDB.
 */
import { saveProgressionDB } from "./db";
import { earnCoins } from "./coinsStore";

export interface MilestoneUnlock {
  level: number;
  title: string;
  description: string;
}

export const LEVEL_MILESTONES: MilestoneUnlock[] = [
  { level: 2, title: "New Outfit Preset", description: "Unlocks signature late-night outfit chips in Selfie Studio" },
  { level: 4, title: "Whisper Voice Mood", description: "Unlocks breathy close-mic whisper mode on voice notes & calls" },
  { level: 6, title: "Late-Night Scenario", description: "Unlocks intimate penthouse & midnight balcony scenarios" },
  { level: 8, title: "Exclusive Neon Gallery Set", description: "Unlocks Hyper-Neon boudoir preset pack in Private Content" },
  { level: 10, title: "Soulmate Badge + Custom Prompt", description: "Gold/Cyan Soulmate aura & custom system prompt override" },
];

export interface CompanionProgression {
  characterId: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  unlockedMilestones: number[];
  customPromptOverride?: string;
}

const KEY_PREFIX = "vm_prog_";
const STREAK_KEY = "vm_daily_streak";

// Cumulative XP thresholds for levels 1 -> 10
const LEVEL_XP = [0, 30, 80, 150, 240, 360, 520, 720, 960, 1250];

export function levelFromXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) lvl = i + 1;
  }
  return Math.min(10, lvl);
}

export function levelProgressPercent(xp: number): { level: number; percent: number; nextXp: number } {
  const level = levelFromXp(xp);
  if (level >= 10) return { level: 10, percent: 100, nextXp: LEVEL_XP[9] };
  const floor = LEVEL_XP[level - 1];
  const ceil = LEVEL_XP[level];
  const pct = Math.max(0, Math.min(100, Math.round(((xp - floor) / Math.max(1, ceil - floor)) * 100)));
  return { level, percent: pct, nextXp: ceil };
}

export function getCompanionProgression(characterId: string): CompanionProgression {
  if (typeof window === "undefined") {
    return {
      characterId,
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: "",
      unlockedMilestones: [],
    };
  }
  try {
    const raw = localStorage.getItem(KEY_PREFIX + characterId);
    if (raw) {
      const parsed = JSON.parse(raw) as CompanionProgression;
      return {
        characterId,
        xp: Number(parsed.xp || 0),
        level: levelFromXp(Number(parsed.xp || 0)),
        streakDays: Number(parsed.streakDays || 0),
        lastActiveDate: parsed.lastActiveDate || "",
        unlockedMilestones: Array.isArray(parsed.unlockedMilestones) ? parsed.unlockedMilestones : [],
        customPromptOverride: parsed.customPromptOverride,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    characterId,
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: "",
    unlockedMilestones: [],
  };
}

export function saveCompanionProgression(prog: CompanionProgression) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + prog.characterId, JSON.stringify(prog));
  } catch {
    /* ignore */
  }
  void saveProgressionDB({
    id: prog.characterId,
    xp: prog.xp,
    level: prog.level,
    streakDays: prog.streakDays,
    lastActiveDate: prog.lastActiveDate,
    unlockedMilestones: prog.unlockedMilestones,
    updatedAt: Date.now(),
  });
}

export function earnCompanionXp(
  characterId: string,
  xpDelta: number,
): { progression: CompanionProgression; leveledUp: boolean; newlyUnlocked: MilestoneUnlock[] } {
  const prev = getCompanionProgression(characterId);
  const nextXp = Math.max(0, prev.xp + Math.max(0, xpDelta));
  const nextLevel = levelFromXp(nextXp);
  const leveledUp = nextLevel > prev.level;
  const newlyUnlocked: MilestoneUnlock[] = [];
  const nextMilestones = new Set(prev.unlockedMilestones);

  for (const m of LEVEL_MILESTONES) {
    if (nextLevel >= m.level && !nextMilestones.has(m.level)) {
      nextMilestones.add(m.level);
      newlyUnlocked.push(m);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const next: CompanionProgression = {
    ...prev,
    xp: nextXp,
    level: nextLevel,
    lastActiveDate: today,
    streakDays: prev.lastActiveDate === today ? prev.streakDays : prev.streakDays + 1,
    unlockedMilestones: Array.from(nextMilestones).sort((a, b) => a - b),
  };

  if (leveledUp) {
    earnCoins(15);
  }
  saveCompanionProgression(next);
  return { progression: next, leveledUp, newlyUnlocked };
}

export function getDailyDropClaimState(): { streak: number; claimedToday: boolean } {
  if (typeof window === "undefined") return { streak: 0, claimedToday: false };
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { streak: 0, claimedToday: false };
    const parsed = JSON.parse(raw) as { streak?: number; lastClaim?: string };
    return {
      streak: Number(parsed.streak || 0),
      claimedToday: parsed.lastClaim === today,
    };
  } catch {
    return { streak: 0, claimedToday: false };
  }
}

export function claimDailyDropReward(bonusCoins = 25): { ok: boolean; streak: number; coins: number } {
  const today = new Date().toISOString().slice(0, 10);
  const state = getDailyDropClaimState();
  if (state.claimedToday) {
    return { ok: false, streak: state.streak, coins: 0 };
  }
  const nextStreak = state.streak + 1;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ streak: nextStreak, lastClaim: today }));
  } catch {
    /* ignore */
  }
  const balance = earnCoins(bonusCoins);
  return { ok: true, streak: nextStreak, coins: balance };
}
