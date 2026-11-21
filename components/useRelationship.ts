"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useRelationship(companionId: string) {
  const [state, setState] = useState<RelationshipState>(() => emptyState(companionId));

  useEffect(() => {
    setState(recordVisit(loadState(companionId)));
  }, [companionId]);

  useEffect(() => {
    if (state.companionId) saveState(state);
  }, [state]);

  const patch = useCallback((fn: (s: RelationshipState) => RelationshipState) => {
    setState((prev) => fn(prev));
  }, []);

  const claimMilestones = useCallback(() => {
    const due = dueMilestones(state);
    if (!due.length) return [];
    patch((s) => ({
      ...s,
      milestones: [...s.milestones, ...due.map((m) => m.id)],
      unlocks: [...s.unlocks, ...due.flatMap((m) => (m.unlock ? [m.unlock] : []))],
    }));
    return due;
  }, [state, patch]);

  return {
    state,
    patch,
    setStatus: (s: UserStatus) => patch((prev) => setStatus(prev, s)),
    setSphTier: (sphTier: 1 | 2 | 3) => patch((prev) => ({ ...prev, sphTier })),
    setNickname: (n: string) => patch((prev) => setNickname(prev, n)),
    logSession: (s: SessionRecord) => patch((prev) => recordSession(prev, s)),
    claimMilestones,
    dismissProactive: () => patch(markProactive),
    decide: () => decideProactive(state),
  };
}
