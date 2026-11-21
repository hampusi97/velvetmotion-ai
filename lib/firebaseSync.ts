"use client";

/**
 * Local-First + Firebase Cloud Sync Coordinator
 * Automatically merges Coin Balance, Memory Vault, Relationship Progression/Streaks,
 * Collection Metadata, and Custom Characters to users/{uid}/vault/{docId} when signed in.
 */

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getCoins, setCoins } from "./storage";
import { emitCoinsChanged } from "./coinsStore";

export interface SyncStatus {
  signedIn: boolean;
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
  lastSyncedAt: number | null;
  syncing: boolean;
}

const LAST_LOCAL_WRITE_KEY = "vm-sync-local-ts";

function collectLocalVaultSnapshot() {
  if (typeof window === "undefined") return null;
  const memories: Record<string, string> = {};
  const progression: Record<string, string> = {};

  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const val = window.localStorage.getItem(k);
    if (val === null) continue;
    if (k.startsWith("velvetmotion_memory_")) memories[k] = val;
    else if (k.startsWith("vm_prog_") || k === "vm_daily_streak") progression[k] = val;
  }

  let customCompanions: unknown[] = [];
  try {
    const raw = window.localStorage.getItem("velvet-custom-girls");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip massive base64 image blobs so Firestore doc stays lightweight
        customCompanions = parsed.slice(0, 25).map((c) => ({
          ...c,
          avatar:
            typeof c?.avatar === "string" && c.avatar.startsWith("data:")
              ? "/portraits/chloe-parker.webp"
              : c?.avatar,
        }));
      }
    }
  } catch {
    /* ignore */
  }

  let collectionMeta: Array<{ id: string; characterId: string; characterName: string; type: string; url: string; createdAt: number }> = [];
  try {
    const raw = window.localStorage.getItem("vm-gallery");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        collectionMeta = parsed
          .filter((x) => typeof x?.url === "string" && !x.url.startsWith("data:"))
          .slice(0, 60)
          .map((x) => ({
            id: String(x.id || ""),
            characterId: String(x.characterId || ""),
            characterName: String(x.characterName || ""),
            type: String(x.type || "selfie"),
            url: String(x.url),
            createdAt: Number(x.createdAt || Date.now()),
          }));
      }
    }
  } catch {
    /* ignore */
  }

  return {
    coins: getCoins(),
    memories,
    progression,
    customCompanions,
    collectionMeta,
    unlockedSets: window.localStorage.getItem("vm-unlocked-private-sets") || "[]",
  };
}

export async function pushAllLocalStateToFirebase(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const { auth, syncVaultDocToFirestore } = await import("./firebase");
  if (!auth.currentUser) return false;
  const snap = collectLocalVaultSnapshot();
  if (!snap) return false;
  const now = Date.now();
  try {
    window.localStorage.setItem(LAST_LOCAL_WRITE_KEY, String(now));
  } catch {
    /* ignore */
  }

  const results = await Promise.all([
    syncVaultDocToFirestore("walletSnapshot", JSON.stringify({ coins: snap.coins }), now),
    syncVaultDocToFirestore("memoryVault", JSON.stringify(snap.memories), now),
    syncVaultDocToFirestore("progression", JSON.stringify(snap.progression), now),
    syncVaultDocToFirestore(
      "collectionMeta",
      JSON.stringify({ items: snap.collectionMeta, unlockedSets: snap.unlockedSets }),
      now,
    ),
    syncVaultDocToFirestore("customCompanions", JSON.stringify(snap.customCompanions), now),
  ]);
  return results.some(Boolean);
}

