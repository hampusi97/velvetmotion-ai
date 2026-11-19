import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import blueprint from "../firebase-blueprint.json";
import { characterPortraitUrl } from "./portraits";

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// All Google Workspace scopes enabled for Google Meet, Google Chat, Gmail, and Google Drive
export const SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/meetings.space.settings",
  "https://www.googleapis.com/auth/chat.spaces",
  "https://www.googleapis.com/auth/chat.spaces.create",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.messages.create",
  "https://www.googleapis.com/auth/chat.messages.readonly",
  "https://www.googleapis.com/auth/chat.memberships",
  "https://www.googleapis.com/auth/chat.memberships.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: "consent" });

// Validation constants derived directly from firebase-blueprint.json
const ID_REGEX = new RegExp(blueprint.entities.UserProfile.properties.uid.pattern);
const MAX_USERNAME_LEN = blueprint.entities.UserProfile.properties.username.maxLength;
const MAX_MESSAGE_LEN = blueprint.entities.ChatSession.properties.lastMessage.maxLength;
const MAX_URL_LEN = blueprint.entities.SavedMedia.properties.url.maxLength;
const MAX_PROMPT_LEN = blueprint.entities.SavedMedia.properties.prompt.maxLength;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
  return cleaned && ID_REGEX.test(cleaned) ? cleaned : "default-id";
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Sync Info:", JSON.stringify(errInfo));
}

let connectionTested = false;
export async function testConnection(): Promise<void> {
  if (typeof window === "undefined" || connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, "catalog", "status"));
  } catch {
    /* Optional offline mode: local IndexedDB always runs independently */
  }
}

if (typeof window !== "undefined") {
  void testConnection();
}

// In-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
const authListeners = new Set<(user: User | null, token: string | null) => void>();

function notifyListeners(user: User | null, token: string | null) {
  for (const listener of authListeners) {
    listener(user, token);
  }
}

export function initAuth(
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void,
): Unsubscribe {
  if (typeof window === "undefined") return () => {};
  // Complete any redirect-based OAuth flow (critical for Tauri v2 desktop webviews & mobile browsers)
  void getRedirectResult(auth)
    .then((redirectCred) => {
      if (redirectCred) {
        const oauthCred = GoogleAuthProvider.credentialFromResult(redirectCred);
        if (oauthCred?.accessToken) cachedAccessToken = oauthCred.accessToken;
        notifyListeners(redirectCred.user, cachedAccessToken);
      }
    })
    .catch(() => {});

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        await ensureUserProfileInFirestore(user, 500);
      } catch {
        // Ignore initial sync failure until verified
      }
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        onAuthSuccess?.(user, null);
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
    notifyListeners(user, cachedAccessToken);
  });
}

export function subscribeAuthState(
  cb: (user: User | null, token: string | null) => void,
): () => void {
  authListeners.add(cb);
  cb(auth.currentUser, cachedAccessToken);
  return () => {
    authListeners.delete(cb);
  };
}

function isWebviewOrTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function signInAnonymousGuest(): Promise<{ user: User }> {
  isSigningIn = true;
  try {
    const cred = await signInAnonymously(auth);
    notifyListeners(cred.user, null);
    return { user: cred.user };
  } finally {
    isSigningIn = false;
  }
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string | null } | null> {
  try {
    isSigningIn = true;
    // Inside Tauri v2 desktop webviews, prefer redirect flow over popups to prevent blank child windows
    if (isWebviewOrTauri()) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      cachedAccessToken = credential?.accessToken ?? null;
      await ensureUserProfileInFirestore(result.user, 500);
      notifyListeners(result.user, cachedAccessToken);
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupErr) {
      const code = (popupErr as { code?: string })?.code || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupErr;
    }
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function emailPasswordSignUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ user: User }> {
  try {
    isSigningIn = true;
    const cleanEmail = email.trim();
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const desiredName = (displayName || cleanEmail.split("@")[0] || "VelvetMember")
      .trim()
      .slice(0, MAX_USERNAME_LEN);
    if (desiredName) {
      await updateProfile(credential.user, { displayName: desiredName }).catch(() => {});
    }
    await sendEmailVerification(credential.user).catch(() => {});
    await ensureUserProfileInFirestore(credential.user, 500).catch(() => {});
    notifyListeners(credential.user, null);
    return { user: credential.user };
  } finally {
    isSigningIn = false;
  }
}

