import { KEYS } from "./storageKeys";
import type { UserStatus } from "./relationshipState";

export interface GlobalSettings {
  defaultStatus: UserStatus;
  defaultSphTier: 1 | 2 | 3;
  nickname?: string;
  onboarded: boolean;
}

const DEFAULT: GlobalSettings = { defaultStatus: "pussyfree", defaultSphTier: 2, onboarded: false };

export function loadGlobal(): GlobalSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEYS.global);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<GlobalSettings>;
    return {
      defaultStatus: (["pussyfree", "released", "cuckold", "chaste"] as UserStatus[]).includes(
        p.defaultStatus as UserStatus,
      )
        ? (p.defaultStatus as UserStatus)
        : DEFAULT.defaultStatus,
      defaultSphTier: p.defaultSphTier === 1 || p.defaultSphTier === 3 ? p.defaultSphTier : 2,
      nickname: typeof p.nickname === "string" ? p.nickname : undefined,
      onboarded: Boolean(p.onboarded),
    };
  } catch {
    return DEFAULT;
  }
}

export function saveGlobal(s: GlobalSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.global, JSON.stringify(s));
  } catch {
    /* */
  }
}
