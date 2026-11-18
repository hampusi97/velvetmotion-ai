/**
 * Parse free-text chat for Candy-style media requests:
 * "send a selfie", "show me nude", "JOI video", "SPH pic", etc.
 * Returns null if the message is ordinary chat.
 */

import type { MediaMood } from "@/lib/media";

export type SceneRequest = {
  mood: MediaMood;
  label: string;
  extra: string;
};

const PATTERNS: Array<{
  re: RegExp;
  mood: MediaMood;
  label: string;
  extra?: string;
}> = [
  {
    re: /\b(joi|jerk\s*off\s*instruction|guide\s*me|talk\s*me\s*through)\b/i,
    mood: "joi",
    label: "JOI",
    extra: "JOI POV, looking at camera, guiding, explicit dirty talk energy",
  },
  {
    re: /\b(sph|small\s*penis\s*humiliation|tiny\s*dick)\b/i,
    mood: "sph",
    label: "SPH",
    extra: "SPH teasing face, smirking at camera, humiliation energy",
  },
  {
    re: /\b(bnwo|blacked|bbc\s*only)\b/i,
    mood: "bnwo",
    label: "BNWO",
    extra: "BNWO aesthetic, dominant pose, explicit",
  },
  {
    re: /\b(sex\s*(video|clip|scene)|fuck\s*me\s*(video|clip)|hardcore\s*(video|clip))\b/i,
    mood: "sex",
    label: "sex clip",
    extra: "explicit sex scene, intense, cinematic",
  },
  {
    re: /\b(nude|naked|no\s*clothes|fully\s*nude)\b.*\b(pic|photo|selfie|image|shot)?\b|\b(send|show|give)\b.*\b(nude|naked)\b/i,
    mood: "nude",
    label: "nude",
    extra: "fully nude, tasteful explicit, soft lighting",
  },
  {
    re: /\b(explicit|pussy|tits\s*out|spread|close.?up)\b/i,
    mood: "explicit",
    label: "explicit",
    extra: "explicit close-up, detailed, photoreal",
  },
  {
    re: /\b(lingerie|in\s*lingerie|underwear|bra\s*and\s*panties)\b/i,
    mood: "lingerie",
    label: "lingerie",
    extra: "sexy lingerie, bedroom lighting",
  },
  {
    re: /\b(selfie|self.?pic|send\s*(a\s*)?(pic|photo|image|shot)|show\s*me\s*(you|your\s*face|yourself)|pic\s*of\s*you|photo\s*of\s*you)\b/i,
    mood: "beauty",
    label: "selfie",
    extra: "intimate selfie, looking at camera, natural light",
  },
  {
    re: /\b(video|clip|motion)\b.*\b(of\s*you|for\s*me)?\b|\b(send|show)\b.*\b(video|clip)\b/i,
    mood: "seductive",
    label: "video",
    extra: "short cinematic clip, natural motion, looking at camera",
  },
];

export function parseSceneRequest(text: string): SceneRequest | null {
  const t = text.trim();
  if (t.length < 3 || t.length > 220) return null;
  const hasMediaVerb =
    /\b(send|show|give|take|snap|post|drop|share)\b/i.test(t) ||
    /\b(pic|photo|selfie|image|shot|video|clip|nude|naked|lingerie|joi|sph)\b/i.test(t);
  if (!hasMediaVerb) return null;

  for (const p of PATTERNS) {
    if (p.re.test(t)) {
      return {
        mood: p.mood,
        label: p.label,
        extra: p.extra || t.slice(0, 120),
      };
    }
  }
  return null;
}
