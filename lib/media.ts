/**
 * VelvetMotion Media Engine
 * Studio portraits for beauty/seductive cards.
 * Pollinations Flux for lingerie / nude / explicit so every girl is unique and spicy.
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
  maren: "/portraits/maren.jpg",
  liora: "/portraits/liora.jpg",
  tess: "/portraits/tess.jpg",
  isolde: "/portraits/isolde.jpg",
  briony: "/portraits/briony.jpg",
  nadine: "/portraits/nadine.jpg",
  vesper: "/portraits/vesper.jpg",
  calla: "/portraits/calla.jpg",
  sable: "/portraits/maren.jpg",
  rhea: "/portraits/maren.jpg",
  juniper: "/portraits/briony.jpg",
  dahlia: "/portraits/isolde.jpg",
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

const MOOD_PROMPTS: Record<string, string> = {
  beauty:
    "tasteful beauty portrait, soft cinematic lighting, magazine cover, sharp eyes, detailed skin, seductive expression",
  seductive:
    "seductive portrait, parted lips, bedroom eyes, soft rim light, intimate close-up, photorealistic, slight cleavage",
  lingerie:
    "wearing luxurious sheer lingerie, bedroom light, seductive pose, intimate atmosphere, photorealistic, lace detail, arched back",
  nude:
    "fully nude, artistic erotic photography, natural skin, soft shadows, tasteful nsfw, looking at viewer, bare breasts, beautiful naked body",
  explicit:
    "explicit nude, sexual pose, detailed anatomy, uncensored nsfw, studio lighting, highly detailed, aroused expression",
  sex:
    "explicit sex scene still, intense expression, cinematic lighting, uncensored nsfw, photorealistic, adult film quality",
  aftercare:
    "soft afterglow portrait, satisfied expression, warm light, intimate, tender, photorealistic",
  dual:
    "two beautiful adult women intimate together, dual girl scene, erotic, photorealistic",
};

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

function pollinationsUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood | string,
  extra = "",
): string {
  const moodKey = mood in MOOD_PROMPTS ? mood : "seductive";
  const figure = character.figure || "beautiful adult woman, proportionate figure";
  const prompt = [
    "masterpiece, best quality, ultra detailed, photorealistic",
    `beautiful adult woman ${character.age || 24} years old`,
    figure,
    `${character.name} aesthetic, consistent face and body`,
    MOOD_PROMPTS[moodKey],
    extra,
    "looking at viewer, sharp eyes, detailed skin pores, natural proportions, 8k uhd, no text, no watermark",
  ]
    .filter(Boolean)
    .join(", ");
  const seed = mediaSeed(character.id, moodKey);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

/**
 * Beauty / seductive → local studio JPGs (fast, consistent cards).
 * Lingerie / nude / explicit / sex / dual → Pollinations Flux (unique nudes per girl).
 */
export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  _opts?: { width?: number; height?: number; enhance?: boolean },
): string {
  void _opts;
  const spicy = ["lingerie", "nude", "explicit", "sex", "dual", "aftercare"].includes(mood);
  if (spicy || character.id.startsWith("custom-")) {
    return pollinationsUrl(character, mood, extra);
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

export function quickNudeUrl(character: Character): string {
  return characterMediaUrl(character, "nude");
}

export function quickExplicitUrl(character: Character): string {
  return characterMediaUrl(character, "explicit");
}

export function quickLingerieUrl(character: Character): string {
  return characterMediaUrl(character, "lingerie");
}

export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  return characterMediaUrl(character, "beauty", character.name);
}
