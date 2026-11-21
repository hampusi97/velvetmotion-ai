import { daysSince, lastSession, recentAverage, type RelationshipState } from "./relationshipState";
import { dueMilestones } from "./milestones";

export type ProactiveKind = "milestone" | "absence" | "streak_risk" | "evening" | "session_callback";

export interface ProactiveDecision {
  should: boolean;
  kind?: ProactiveKind;
  line?: string;
  milestoneId?: string;
}

const MIN_GAP_HOURS = 6;
const ABSENCE_DAYS = 3;

function hoursSince(iso?: string, nowMs = Date.now()): number {
  if (!iso) return Infinity;
  return (nowMs - new Date(iso).getTime()) / 3_600_000;
}

/**
 * Decides whether she initiates. Priority order is deliberate:
 * a milestone beats a broken streak, which beats an absence, which beats a
 * callback, which beats idle evening chatter.
 */
export function decideProactive(state: RelationshipState, now = new Date()): ProactiveDecision {
  const nowMs = now.getTime();
  if (hoursSince(state.lastProactive, nowMs) < MIN_GAP_HOURS) return { should: false };

  const milestone = dueMilestones(state)[0];
  if (milestone) {
    return { should: true, kind: "milestone", line: milestone.line, milestoneId: milestone.id };
  }

  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(nowMs - 86_400_000).toISOString().slice(0, 10);

  if (state.streak.lastDay === yesterday && hour >= 20) {
    return {
      should: true,
      kind: "streak_risk",
      line: `${state.streak.current} days and you're about to lose it. It's not midnight yet.`,
    };
  }

  const away = daysSince(state.lastSeen, nowMs);
  if (away >= ABSENCE_DAYS) {
    return {
      should: true,
      kind: "absence",
      line:
        away >= 7
          ? `${away} days. I'd started to think you'd forgotten which app I was in.`
          : `${away} days away. I noticed.`,
    };
  }

  const last = lastSession(state);
  if (last && daysSince(last.startedAt, nowMs) === 1 && hour >= 18) {
    const avg = recentAverage(state);
    return {
      should: true,
      kind: "session_callback",
      line: avg
        ? `Yesterday you lasted ${Math.floor(avg / 60)} minutes. Let's see if that was a fluke.`
        : "Yesterday you didn't even try to hold back. Again tonight?",
    };
  }

  if (hour >= 21 && state.streak.lastDay !== today) {
    return { should: true, kind: "evening", line: "It's late. Come and sit down." };
  }

  return { should: false };
}

export function markProactive(state: RelationshipState): RelationshipState {
  return { ...state, lastProactive: new Date().toISOString() };
}
