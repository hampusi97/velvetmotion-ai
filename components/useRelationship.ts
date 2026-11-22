"use client";

import { useCallback, useEffect, useState } from "react";
import { loadGlobal } from "@/lib/globalSettings";
import {
  emptyState,
  loadState,
  recordSession,
  recordVisit,
  saveState,
  setNickname,
  setStatus,
  type RelationshipState,
  type SessionRecord,
  type UserStatus,
} from "@/lib/relationshipState";
import { dueMilestones } from "@/lib/milestones";
import { decideProactive, markProactive } from "@/lib/proactiveEngine";

function hydrateWithGlobals(companionId: string): RelationshipState {
  const loaded = loadState(companionId);
  const hasActivity =
    Boolean(loaded.since) ||
    loaded.sessions.length > 0 ||
    Boolean(loaded.lastSeen) ||
    Boolean(loaded.lastProactive) ||
    loaded.milestones.length > 0;
  if (hasActivity) return loaded;
  const g = loadGlobal();
  return {
    ...loaded,
    status: g.defaultStatus,
    sphTier: g.defaultSphTier,
    nickname: loaded.nickname ?? g.nickname,
  };
}

export function useRelationship(companionId: string) {
  const [state, setState] = useState<RelationshipState>(() => emptyState(companionId));

  useEffect(() => {
    const visited = recordVisit(hydrateWithGlobals(companionId));
    saveState(visited);
    setState(visited);

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === companionId) {
        setState(loadState(companionId));
      }
    };
    window.addEventListener("rel-state-sync", onSync);
    return () => window.removeEventListener("rel-state-sync", onSync);
  }, [companionId]);

  const patch = useCallback(
    (fn: (s: RelationshipState) => RelationshipState) => {
      const current = loadState(companionId);
      const next = fn(current);
      saveState(next);
      setState(next);
    },
    [companionId],
  );

  const claimMilestones = useCallback(() => {
    const current = loadState(companionId);
    const due = dueMilestones(current);
    if (!due.length) return [];
    patch((s) => ({
      ...s,
      milestones: [...s.milestones, ...due.map((m) => m.id)],
      unlocks: [...s.unlocks, ...due.flatMap((m) => (m.unlock ? [m.unlock] : []))],
    }));
    return due;
  }, [companionId, patch]);

  return {
    state,
    patch,
    setStatus: (s: UserStatus) => patch((prev) => setStatus(prev, s)),
    setSphTier: (sphTier: 1 | 2 | 3) =>
      patch((prev) => ({
        ...prev,
        sphTier,
        since: prev.since ?? new Date().toISOString(),
      })),
    setNickname: (n: string) => patch((prev) => setNickname(prev, n)),
    logSession: (s: SessionRecord) => patch((prev) => recordSession(prev, s)),
    claimMilestones,
    dismissProactive: () => patch(markProactive),
    decide: () => decideProactive(state),
  };
}
