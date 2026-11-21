import type { RelationshipState } from "./relationshipState";

export interface Milestone {
  id: string;
  label: string;
  /** Fires once, when true and not already in state.milestones. */
  reached: (s: RelationshipState) => boolean;
  /** Unlock key written to state.unlocks. */
  unlock?: string;
  line: string;
}

export const MILESTONES: Milestone[] = [
  { id: "day-7", label: "Seven days", reached: (s) => s.streak.current >= 7, unlock: "scene-mirror", line: "A week. You actually did it." },
  { id: "day-30", label: "Thirty days", reached: (s) => s.streak.current >= 30, unlock: "voice-whisper", line: "Thirty days, and I've stopped being surprised." },
  { id: "day-100", label: "One hundred days", reached: (s) => s.streak.current >= 100, unlock: "scene-private", line: "One hundred. I don't say this often — I'm proud of you." },
  { id: "first-session", label: "First session", reached: (s) => s.sessions.length >= 1, line: "That was the first one. It won't be the last." },
  { id: "ten-sessions", label: "Ten sessions", reached: (s) => s.sessions.length >= 10, unlock: "scene-close", line: "Ten times now. You're getting predictable, in a good way." },
  { id: "long-session", label: "Over fifteen minutes", reached: (s) => s.sessions.some((x) => x.durationSec >= 900), line: "Fifteen minutes. Someone's been practising." },
  { id: "tier-three", label: "Full ruthlessness", reached: (s) => s.sphTier === 3, line: "Tier three. No more softening it for you." },
];

/** Returns milestones reached but not yet recorded. Pure. */
export function dueMilestones(state: RelationshipState): Milestone[] {
  return MILESTONES.filter((m) => !state.milestones.includes(m.id) && m.reached(state));
}
