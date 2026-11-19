/**
 * VelvetMotion Live Lounge Transport:
 * 1. Primary: Firebase Firestore (`loungeRooms/{roomId}/messages`) obeying `firestore.rules`
 * 2. Cloud Relay & Multi-Tab Live Sync: `/api/lounge` + `BroadcastChannel("vm-lounge-live")`
 *
 * Ensures lounge writes and real-time room updates work in production whether the user
 * signed in via Google Auth, anonymous Firebase Auth, or local username auth.
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
    /* Anonymous auth may be disabled in Firebase Console; cloud relay fallback will handle writes */
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

  // 2. Also post to `/api/lounge` cloud relay so production rooms stay live for all visitors
  let wroteRelay = false;
  if (typeof fetch !== "undefined") {
    try {
      const res = await fetch("/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: cleanRoom,
          from: cleanFrom,
          text: cleanText,
          at: cleanAt,
          ...(cleanShareCode ? { shareCode: cleanShareCode } : {}),
        }),
      });
      if (res.ok) {
        wroteRelay = true;
        const data = await res.json();
        if (data?.message) {
          broadcastLocalChannel(data.message as LoungeMessage);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return wroteFirestore || wroteRelay;
}

export async function subscribeLounge(
  roomId: string,
  onMsgs: (msgs: LoungeMessage[], mode?: LoungeTransportMode) => void,
): Promise<() => void> {
  const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "public";
  let firestoreActive = false;
  let unsubFirestore = () => {};
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let bc: BroadcastChannel | null = null;

  const fetchRelayMessages = async () => {
    if (firestoreActive || typeof fetch === "undefined") return;
    try {
      const res = await fetch(`/api/lounge?room=${encodeURIComponent(cleanRoom)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.messages) && data.messages.length > 0 && !firestoreActive) {
        onMsgs(data.messages as LoungeMessage[], "cloud-relay");
      }
    } catch {
      /* ignore */
    }
  };

  // Start immediate cloud-relay fetch so room is populated right away
  void fetchRelayMessages();
  if (typeof window !== "undefined") {
    pollTimer = setInterval(() => {
      void fetchRelayMessages();
    }, 4500);

    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = () => {
          void fetchRelayMessages();
        };
      } catch {
        /* ignore */
      }
    }
  }

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
        if (list.length > 0) {
          firestoreActive = true;
          onMsgs(list, "firestore");
        }
      },
      () => {
        /* Firestore rules not yet deployed or anonymous auth restricted; cloud-relay remains active */
      },
    );
  } catch {
    /* Cloud relay remains active */
  }

  return () => {
    unsubFirestore();
    if (pollTimer) clearInterval(pollTimer);
    if (bc) {
      try {
        bc.close();
      } catch {
        /* ignore */
      }
    }
  };
}