export async function pullCloudStateAndMerge(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const { auth, handleFirestoreError, OperationType, readVaultDocFromFirestore } = await import("./firebase");
  if (!auth.currentUser) return false;
  let merged = false;
  try {
    const localTs = Number(window.localStorage.getItem(LAST_LOCAL_WRITE_KEY) || 0);

    const [walletDoc, memDoc, progDoc, collDoc, compDoc] = await Promise.all([
      readVaultDocFromFirestore("walletSnapshot"),
      readVaultDocFromFirestore("memoryVault"),
      readVaultDocFromFirestore("progression"),
      readVaultDocFromFirestore("collectionMeta"),
      readVaultDocFromFirestore("customCompanions"),
    ]);

    if (walletDoc) {
      const parsed = JSON.parse(walletDoc.payloadJson) as { coins?: number };
      if (typeof parsed.coins === "number") {
        const mergedCoins = walletDoc.updatedAtMs > localTs ? parsed.coins : Math.max(getCoins(), parsed.coins);
        setCoins(mergedCoins);
        emitCoinsChanged(mergedCoins);
        merged = true;
      }
    }

    if (memDoc) {
      const parsed = JSON.parse(memDoc.payloadJson) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed || {})) {
        if (k.startsWith("velvetmotion_memory_") && typeof v === "string") {
          const existing = window.localStorage.getItem(k);
          if (!existing || memDoc.updatedAtMs > localTs) {
            window.localStorage.setItem(k, v);
            merged = true;
          }
        }
      }
    }

    if (progDoc) {
      const parsed = JSON.parse(progDoc.payloadJson) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed || {})) {
        if ((k.startsWith("vm_prog_") || k === "vm_daily_streak") && typeof v === "string") {
          const existing = window.localStorage.getItem(k);
          if (!existing || progDoc.updatedAtMs > localTs) {
            window.localStorage.setItem(k, v);
            merged = true;
          }
        }
      }
    }

    if (collDoc) {
      const parsed = JSON.parse(collDoc.payloadJson) as { items?: unknown[]; unlockedSets?: string };
      if (parsed.unlockedSets) {
        const curSets = JSON.parse(window.localStorage.getItem("vm-unlocked-private-sets") || "[]") as string[];
        const remoteSets = JSON.parse(parsed.unlockedSets) as string[];
        window.localStorage.setItem(
          "vm-unlocked-private-sets",
          JSON.stringify(Array.from(new Set([...curSets, ...remoteSets]))),
        );
        merged = true;
      }
    }

    if (compDoc) {
      const remoteList = JSON.parse(compDoc.payloadJson) as Array<{ id?: string }>;
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const cur = JSON.parse(window.localStorage.getItem("velvet-custom-girls") || "[]") as Array<{ id?: string }>;
        const byId = new Map<string, unknown>();
        for (const item of [...cur, ...remoteList]) {
          if (item?.id) byId.set(item.id, item);
        }
        window.localStorage.setItem("velvet-custom-girls", JSON.stringify(Array.from(byId.values()).slice(0, 40)));
        merged = true;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "users/vault");
  }
  return merged;
}

export function emitVaultUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vm:cloud-sync-request"));
  }
}

export function scheduleCloudStartup(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 0);
  return () => window.clearTimeout(id);
}

export function useFirebaseCloudSync(enabled = true) {
  const [status, setStatus] = useState<SyncStatus>({
    signedIn: false,
    uid: null,
    email: null,
    isAnonymous: false,
    lastSyncedAt: null,
    syncing: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const runSync = async (user: User | null) => {
      if (!user) {
        setStatus({
          signedIn: false,
          uid: null,
          email: null,
          isAnonymous: false,
          lastSyncedAt: null,
          syncing: false,
        });
        return;
      }
      setStatus((s) => ({
        ...s,
        signedIn: true,
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous,
        syncing: true,
      }));
      let synced = false;
      try {
        await pullCloudStateAndMerge();
        if (!cancelled) synced = await pushAllLocalStateToFirebase();
      } finally {
        if (!cancelled) setStatus((s) => s.uid !== user.uid ? s : {
          ...s,
          syncing: false,
          lastSyncedAt: synced ? Date.now() : s.lastSyncedAt,
        });
      }
    };

    const cancelStartup = scheduleCloudStartup(() => {
      void import("./firebase").then(({ auth }) => {
        if (cancelled) return;
        const unsubAuth = auth.onAuthStateChanged((user) => { void runSync(user).catch(() => {}); });
        const schedulePush = () => {
          if (!auth.currentUser) return;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void pushAllLocalStateToFirebase().then((synced) => {
              if (!cancelled && synced) setStatus((s) => ({ ...s, lastSyncedAt: Date.now() }));
            }).catch(() => {});
          }, 2500);
        };
        window.addEventListener("vm:coins-changed", schedulePush);
        window.addEventListener("vm:cloud-sync-request", schedulePush);
        unsubscribe = () => {
          unsubAuth();
          window.removeEventListener("vm:coins-changed", schedulePush);
          window.removeEventListener("vm:cloud-sync-request", schedulePush);
        };
      }).catch(() => {});
    });

    return () => {
      cancelled = true;
      cancelStartup();
      unsubscribe?.();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [enabled]);

  const syncNow = async () => {
    let synced = false;
    try {
      const { auth } = await import("./firebase");
      if (!auth.currentUser) return false;
      setStatus((s) => ({ ...s, syncing: true }));
      await pullCloudStateAndMerge();
      synced = await pushAllLocalStateToFirebase();
      return synced;
    } catch {
      return false;
    } finally {
      setStatus((s) => ({ ...s, syncing: false, lastSyncedAt: synced ? Date.now() : s.lastSyncedAt }));
    }
  };

  return { status, syncNow };
}
