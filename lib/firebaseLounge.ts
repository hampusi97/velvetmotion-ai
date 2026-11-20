/**
 * VelvetMotion Live Lounge Transport:
 * 1. Primary: Firebase Firestore (`loungeRooms/{roomId}/messages`) obeying `firestore.rules`
 * 2. Optional local tab notification: `BroadcastChannel("vm-lounge-live")`.
 *
 * A connected Firebase session and rules are required for actual cross-device rooms.
 * The static-export frontend has NO `/api/lounge` fallback endpoint.
 */

export type LoungeMessage = {
  id: string;
  roomId: string;
  from: string;
  text: string;
  at: number;
  shareCode?: string;
};

export type LoungeTransportMode = "firestore" | "cloud-relay" | "local";

const CHANNEL_NAME = "vm-lounge-live";

async function ensureFirebaseAuthSession(): Promise<void> {
  try {
    const { auth } = await import("./firebase");
    if (auth.currentUser) return;
    const { signInAnonymously } = await import("firebase/auth");
    await signInAnonymously(auth);
  } catch {
    /* Anonymous auth may be disabled; caller reports Firestore write failure. */
  }
}

function broadcastLocalChannel(msg: LoungeMessage): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(msg);
    bc.close();
  } catch {
    /* ignore */
  }
}

export async function postLoungeMessage(
  roomId: string,
  msg: Omit<LoungeMessage, "id" | "roomId">,
): Promise<boolean> {
  const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "public";
  const cleanFrom = (msg.from || "Anon").trim().slice(0, 60);
  const cleanText = (msg.text || "").trim().slice(0, 1000);
  const cleanAt = typeof msg.at === "number" && Number.isFinite(msg.at) ? Math.floor(msg.at) : Date.now();
  const cleanShareCode =
    typeof msg.shareCode === "string" && msg.shareCode.trim().length > 0
      ? msg.shareCode.trim().slice(0, 4000)
      : undefined;

  if (!cleanFrom || !cleanText) return false;

  let wroteFirestore = false;

  // 1. Try Firestore write (strictly matching `isValidLoungeMessage` in firestore.rules, no undefined keys)
  try {
    await ensureFirebaseAuthSession();
    const { db } = await import("./firebase");
    const { collection, addDoc } = await import("firebase/firestore");
    const payload: Record<string, unknown> = {
      from: cleanFrom,
      text: cleanText,
      at: cleanAt,
      roomId: cleanRoom,
      createdAt: cleanAt,
    };
    if (cleanShareCode) {
      payload.shareCode = cleanShareCode;
    }
    const ref = await addDoc(collection(db, "loungeRooms", cleanRoom, "messages"), payload);
    wroteFirestore = Boolean(ref?.id);
  } catch {
    wroteFirestore = false;
  }

  // Static-export builds cannot provide /api/lounge. Firestore is the only
  // cross-device delivery transport. Report a failed write honestly.
  if (wroteFirestore) {
    broadcastLocalChannel({
      id: `local-${Date.now()}`, roomId: cleanRoom, from: cleanFrom,
      text: cleanText, at: cleanAt, ...(cleanShareCode ? { shareCode: cleanShareCode } : {}),
    });
  }
  return wroteFirestore;
}

export async function subscribeLounge(
  roomId: string,
  onMsgs: (msgs: LoungeMessage[], mode?: LoungeTransportMode) => void,
): Promise<() => void> {
  const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "public";
  let unsubFirestore = () => {};
  // No phantom cloud relay: a web static export has no backend route to poll.
  // Subscribe to Firestore `loungeRooms/{roomId}/messages`
  try {
    await ensureFirebaseAuthSession();
    const { db } = await import("./firebase");
    const { collection, query, orderBy, limit, onSnapshot } = await import("firebase/firestore");
    const q = query(
      collection(db, "loungeRooms", cleanRoom, "messages"),
      orderBy("at", "asc"),
      limit(80),
    );
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        const list: LoungeMessage[] = snap.docs.map((d) => {
          const data = d.data() as LoungeMessage;
          return { ...data, id: d.id, roomId: cleanRoom };
        });
        onMsgs(list, "firestore");
      },
      () => {
        onMsgs([], "local"); // Local-only; a remote room cannot be reached.
      },
    );
  } catch {
    onMsgs([], "local"); // Failed to authenticate / subscribe to Firestore.
  }

  return () => {
    unsubFirestore();

  };
}
