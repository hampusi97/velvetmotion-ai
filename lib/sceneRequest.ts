/** Detect "send me a pic…" style requests and map to media moods (Candy pattern). */

import type { MediaMood } from "./media";

export type SceneRequest = {
  mood: MediaMood;
  label: string;
  extra: string;
};

/** If the user is asking for a photo/video, return a mood; otherwise null. */
export function parseSceneRequest(text: string): SceneRequest | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  const asksMedia =
    /\b(send|show|take|give|snap|pic|photo|selfie|nude|nudes|image|picture|video|clip)\b/.test(t) ||
    /\b(undress|strip|lingerie|joi|sph)\b/.test(t);

  if (!asksMedia) return null;

  if (/\b(sex|fuck|fucking|ride|climax|cum on)\b/.test(t)) {
    return { mood: "sex", label: "Sex scene", extra: text.slice(0, 120) };
  }
  if (/\bjoi\b|jerk off|stroke for me|finish for me/.test(t)) {
    return { mood: "joi", label: "JOI selfie", extra: text.slice(0, 120) };
  }
  if (/\bsph\b|small|tiny cock|humiliat/.test(t)) {
    return { mood: "sph", label: "SPH selfie", extra: text.slice(0, 120) };
  }
  if (/\bbnwo\b|blacked|cuck/.test(t)) {
    return { mood: "bnwo", label: "BNWO vibe", extra: text.slice(0, 120) };
  }
  if (/\b(explicit|spread|pussy|tits out|fully nude|naked)\b/.test(t)) {
    return { mood: "explicit", label: "Explicit", extra: text.slice(0, 120) };
  }
  if (/\b(nude|nudes|naked|undress|strip)\b/.test(t)) {
    return { mood: "nude", label: "Nude", extra: text.slice(0, 120) };
  }
  if (/\b(lingerie|bra|panties|lace)\b/.test(t)) {
    return { mood: "lingerie", label: "Lingerie", extra: text.slice(0, 120) };
  }
  if (/\b(aftercare|cuddle|after)\b/.test(t)) {
    return { mood: "aftercare", label: "Aftercare", extra: text.slice(0, 120) };
  }
  if (/\b(sexy|seductive|bedroom|mirror)\b/.test(t)) {
    return { mood: "seductive", label: "Seductive", extra: text.slice(0, 120) };
  }

  // Generic "send a pic"
  return { mood: "beauty", label: "Selfie", extra: text.slice(0, 120) };
}
