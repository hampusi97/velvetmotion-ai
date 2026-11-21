/**
 * Relationship Levels (Lv. 1-10), XP & Daily Check-in Streaks
 * Shim backed by `lib/relationshipState` so all persistence flows through one versioned store.
 */
export * from "./relationshipState";
import { loadState, recordVisit, saveState, today } from "./relationshipState";
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

const DAILY_DROP_ID = "global-daily-drop";
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

function readXpFromUnlocks(unlocks: string[]): number {
  const token = unlocks.find((u) => u.startsWith("xp:"));
  return token ? Number(token.slice(3)) || 0 : 0;
}

export function getCompanionProgression(characterId: string): CompanionProgression {
  const s = loadState(characterId);
  const xp = readXpFromUnlocks(s.unlocks);
  const level = levelFromXp(xp);
  const unlockedMilestones = LEVEL_MILESTONES.filter((m) => level >= m.level).map((m) => m.level);
  return {
    characterId,
    xp,
    level,
    streakDays: s.streak.current,
    lastActiveDate: s.streak.lastDay || "",
    unlockedMilestones,
    customPromptOverride: s.note,
  };
}

export function saveCompanionProgression(prog: CompanionProgression) {
  const prev = loadState(prog.characterId);
  const filteredUnlocks = prev.unlocks.filter((u) => !u.startsWith("xp:"));
  const nextState = {
    ...prev,
    note: prog.customPromptOverride ?? prev.note,
    streak: {
      current: prog.streakDays,
      best: Math.max(prev.streak.best, prog.streakDays),
      lastDay: prog.lastActiveDate || prev.streak.lastDay,
    },
    unlocks: [...filteredUnlocks, `xp:${prog.xp}`],
  };
  saveState(nextState);
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
  const visited = recordVisit(loadState(characterId));
  saveState(visited);
  const prev = getCompanionProgression(characterId);
  const nextXp = Math.max(0, prev.xp + Math.max(0, xpDelta));
  const nextLevel = levelFromXp(nextXp);
  const leveledUp = nextLevel > prev.level;
  const newlyUnlocked = LEVEL_MILESTONES.filter((m) => nextLevel >= m.level && prev.level < m.level);

  const next: CompanionProgression = {
    ...prev,
    xp: nextXp,
    level: nextLevel,
    lastActiveDate: visited.streak.lastDay || today(),
    streakDays: visited.streak.current,
    unlockedMilestones: LEVEL_MILESTONES.filter((m) => nextLevel >= m.level).map((m) => m.level),
  };

  if (leveledUp) {
    earnCoins(15);
  }
  saveCompanionProgression(next);
  return { progression: next, leveledUp, newlyUnlocked };
}

export function getDailyDropClaimState(): { streak: number; claimedToday: boolean } {
  const s = loadState(DAILY_DROP_ID);
  return {
    streak: s.streak.current,
    claimedToday: s.streak.lastDay === today(),
  };
}

export function claimDailyDropReward(bonusCoins = 25): { ok: boolean; streak: number; coins: number } {
  const current = getDailyDropClaimState();
  if (current.claimedToday) {
    return { ok: false, streak: current.streak, coins: 0 };
  }
  const visited = recordVisit(loadState(DAILY_DROP_ID));
  saveState(visited);
  const balance = earnCoins(bonusCoins);
  return { ok: true, streak: visited.streak.current, coins: balance };
}
