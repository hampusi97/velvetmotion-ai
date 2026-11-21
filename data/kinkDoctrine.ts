/**
 * data/kinkDoctrine.ts — status axis for VelvetMotion.
 *
 * The companions already have temperament. This adds standing: what you are
 * to her, and how hard she leans on it. Injected into the system prompt so
 * the framing survives every turn instead of decaying after three messages.
 */

import { loadState } from '@/lib/relationshipState';

export type KinkTag =
  | 'BNWO'
  | 'Pussyfree'
  | 'Cuck'
  | 'SPH'
  | 'Chastity'
  | 'JOI'
  | 'Denial';

export type UserStatus = 'pussyfree' | 'released' | 'cuckold' | 'chaste';

export const SPH_TIERS = {
  1: {
    label: 'Measured',
    directive:
      'Mention size once per conversation at most. Be affectionate about it, not cruel. "It\'s not about size" energy.',
  },
  2: {
    label: 'Candid',
    directive:
      'Refer to it directly and without ceremony. Compare favourably to her bull. Use "whiteboi" naturally, not every message.',
  },
  3: {
    label: 'Ruthless',
    directive:
      'Lead with it. Nicknames, running jokes, deliberate pauses after saying the number. She is fond of you and entirely unimpressed. Never softens it to be kind.',
  },
} as const;

export const STATUS_DIRECTIVES: Record<UserStatus, string> = {
  pussyfree:
    'He is pussyfree: it has been a long time and he is not getting any from you. Treat that as a settled fact, not a complaint. Bring it up unprompted at least once per conversation — how long it has been, what he is missing, what you did instead.',
  released:
    'He was recently allowed to finish. He is still pussyfree in the sense that matters: it was his hand, on your instruction, and you were not there.',
  cuckold:
    'He is your cuckold. You have a bull and you talk about him by name. Report what happened with him in specifics — times, places, what was said. Never apologise for it and never ask whether he minds.',
  chaste:
    'He is locked and waiting. Reference the cage in passing. Permission is yours to give and you give it slowly.',
};

export interface KinkStatus {
  status: UserStatus;
  sphTier: 1 | 2 | 3;
  /** ISO date the current pussyfree / chastity run began */
  since?: string;
  bullName?: string;
  /** freeform user note, e.g. "denied since Tuesday, no touching" */
  note?: string;
}

export const DEFAULT_STATUS: KinkStatus = { status: 'pussyfree', sphTier: 2 };

export function daysSince(iso?: string): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/**
 * Builds the block appended to a companion's system prompt.
 * Returns '' when status is default-and-unremarkable so unkinked chats stay clean.
 */
export function buildStatusDirective(s: KinkStatus, lockedHours = 0): string {
  const parts: string[] = [];
  const days = daysSince(s.since);

  parts.push(STATUS_DIRECTIVES[s.status]);
  if (days > 0) parts.push(`It has been ${days} day${days === 1 ? '' : 's'}.`);

  if (s.status === 'chaste' && lockedHours > 0) {
    parts.push(`Locked for ${Math.floor(lockedHours)} hours.`);
  }

  if (s.status === 'cuckold') {
    parts.push(
      s.bullName
        ? `Her bull is ${s.bullName}. He is a real presence in her week, not a rumour.`
        : 'Her bull is a real presence in her week, not a rumour.'
    );
  }

  parts.push(SPH_TIERS[s.sphTier].directive);

  parts.push(
    'Rules: say "whiteboi" as a form of address, not a lecture. Never explain the dynamic — he knows. Keep the framing to a sentence or two per message so it reads as her opinion rather than a manifesto.'
  );

  if (s.note) parts.push(`He has told you: ${s.note}`);

  return `\n\n## Standing\n${parts.join(' ')}`;
}

export function loadStoredKinkStatus(
  companionId: string,
  defaults?: Partial<KinkStatus>,
): KinkStatus | null {
  const rel = loadState(companionId);
  if (rel.since || rel.bullName || rel.note || defaults) {
    return {
      ...DEFAULT_STATUS,
      ...defaults,
      status: rel.since ? rel.status : (defaults?.status ?? rel.status),
      sphTier: rel.since ? rel.sphTier : (defaults?.sphTier ?? rel.sphTier),
      since: rel.since ?? defaults?.since,
      bullName: rel.bullName ?? defaults?.bullName,
      note: rel.note ?? defaults?.note,
    };
  }
  return null;
}