export async function emailPasswordSignIn(
  email: string,
  password: string,
): Promise<{ user: User }> {
  try {
    isSigningIn = true;
    const cleanEmail = email.trim();
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    await ensureUserProfileInFirestore(credential.user, 500).catch(() => {});
    notifyListeners(credential.user, null);
    return { user: credential.user };
  } finally {
    isSigningIn = false;
  }
}

export async function resetEmailPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerificationEmail(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.emailVerified || user.isAnonymous) return false;
  await sendEmailVerification(user);
  return true;
}

export async function refreshFirebaseUser(): Promise<User | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  const refreshed = auth.currentUser;
  if (refreshed?.emailVerified) {
    await ensureUserProfileInFirestore(refreshed, 500).catch(() => {});
  }
  notifyListeners(refreshed, cachedAccessToken);
  return refreshed;
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function firebaseLogout(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
  notifyListeners(null, null);
}

// Firestore Persistence Helpers with Blueprint Volumetric Constraints
export async function ensureUserProfileInFirestore(user: User, defaultCoins = 500): Promise<number> {
  const uid = sanitizeId(user.uid);
  if (uid !== user.uid || !user.emailVerified) return defaultCoins;
  const path = `users/${uid}`;
  const ref = doc(db, "users", uid);
  try {
    const snap = await getDoc(ref);
    const cleanName = (user.displayName || user.email?.split("@")[0] || "VelvetMember")
      .trim()
      .slice(0, MAX_USERNAME_LEN) || "VelvetMember";
    const safeCoins = Math.min(1000000, Math.max(0, Math.floor(defaultCoins)));
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        username: cleanName,
        coins: safeCoins,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return safeCoins;
    } else {
      const data = snap.data();
      return typeof data.coins === "number" ? data.coins : safeCoins;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return defaultCoins;
  }
}

