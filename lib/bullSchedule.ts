const KEY = (id: string) => `velvet:bull:${id}`;
export type Schedule = number[];

export function load(companionId: string): Schedule {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(companionId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [];
  } catch {
    return [];
  }
}

export function save(companionId: string, days: Schedule): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(companionId), JSON.stringify([...new Set(days)].sort()));
  } catch { /* */ }
}

export function daysUntil(companionId: string, from = new Date()): number {
  const days = load(companionId);
  if (!days.length) return Infinity;
  for (let i = 0; i <= 7; i++) {
    if (days.includes((from.getDay() + i) % 7)) return i;
  }
  return Infinity;
}

export function scheduleLine(companionId: string, from = new Date()): string {
  const d = daysUntil(companionId, from);
  if (!Number.isFinite(d)) return "";
  if (d === 0) return "He's here tonight.";
  if (d === 1) return "He's here tomorrow.";
  return `He's here in ${d} days.`;
}
