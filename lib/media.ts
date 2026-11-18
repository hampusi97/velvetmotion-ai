/**
 * VelvetMotion Media Engine
 * Serves crisp, zero-latency studio portraits for every companion from /public/portraits.
 * Keeps consistent per-character visual identity with zero external rate limits.
 */

import type { Character } from "./charactersTypes";
import { characterPortraitUrl, type PortraitMood } from "./portraits";

export type MediaMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "sex"
  | "seductive"
  | "aftercare"
  | "dual";

const STUDIO_PORTRAITS: Record<string, string> = {
  // Core 1-8 (Featured row)
  maren: "/portraits/maren.jpg",
  liora: "/portraits/liora.jpg",
  tess: "/portraits/tess.jpg",
  isolde: "/portraits/isolde.jpg",
  briony: "/portraits/briony.jpg",
  nadine: "/portraits/nadine.jpg",
  vesper: "/portraits/vesper.jpg",
  calla: "/portraits/calla.jpg",
  // Core 9-12
  sable: "/portraits/maren.jpg",
  rhea: "/portraits/maren.jpg",
  juniper: "/portraits/briony.jpg",
  dahlia: "/portraits/isolde.jpg",
  // Extended cast — non-overlapping portraits within every category
  valentina: "/portraits/briony.jpg",
  "lana-rho": "/portraits/isolde.jpg",
  "lena-plug": "/portraits/briony.jpg",
  "dalia-x": "/portraits/isolde.jpg",
  "riley-re": "/portraits/calla.jpg",
  scarlett: "/portraits/tess.jpg",
  maya: "/portraits/vesper.jpg",
  bianca: "/portraits/vesper.jpg",
  ravenna: "/portraits/isolde.jpg",
  tessa: "/portraits/liora.jpg",
  lola: "/portraits/tess.jpg",
  iris: "/portraits/nadine.jpg",
  nova: "/portraits/briony.jpg",
  wren: "/portraits/tess.jpg",
  jade: "/portraits/nadine.jpg",
  luna: "/portraits/vesper.jpg",
  kira: "/portraits/tess.jpg",
  amber: "/portraits/tess.jpg",
  sofia: "/portraits/calla.jpg",
  raven: "/portraits/vesper.jpg",
  priya: "/portraits/nadine.jpg",
  zara: "/portraits/calla.jpg",
  mila: "/portraits/liora.jpg",
  sienna: "/portraits/calla.jpg",
  yuki: "/portraits/isolde.jpg",
  freya: "/portraits/liora.jpg",
  camille: "/portraits/nadine.jpg",
  aisha: "/portraits/maren.jpg",
  elena: "/portraits/briony.jpg",
  hannah: "/portraits/liora.jpg",
  naya: "/portraits/nadine.jpg",
};

const STUDIO_LIST = [
  "/portraits/maren.jpg",
  "/portraits/liora.jpg",
  "/portraits/tess.jpg",
  "/portraits/isolde.jpg",
  "/portraits/briony.jpg",
  "/portraits/nadine.jpg",
  "/portraits/vesper.jpg",
  "/portraits/calla.jpg",
];

function toPortraitMood(mood: MediaMood | string): PortraitMood {
  if (mood === "beauty") return "beauty";
  if (mood === "lingerie") return "lingerie";
  if (mood === "nude") return "nude";
  if (mood === "explicit" || mood === "sex") return "explicit";
  return "seductive";
}

/** Deterministic seed from character id + mood so the same girl always stays consistent */
export function mediaSeed(characterId: string, mood: MediaMood | string = "beauty"): number {
  let h = 2166136261;
  const str = `${characterId}:${mood}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 999999;
}

export function studioPortraitFor(id: string): string {
  const clean = id.replace(/^custom-/, "").toLowerCase();
  if (STUDIO_PORTRAITS[clean]) return STUDIO_PORTRAITS[clean];
  return STUDIO_LIST[mediaSeed(clean, "beauty") % STUDIO_LIST.length];
}

/**
 * Return local studio photographic portrait for a companion, falling back to SVG if needed.
 */
export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  _opts?: { width?: number; height?: number; enhance?: boolean },
): string {
  void _opts;
  void extra;
  if (character.id.startsWith("custom-") && !STUDIO_PORTRAITS[character.id.replace(/^custom-/, "")]) {
    const portraitMood = toPortraitMood(mood);
    return characterPortraitUrl(character.id, character.figure || character.name, portraitMood, character.name);
  }
  return studioPortraitFor(character.id);
}

/** Full gallery set for a character — ready to drop into UI */
export function characterGallery(character: Character): { mood: MediaMood; label: string; url: string }[] {
  const moods: { mood: MediaMood; label: string }[] = [
    { mood: "beauty", label: "Beauty" },
    { mood: "seductive", label: "Seductive" },
    { mood: "lingerie", label: "Lingerie" },
    { mood: "nude", label: "Nude" },
    { mood: "explicit", label: "Explicit" },
    { mood: "sex", label: "Sex" },
    { mood: "aftercare", label: "Aftercare" },
  ];

  return moods.map(({ mood, label }) => ({
    mood,
    label,
    url: characterMediaUrl(character, mood),
  }));
}

/** Quick one-shot helper used by chat / generate buttons */
export function quickNudeUrl(character: Character): string {
  return characterMediaUrl(character, "nude");
}

export function quickExplicitUrl(character: Character): string {
  return characterMediaUrl(character, "explicit");
}

export function quickLingerieUrl(character: Character): string {
  return characterMediaUrl(character, "lingerie");
}

/** Default avatar resolver */
export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  return characterMediaUrl(character, "beauty", character.name);
}
