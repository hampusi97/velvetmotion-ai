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
  "goth-nyx": "/portraits/vesper.jpg",
  "sorority-blair": "/portraits/tess.jpg",
  "sitter-rue": "/portraits/liora.jpg",
  "prof-elaine": "/portraits/isolde.jpg",
  "officer-vega": "/portraits/nadine.jpg",
  "anime-yumi": "/portraits/briony.jpg",
  "bnwo-indigo": "/portraits/maren.jpg",
  "cuck-opaline": "/portraits/calla.jpg",
  "dual-tess-calla": "/portraits/tess.jpg",
  "anime-rei": "/portraits/isolde.jpg",
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

function studioPortraitFor(id: string): string {
  return STUDIO_PORTRAITS[id] || STUDIO_LIST[Math.abs(hashCode(id)) % STUDIO_LIST.length];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function mediaSeed(id: string, mood: string): number {
  return Math.abs(hashCode(id + ":" + mood)) % 100000;
}

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty:
    "professional beauty portrait, soft studio lighting, elegant makeup, looking at camera, photorealistic",
  seductive:
    "seductive pose, bedroom eyes, soft neon lighting, alluring expression, intimate atmosphere",
  lingerie:
    "wearing sexy lingerie, lace bra and panties, bedroom setting, soft lighting, sensual pose, detailed fabric",
  nude:
    "nude, beautiful naked body, soft natural lighting, artistic nude, detailed skin, looking at viewer",
  explicit:
    "explicit nude, aroused, detailed genitals, wet skin, intense eye contact, highly detailed erotic photography",
  sex:
    "having sex, explicit penetration, detailed anatomy, passionate expression, realistic skin texture, erotic scene",
  aftercare:
    "post-sex aftercare, soft lighting, intimate embrace, satisfied expression, gentle atmosphere",
  dual:
    "two beautiful women together, intimate dual scene, looking at viewer, detailed bodies, erotic composition",
};

function pollinationsUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
): string {
  const moodKey = mood;
  const figure = character.figure || "beautiful adult woman";
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
