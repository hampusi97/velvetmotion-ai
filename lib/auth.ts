/** Local username auth. Firebase is optional and loaded only on logout. */

const USER_KEY = "vm-user";
const PREFS_KEY = "vm-user-prefs";

export type LocalUser = {
  username: string;
  joinedAt: number;
  uid?: string;
  email?: string | null;
  isFirebase?: boolean;
};

export type UserPrefs = {
  /** Optional fantasy match flavor for Discover */
  discoverRace?: "unspecified" | "white" | "black" | "other";
  nsfwDefault?: boolean;
};

export function getUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalUser;
    if (typeof parsed?.username === "string" && parsed.username.trim().length >= 2) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

export function requireLogin(): LocalUser | null {
  return getUser();
}

export function login(username: string): LocalUser | null {
  const clean = username.trim().slice(0, 24);
  if (clean.length < 2) return null;
  const user: LocalUser = { username: clean, joinedAt: Date.now() };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* */
  }
  return user;
}

export function logout() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* */
  }
  void import("@/lib/firebase")
    .then((m) => m.firebaseLogout?.())
    .catch(() => {});
}

export function getUserPrefs(): UserPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as UserPrefs) : {};
  } catch {
    return {};
  }
}

export function setUserPrefs(patch: Partial<UserPrefs>) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...getUserPrefs(), ...patch };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
}
