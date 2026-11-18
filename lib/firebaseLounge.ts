/**
 * Optional Firestore lounge. If Firebase not configured, callers keep using localStorage.
 */

export type LoungeMessage = {
  id: string;
  roomId: string;
  from: string;
  text: string;
  at: number;
  shareCode?: string;
};

export async function postLoungeMessage(
  roomId: string,
  msg: Omit<LoungeMessage, "id" | "roomId">,
): Promise<boolean> {
  try {
    const { getApps } = await import("firebase/app");
    if (!getApps().length) return false;
    const { getFirestore, collection, addDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await addDoc(collection(db, "loungeRooms", roomId, "messages"), {
      ...msg,
      roomId,
      createdAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function subscribeLounge(
  roomId: string,
  onMsgs: (msgs: LoungeMessage[]) => void,
): Promise<() => void> {
  try {
    const { getApps } = await import("firebase/app");
    if (!getApps().length) return () => {};
    const { getFirestore, collection, query, orderBy, limit, onSnapshot } = await import(
      "firebase/firestore"
    );
    const db = getFirestore();
    const q = query(
      collection(db, "loungeRooms", roomId, "messages"),
      orderBy("at", "asc"),
      limit(80),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: LoungeMessage[] = snap.docs.map((d) => {
        const data = d.data() as LoungeMessage;
        return { ...data, id: d.id, roomId };
      });
      onMsgs(list);
    });
    return unsub;
  } catch {
    return () => {};
  }
}
