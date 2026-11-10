export const PROGRESS_KEY = "vm-progress-v1";
export const DAILY_CREDITS = 20;

export interface LastSession {
  characterId: string;
  romanceMode: boolean;
  updatedAt: string;
}

export interface Progress {
  credits: number;
  streak: number;
  lastClaim: string | null;
  favoriteIds: string[];
  nightMode: boolean;
  lastSession: LastSession | null;
}

export const emptyProgress = (): Progress => ({
  credits: 0, streak: 0, lastClaim: null, favoriteIds: [], nightMode: false, lastSession: null,
});

// Calendar days use the device's timezone, including daylight saving changes.
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dayKey(date) === value;
}

export function parseProgress(raw: string | null): Progress {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return emptyProgress();
    const data = value as Record<string, unknown>;
    const result = emptyProgress();
    if (Number.isSafeInteger(data.credits) && (data.credits as number) >= 0) result.credits = data.credits as number;
    if (Number.isSafeInteger(data.streak) && (data.streak as number) >= 0) result.streak = data.streak as number;
    if (validDay(data.lastClaim)) result.lastClaim = data.lastClaim;
    if (Array.isArray(data.favoriteIds)) result.favoriteIds = Array.from(new Set(data.favoriteIds.filter((id): id is string => typeof id === "string" && id.length <= 100))).slice(0, 100);
    result.nightMode = data.nightMode === true;
    const session = data.lastSession as Partial<LastSession> | null;
    if (session && typeof session.characterId === "string" && typeof session.romanceMode === "boolean" && typeof session.updatedAt === "string" && Number.isFinite(Date.parse(session.updatedAt))) {
      result.lastSession = { characterId: session.characterId, romanceMode: session.romanceMode, updatedAt: session.updatedAt };
    }
    return result;
  } catch { return emptyProgress(); }
}

export function claimDaily(progress: Progress, now: Date): Progress {
  const today = dayKey(now);
  // A clock moving backwards must not grant additional credits.
  if (progress.lastClaim && progress.lastClaim >= today) return progress;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    ...progress,
    credits: Math.min(Number.MAX_SAFE_INTEGER, progress.credits + DAILY_CREDITS),
    streak: progress.lastClaim === dayKey(yesterday) ? progress.streak + 1 : 1,
    lastClaim: today,
  };
}

export function activeStreak(progress: Progress, now: Date): number {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return progress.lastClaim && progress.lastClaim >= dayKey(yesterday) ? progress.streak : 0;
}
