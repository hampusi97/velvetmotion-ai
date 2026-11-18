/**
 * VelvetMotion Media Engine
 * Unique Pollinations Flux images per girl via figure + id seed.
 * Face-consistent: shared face seed across moods; optional photo-derived seed.
 * SPH / BNWO / JOI sequence generators for any girl.
 */

import type { Character } from "./charactersTypes";

export type MediaMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "sex"
  | "seductive"
  | "aftercare"
  | "dual"
  | "sph"
  | "bnwo"
  | "joi"
  | "joi-finish";

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function mediaSeed(id: string, mood: string, extra = ""): number {
  return Math.abs(hashCode(id + ":" + mood + ":" + extra)) % 100000;
}

/** Stable face seed from character — same identity across moods */
export function faceSeed(character: Pick<Character, "id" | "figure" | "name">): number {
  return Math.abs(hashCode(character.id + "|face|" + (character.figure || "").slice(0, 80))) % 100000;
}

/** Derive seed from uploaded photo data-URL so custom girls keep face lock */
export function seedFromPhotoDataUrl(dataUrl: string): number {
  const slice = dataUrl.slice(0, 400) + dataUrl.slice(-200);
  return Math.abs(hashCode(slice)) % 100000;
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
    "explicit nude, aroused, detailed anatomy, wet skin, intense eye contact, highly detailed erotic photography",
  sex:
    "having sex, explicit penetration, detailed anatomy, passionate expression, realistic skin texture, erotic scene",
  aftercare:
    "post-sex aftercare, soft lighting, intimate embrace, satisfied expression, gentle atmosphere",
  dual:
    "two beautiful women together, intimate dual scene, looking at viewer, detailed bodies, erotic composition",
  sph:
    "dominant woman looking down at viewer, teasing smile, pointing, SPH humiliation vibe, lingerie, confident posture, looking at camera",
  bnwo:
    "dominant black woman in charge, powerful pose, lingerie or elegant dress, BNWO fantasy aesthetic, confident gaze at viewer, luxurious setting",
  joi:
    "woman giving JOI instruction, pointing at viewer, seductive expression, lingerie, sitting on edge of bed, eye contact, instructional pose",
  "joi-finish":
    "woman encouraging climax, open mouth, intense eye contact, nude or lingerie, finishing instruction pose, erotic photography",
};

function pollinationsUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
  opts?: { seedOverride?: number; width?: number; height?: number },
): string {
  const figure = character.figure || "beautiful adult woman";
  const prompt = [
    "masterpiece, best quality, ultra detailed, photorealistic",
    `beautiful adult woman ${character.age || 24} years old`,
    figure,
    `${character.name} aesthetic, same face identity, consistent face and body`,
    MOOD_PROMPTS[mood],
    extra,
    "looking at viewer, sharp eyes, detailed skin, natural proportions, 8k uhd, no text, no watermark",
  ]
    .filter(Boolean)
    .join(", ");
  const base = opts?.seedOverride ?? faceSeed(character);
  const seed = (base + mediaSeed(character.id, mood, extra)) % 100000;
  const w = opts?.width ?? 768;
  const h = opts?.height ?? 1152;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  opts?: { width?: number; height?: number; enhance?: boolean; seedOverride?: number },
): string {
  return pollinationsUrl(character, mood, extra, opts);
}

export function joiSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "joi", "start instruction, clothed lingerie"),
    characterMediaUrl(character, "joi", "stroking pace command, leaning forward"),
    characterMediaUrl(character, "seductive", "almost there, intense eye contact"),
    characterMediaUrl(character, "joi-finish", "finish now command"),
  ];
}

export function sphSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "sph", "first look, amused"),
    characterMediaUrl(character, "sph", "pointing down, teasing"),
    characterMediaUrl(character, "explicit", "comparison tease, dominant"),
    characterMediaUrl(character, "sph", "final verdict, laughing softly"),
  ];
}

export function bnwoSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "bnwo", "entering room, powerful"),
    characterMediaUrl(character, "bnwo", "standing over viewer"),
    characterMediaUrl(character, "lingerie", "dominant lingerie, in control"),
    characterMediaUrl(character, "bnwo", "claiming the scene"),
  ];
}

export function sexSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "lingerie", "starting undress"),
    characterMediaUrl(character, "nude", "aroused"),
    characterMediaUrl(character, "explicit", "intense"),
    characterMediaUrl(character, "sex", "climax"),
  ];
}

export function characterGallery(character: Character): { mood: MediaMood; label: string; url: string }[] {
  const moods: { mood: MediaMood; label: string }[] = [
    { mood: "beauty", label: "Beauty" },
    { mood: "seductive", label: "Seductive" },
    { mood: "lingerie", label: "Lingerie" },
    { mood: "nude", label: "Nude" },
    { mood: "explicit", label: "Explicit" },
    { mood: "sex", label: "Sex" },
    { mood: "joi", label: "JOI" },
    { mood: "sph", label: "SPH" },
    { mood: "bnwo", label: "BNWO" },
    { mood: "aftercare", label: "Aftercare" },
  ];
  return moods.map(({ mood, label }) => ({
    mood,
    label,
    url: characterMediaUrl(character, mood),
  }));
}

export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  return characterMediaUrl(character, "beauty", character.name);
}
