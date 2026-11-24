/**
 * lib/relationshipState.ts — the one store for everything that accumulates.
 *
 * Supersedes the ad-hoc persistence in progression / relationship / streaks /
 * rewards. Versioned so a schema change never silently drops a streak.
 */
import { KEYS } from "./storageKeys";

export type UserStatus = "pussyfree" | "released" | "cuckold" | "chaste" | "hotwife" | "cheating";

export interface SessionRecord {
  id: string;
  startedAt: string;
  durationSec: number;
  edges: number;
  tier: 1 | 2 | 3;
}

export interface RelationshipState {
  v: 1;
  companionId: string;
  status: UserStatus;
  sphTier: 1 | 2 | 3;
  since?: string;
  bullName?: string;
  note?: string;
  nickname?: string;
  streak: { current: number; best: number; lastDay?: string };
  milestones: string[];
  sessions: SessionRecord[];
  unlocks: string[];
  lastSeen?: string;
  lastProactive?: string;
}

const MAX_SESSIONS = 50;

export function emptyState(companionId: string): RelationshipState {
  return {
    v: 1,
    companionId,
    status: "pussyfree",
    sphTier: 2,
    streak: { current: 0, best: 0 },
    milestones: [],
    sessions: [],
    unlocks: [],
  };
}

export function loadState(companionId: string): RelationshipState {
  if (typeof window === "undefined") return emptyState(companionId);
  try {
    const raw = window.localStorage.getItem(KEYS.rel(companionId));
    if (raw) return migrate(JSON.parse(raw), companionId);
    const legacy = window.localStorage.getItem(KEYS.kinkLegacy(companionId));
    if (legacy) {
      const migrated = migrate(JSON.parse(legacy), companionId);
      saveState(migrated);
      return migrated;
    }
    return emptyState(companionId);
  } catch {
    return emptyState(companionId);
  }
}

export function saveState(state: RelationshipState, opts?: { throwOnError?: boolean }): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.rel(state.companionId), JSON.stringify(state));
    if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("rel-state-sync", { detail: state.companionId }));
    }
  } catch (err) {
    if (opts?.throwOnError) throw err;
    /* quota or private mode — state stays in memory for the session */
  }
}

/** Accepts anything, returns a valid state. Unknown versions are repaired, never dropped. */
export function migrate(raw: unknown, companionId: string): RelationshipState {
  const base = emptyState(companionId);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<RelationshipState>;

  const statuses: UserStatus[] = ["pussyfree", "released", "cuckold", "chaste", "hotwife", "cheating"];
  return {
    ...base,
    status: statuses.includes(r.status as UserStatus) ? (r.status as UserStatus) : base.status,
    sphTier: r.sphTier === 1 || r.sphTier === 3 ? r.sphTier : 2,
    since: typeof r.since === "string" ? r.since : undefined,
    bullName: typeof r.bullName === "string" ? r.bullName : undefined,
    note: typeof r.note === "string" ? r.note : undefined,
    nickname: typeof r.nickname === "string" ? r.nickname : undefined,
    streak: {
      current: Number(r.streak?.current) || 0,
      best: Math.max(Number(r.streak?.best) || 0, Number(r.streak?.current) || 0),
      lastDay: typeof r.streak?.lastDay === "string" ? r.streak.lastDay : undefined,
    },
    milestones: Array.isArray(r.milestones) ? r.milestones.filter((m) => typeof m === "string") : [],
    sessions: Array.isArray(r.sessions) ? r.sessions.slice(0, MAX_SESSIONS) : [],
    unlocks: Array.isArray(r.unlocks) ? r.unlocks.filter((u) => typeof u === "string") : [],
    lastSeen: typeof r.lastSeen === "string" ? r.lastSeen : undefined,
    lastProactive: typeof r.lastProactive === "string" ? r.lastProactive : undefined,
  };
}

export const today = (): string => new Date().toISOString().slice(0, 10);

export const daysSince = (iso?: string, nowMs = Date.now()): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((nowMs - t) / 86_400_000));
};

/** Marks a visit and advances or resets the streak. Idempotent within a day. */
export function recordVisit(state: RelationshipState): RelationshipState {
  const day = today();
  if (state.streak.lastDay === day) return { ...state, lastSeen: new Date().toISOString() };

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const current =
    state.streak.lastDay === yesterday
      ? state.streak.current + 1
      : !state.streak.lastDay && state.streak.current > 0
        ? state.streak.current
        : 1;

  return {
    ...state,
    streak: { current, best: Math.max(current, state.streak.best), lastDay: day },
    lastSeen: new Date().toISOString(),
  };
}

export function recordSession(state: RelationshipState, s: SessionRecord): RelationshipState {
  return { ...state, sessions: [s, ...state.sessions].slice(0, MAX_SESSIONS) };
}

export function setStatus(state: RelationshipState, status: UserStatus): RelationshipState {
  const now = new Date().toISOString();
  return {
    ...state,
    status,
    since: status === "pussyfree" || status === "chaste" ? now : state.since,
    lastProactive: state.lastProactive,
  };
}

export function setNickname(state: RelationshipState, nickname: string): RelationshipState {
  const clean = nickname.trim().slice(0, 24);
  return { ...state, nickname: clean || undefined };
}

export function lastSession(state: RelationshipState): SessionRecord | undefined {
  return state.sessions[0];
}

/** Average duration of the last five sessions, rounded. Used for the callback line. */
export function recentAverage(state: RelationshipState): number {
  const recent = state.sessions.slice(0, 5);
  if (!recent.length) return 0;
  return Math.round(recent.reduce((sum, s) => sum + s.durationSec, 0) / recent.length);
}
