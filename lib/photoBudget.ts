const KEY = (id: string) => `velvet:photobudget:${id}`;
const PER_DAY = 2;

const memoryStore = new Map<string, string>();

function readRaw(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, val: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, val);
    return;
  }
  memoryStore.set(key, val);
}

const today = () => new Date().toISOString().slice(0, 10);

export function remaining(companionId: string): number {
  try {
    const raw = readRaw(KEY(companionId));
    if (!raw) return PER_DAY;
    const { day, used } = JSON.parse(raw) as { day?: string; used?: number };
    return day === today() ? Math.max(0, PER_DAY - (used || 0)) : PER_DAY;
  } catch {
    return PER_DAY;
  }
}

export function consume(companionId: string): boolean {
  if (remaining(companionId) <= 0) return false;
  try {
    const raw = readRaw(KEY(companionId));
    const parsed = raw ? (JSON.parse(raw) as { day?: string; used?: number }) : {};
    const used = parsed.day === today() ? (parsed.used || 0) + 1 : 1;
    writeRaw(KEY(companionId), JSON.stringify({ day: today(), used }));
    return true;
  } catch {
    return false;
  }
}
