import { KEYS } from "./storageKeys";
import type { TributeChallenge } from "./tributes";

export interface TributeRun {
  id: string;
  challengeId: string;
  completedAt: string;
  minutes: number;
  intensity: TributeChallenge["intensity"];
}

const MAX = 100;
const fallbackStore = new Map<string, string>();

function getRaw(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return fallbackStore.get(key) ?? null;
}

function setRaw(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }
  fallbackStore.set(key, value);
}

export function load(companionId: string): TributeRun[] {
  try {
    const raw = getRaw(KEYS.tribute(companionId));
    return raw ? (JSON.parse(raw) as TributeRun[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function log(companionId: string, run: TributeRun): TributeRun[] {
  const next = [run, ...load(companionId)].slice(0, MAX);
  try {
    setRaw(KEYS.tribute(companionId), JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

export function count(companionId: string): number {
  return load(companionId).length;
}

/** Longest run of consecutive days with at least one completed tribute. */
export function runStreak(companionId: string): number {
  const days = [...new Set(load(companionId).map((r) => r.completedAt.slice(0, 10)))].sort().reverse();
  let best = 0;
  let current = 0;
  let prev: string | null = null;
  for (const day of days) {
    if (!prev) current = 1;
    else {
      const gap = (new Date(prev).getTime() - new Date(day).getTime()) / 86_400_000;
      current = Math.abs(gap - 1) < 0.5 ? current + 1 : 1;
    }
    best = Math.max(best, current);
    prev = day;
  }
  return best;
}
