/** Local & Firebase Google Auth user state. */
import { auth, firebaseLogout } from "@/lib/firebase";

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
  if (auth.currentUser) {
    return {
      username:
        auth.currentUser.displayName ||
        auth.currentUser.email?.split("@")[0] ||
        "Google User",
      joinedAt: Date.now(),
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      isFirebase: true,
    };
  }
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
    /* private mode */
  }
  return user;
}

export function logout() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* */
  }
  void firebaseLogout().catch(() => {});
}
