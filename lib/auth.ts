/** Local username auth. Firebase is optional and loaded only on logout. */

const USER_KEY = "vm-user";

export type LocalUser = {
  username: string;
  joinedAt: number;
  uid?: string;
  email?: string | null;
  isFirebase?: boolean;
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