export async function syncCoinsToFirestore(coins: number): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, "users", user.uid);
  const safeCoins = Math.min(1000000, Math.max(0, Math.floor(coins)));
  try {
    await ensureUserProfileInFirestore(user, safeCoins);
    await updateDoc(ref, {
      coins: safeCoins,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncChatSessionToFirestore(params: {
  characterId: string;
  intimacy: number;
  gifts: string[];
  lastMessage: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const charId = sanitizeId(params.characterId);
  const path = `users/${user.uid}/chats/${charId}`;
  const ref = doc(db, "users", user.uid, "chats", charId);
  const safeIntimacy = Math.min(100, Math.max(0, Math.floor(params.intimacy)));
  const safeGifts = params.gifts
    .filter((g) => typeof g === "string" && g.trim().length > 0)
    .map((g) => g.trim().slice(0, 60))
    .slice(0, 20);
  const safeMsg = (params.lastMessage || "Opened chat").trim().slice(0, MAX_MESSAGE_LEN) || "Opened chat";

  try {
    await ensureUserProfileInFirestore(user, 500);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: user.uid,
        characterId: charId,
        intimacy: safeIntimacy,
        gifts: safeGifts,
        lastMessage: safeMsg,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        intimacy: safeIntimacy,
        gifts: safeGifts,
        lastMessage: safeMsg,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveMediaToFirestore(params: {
  id: string;
  characterId: string;
  characterName: string;
  type: "portrait" | "lingerie" | "nude" | "explicit" | "video";
  url: string;
  prompt?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const mediaId = sanitizeId(params.id);
  const charId = sanitizeId(params.characterId);
  const path = `users/${user.uid}/gallery/${mediaId}`;
  const ref = doc(db, "users", user.uid, "gallery", mediaId);
  try {
    await ensureUserProfileInFirestore(user, 500);
    const rawUrl = params.url.trim();
    const safeUrl =
      rawUrl.length <= MAX_URL_LEN
        ? rawUrl
        : characterPortraitUrl(charId, params.characterName, params.type).slice(0, MAX_URL_LEN);
    await setDoc(ref, {
      userId: user.uid,
      characterId: charId,
      characterName: params.characterName.trim().slice(0, 80) || "Companion",
      mediaType: params.type,
      url: safeUrl,
      prompt: (params.prompt || "").trim().slice(0, MAX_PROMPT_LEN),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMediaFromFirestore(mediaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const cleanId = sanitizeId(mediaId);
  const path = `users/${user.uid}/gallery/${cleanId}`;
  try {
    await deleteDoc(doc(db, "users", user.uid, "gallery", cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCustomCompanionToFirestore(params: {
  id: string;
  name: string;
  age: number;
  category: string;
  tagline: string;
  personality: string;
  figure: string;
  kink: string;
  avatar: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const compId = sanitizeId(params.id);
  const path = `users/${user.uid}/companions/${compId}`;
  const ref = doc(db, "users", user.uid, "companions", compId);
  try {
    await ensureUserProfileInFirestore(user, 500);
    const rawAvatar = params.avatar.trim();
    const safeAvatar =
      rawAvatar.length <= 2000
        ? rawAvatar
        : characterPortraitUrl(compId, params.figure, params.personality).slice(0, 2000);
    await setDoc(ref, {
      userId: user.uid,
      name: params.name.trim().slice(0, 60) || "Custom Girl",
      age: Math.min(99, Math.max(21, Math.floor(params.age || 24))),
      category: params.category.trim().slice(0, 40) || "Girlfriend",
      tagline: params.tagline.trim().slice(0, 300) || "Your custom companion",
      personality: params.personality.trim().slice(0, 80) || "Sweet girlfriend",
      figure: params.figure.trim().slice(0, 200) || "Fictional adult",
      kink: params.kink.trim().slice(0, 200) || "Romance",
      avatar: safeAvatar,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserGallery(
  userId: string,
  onItems: (items: Array<{
    id: string;
    characterId: string;
    characterName: string;
    type: "portrait" | "lingerie" | "nude" | "explicit" | "video";
    url: string;
    prompt?: string;
    createdAt: number;
  }>) => void,
): Unsubscribe {
  const path = `users/${userId}/gallery`;
  const q = query(collection(db, "users", userId, "gallery"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          characterId: String(data.characterId || ""),
          characterName: String(data.characterName || "Companion"),
          type: (data.mediaType || "portrait") as "portrait" | "lingerie" | "nude" | "explicit" | "video",
          url: String(data.url || ""),
          prompt: data.prompt ? String(data.prompt) : undefined,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        };
      });
      onItems(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}


export async function deleteCustomCompanionFromFirestore(companionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const cleanId = sanitizeId(companionId);
  const path = `users/${user.uid}/companions/${cleanId}`;
  try {
    await deleteDoc(doc(db, "users", user.uid, "companions", cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserCompanions(
  userId: string,
  onItems: (items: Array<{
    id: string;
    name: string;
    age: number;
    category: string;
    tagline: string;
    personality: string;
    figure: string;
    kink: string;
    avatar: string;
  }>) => void,
): Unsubscribe {
  const path = `users/${userId}/companions`;
  const q = query(collection(db, "users", userId, "companions"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || "Custom Girl"),
          age: typeof data.age === "number" ? data.age : 24,
          category: String(data.category || "Girlfriend"),
          tagline: String(data.tagline || "Your custom companion"),
          personality: String(data.personality || "Sweet girlfriend"),
          figure: String(data.figure || "Fictional adult"),
          kink: String(data.kink || "Romance"),
          avatar: String(data.avatar || ""),
        };
      });
      onItems(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

async function ensureSignedInForCommunity(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    return null;
  }
}

export interface FirestoreLeaderboardRecord {
  uid: string;
  username: string;
  contactHandle?: string;
  totalUsd: number;
  donationCount: number;
  favoriteGirl: string;
  tierTitle: string;
  prizeStatus: string;
  lastDonatedAt: number;
  verifiedTxid?: string;
}

export async function syncDonatorLeaderboardToFirestore(params: {
  username: string;
  contactHandle?: string;
  totalUsd: number;
  donationCount: number;
  favoriteGirl: string;
  tierTitle: string;
  prizeStatus: string;
  verifiedTxid?: string;
}): Promise<boolean> {
  const user = await ensureSignedInForCommunity();
  if (!user) return false;
  const entryId = sanitizeId(user.uid);
  if (entryId !== user.uid) return false;
  const path = `donatorLeaderboard/${entryId}`;
  const ref = doc(db, "donatorLeaderboard", entryId);
  try {
    const existing = await getDoc(ref);
    const prev = existing.exists() ? existing.data() : null;
    const totalUsd = Math.min(
      1000000,
      Math.max(Math.floor(params.totalUsd), typeof prev?.totalUsd === "number" ? prev.totalUsd : 0),
    );
    const donationCount = Math.min(
      10000,
      Math.max(
        Math.floor(params.donationCount),
        typeof prev?.donationCount === "number" ? prev.donationCount : 0,
      ),
    );
    const payload: Record<string, unknown> = {
      uid: user.uid,
      username: (params.username || "VelvetSupporter").trim().slice(0, 40) || "VelvetSupporter",
      totalUsd,
      donationCount,
      favoriteGirl: (params.favoriteGirl || "Maren").trim().slice(0, 40) || "Maren",
      tierTitle: (params.tierTitle || "Supporter").trim().slice(0, 80) || "Supporter",
      prizeStatus: (params.prizeStatus || "Entered Prize Pool").trim().slice(0, 120) || "Entered Prize Pool",
      lastDonatedAt: Math.floor(Date.now()),
    };
    // Never publish private contactHandle PII to the shared leaderboard collection
    if (params.verifiedTxid && params.verifiedTxid.trim()) {
      payload.verifiedTxid = params.verifiedTxid.trim().slice(0, 80);
    }
    await setDoc(ref, payload, { merge: false });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function subscribeDonatorLeaderboardFromFirestore(
  onEntries: (entries: FirestoreLeaderboardRecord[]) => void,
): Promise<Unsubscribe> {
  const user = await ensureSignedInForCommunity();
  if (!user) return () => {};
  const path = "donatorLeaderboard";
  try {
    const q = query(collection(db, "donatorLeaderboard"), orderBy("totalUsd", "desc"), limit(30));
    return onSnapshot(
      q,
      (snap) => {
        const list: FirestoreLeaderboardRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.uid || d.id),
            username: String(data.username || "Supporter"),
            contactHandle: data.contactHandle ? String(data.contactHandle) : undefined,
            totalUsd: typeof data.totalUsd === "number" ? data.totalUsd : 0,
            donationCount: typeof data.donationCount === "number" ? data.donationCount : 0,
            favoriteGirl: String(data.favoriteGirl || "Maren"),
            tierTitle: String(data.tierTitle || "Supporter"),
            prizeStatus: String(data.prizeStatus || "Entered Prize Pool"),
            lastDonatedAt: typeof data.lastDonatedAt === "number" ? data.lastDonatedAt : Date.now(),
            verifiedTxid: data.verifiedTxid ? String(data.verifiedTxid) : undefined,
          };
        });
        onEntries(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      },
    );
  } catch {
    return () => {};
  }
}

export interface FirestoreSuggestionRecord {
  id: string;
  title: string;
  detail: string;
  category: "Mobile & Tablet" | "AI & Video" | "Frontend" | "Backend" | "Companions";
  status: "Live" | "In Progress" | "Planned";
  votes: number;
  author: string;
  createdAt: number;
}

export async function submitSuggestionToFirestore(
  item: FirestoreSuggestionRecord,
): Promise<boolean> {
  const user = await ensureSignedInForCommunity();
  if (!user) return false;
  const cleanId = sanitizeId(item.id);
  const path = `suggestions/${cleanId}`;
  try {
    await setDoc(doc(db, "suggestions", cleanId), {
      id: cleanId,
      title: item.title.trim().slice(0, 120),
      detail: item.detail.trim().slice(0, 400),
      category: item.category,
      status: item.status,
      votes: 1,
      author: (item.author || "Community").trim().slice(0, 40) || "Community",
      createdAt: Math.floor(item.createdAt || Date.now()),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return false;
  }
}

export async function upvoteSuggestionInFirestore(
  suggestionId: string,
  nextVotes: number,
): Promise<boolean> {
  const user = await ensureSignedInForCommunity();
  if (!user) return false;
  const cleanId = sanitizeId(suggestionId);
  const path = `suggestions/${cleanId}`;
  try {
    await updateDoc(doc(db, "suggestions", cleanId), {
      votes: Math.min(1000000, Math.max(1, Math.floor(nextVotes))),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

export async function syncVaultDocToFirestore(
  docId: string,
  payloadJson: string,
  updatedAtMs: number,
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const uid = sanitizeId(user.uid);
  const cleanDoc = sanitizeId(docId);
  if (uid !== user.uid) return false;
  const path = `users/${uid}/vault/${cleanDoc}`;
  try {
    const ref = doc(db, "users", uid, "vault", cleanDoc);
    const existing = await getDoc(ref).catch(() => null);
    let prevTs = 0;
    if (existing?.exists()) {
      const existingData = existing.data();
      prevTs = Number(existingData?.updatedAt?.toMillis?.() || 0);
      if (typeof existingData?.payload === "string") {
        try {
          const parsed = JSON.parse(existingData.payload);
          if (typeof parsed?.updatedAtMs === "number") {
            prevTs = Math.max(prevTs, parsed.updatedAtMs);
          }
        } catch {
          /* ignore */
        }
      }
    }
    if (prevTs > updatedAtMs) return false;
    const envelope = JSON.stringify({
      updatedAtMs: Math.floor(updatedAtMs),
      data: payloadJson.slice(0, 62000),
    });
    await setDoc(ref, {
      userId: uid,
      id: cleanDoc,
      kind: "snapshot",
      schemaVersion: 1,
      payload: envelope.slice(0, 65500),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function readVaultDocFromFirestore(
  docId: string,
): Promise<{ payloadJson: string; updatedAtMs: number } | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const uid = sanitizeId(user.uid);
  const cleanDoc = sanitizeId(docId);
  if (uid !== user.uid) return null;
  const path = `users/${uid}/vault/${cleanDoc}`;
  try {
    const snap = await getDoc(doc(db, "users", uid, "vault", cleanDoc));
    if (!snap.exists()) return null;
    const data = snap.data();
    const rawPayload =
      typeof data?.payload === "string"
        ? data.payload
        : typeof data?.json === "string"
          ? data.json
          : "{}";
    let payloadJson = rawPayload;
    let updatedAtMs = Number(data?.updatedAt?.toMillis?.() || 0);
    try {
      const parsed = JSON.parse(rawPayload);
      if (parsed && typeof parsed.data === "string") {
        payloadJson = parsed.data;
        if (typeof parsed.updatedAtMs === "number") {
          updatedAtMs = parsed.updatedAtMs;
        }
      }
    } catch {
      /* treat rawPayload directly */
    }
    return { payloadJson, updatedAtMs };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function subscribeSuggestionsFromFirestore(
  onItems: (items: FirestoreSuggestionRecord[]) => void,
): Promise<Unsubscribe> {
  const user = await ensureSignedInForCommunity();
  if (!user) return () => {};
  const path = "suggestions";
  try {
    const q = query(collection(db, "suggestions"), orderBy("votes", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const list: FirestoreSuggestionRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || "Community Suggestion"),
            detail: String(data.detail || ""),
            category: (data.category || "Frontend") as FirestoreSuggestionRecord["category"],
            status: (data.status || "Planned") as FirestoreSuggestionRecord["status"],
            votes: typeof data.votes === "number" ? data.votes : 1,
            author: String(data.author || "Community"),
            createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
          };
        });
        onItems(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      },
    );
  } catch {
    return () => {};
  }
}


