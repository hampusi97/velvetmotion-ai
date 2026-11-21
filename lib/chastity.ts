export interface ChastityState {
  locked: boolean;
  lockedAt?: string;
  requests: { at: string; granted: boolean }[];
  denials: number;
}

const KEY = (id: string) => `velvet:chastity:${id}`;
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

export const empty = (): ChastityState => ({ locked: false, requests: [], denials: 0 });

export function load(companionId: string): ChastityState {
  try {
    const raw = getRaw(KEY(companionId));
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<ChastityState>;
    return {
      locked: Boolean(p.locked),
      lockedAt: typeof p.lockedAt === "string" ? p.lockedAt : undefined,
      requests: Array.isArray(p.requests) ? p.requests.slice(0, 30) : [],
      denials: Number(p.denials) || 0,
    };
  } catch {
    return empty();
  }
}

export function save(companionId: string, s: ChastityState): void {
  try {
    setRaw(KEY(companionId), JSON.stringify(s));
  } catch {
    /* */
  }
}

/** Used in tests to seed raw storage directly (including corrupt payloads). */
export function setRawForTest(companionId: string, raw: string): void {
  setRaw(KEY(companionId), raw);
}

/** Minimum wait before a request may be granted, in hours. Rises with each denial. */
export function minimumHours(state: ChastityState): number {
  return Math.min(48, 2 ** state.denials);
}

export function requestUnlock(state: ChastityState): ChastityState {
  return { ...state, requests: [{ at: new Date().toISOString(), granted: false }, ...state.requests].slice(0, 30) };
}

export function grant(state: ChastityState): ChastityState {
  return {
    ...state,
    locked: false,
    lockedAt: undefined,
    requests: state.requests.map((r, i) => (i === 0 ? { ...r, granted: true } : r)),
  };
}

export function deny(state: ChastityState): ChastityState {
  return { ...state, denials: state.denials + 1 };
}

export function relock(state: ChastityState): ChastityState {
  return { ...state, locked: true, lockedAt: new Date().toISOString() };
}

/** Hours locked so far. */
export function hoursLocked(state: ChastityState): number {
  if (!state.lockedAt) return 0;
  return Math.max(0, (Date.now() - new Date(state.lockedAt).getTime()) / 3_600_000);
}

/** True when the most recent request has satisfied the minimum wait. */
export function mayGrant(state: ChastityState): boolean {
  const latest = state.requests[0];
  if (!latest || latest.granted) return false;
  return (Date.now() - new Date(latest.at).getTime()) / 3_600_000 >= minimumHours(state);
}
