/**
 * VelvetMotion Media Engine
 * Candy-style photoreal + optional local ComfyUI/Forge + aggressive face seeds.
 * All adult moods stay fully NSFW-capable.
 */

import type { Character } from "./charactersTypes";
import { getCharacterFaceSeed, getMediaSettings } from "./mediaSettings";
import { generateLocalImage } from "./comfyClient";

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

export function faceSeed(character: Pick<Character, "id" | "figure" | "name">): number {
  const stored = getCharacterFaceSeed(character.id);
  if (stored != null) return stored;
  return Math.abs(hashCode(character.id + "|face|" + (character.figure || "").slice(0, 160))) % 100000;
}

export function seedFromPhotoDataUrl(dataUrl: string): number {
  const slice = dataUrl.slice(0, 400) + dataUrl.slice(-200);
  return Math.abs(hashCode(slice)) % 100000;
}

/** Candy.ai–leaning mood prompts — photoreal influencer / explicit adult, max heat */
const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty:
    "ultra photoreal beauty portrait, 85mm lens, soft glam lighting, natural skin pores and texture, candid influencer selfie, bright catchlights, candy.ai aesthetic, stunning adult woman 21+, seductive half-smile, sharp unique face identity, high detail, 8k quality",
  seductive:
    "seductive bedroom mirror selfie, heavy-lidded eyes, soft neon + warm lamp, parted glossy lips, intimate atmosphere, photoreal influencer, adult sensual heat",
  lingerie:
    "sexy sheer lingerie mirror selfie, lace bra half off, panties, bedroom, soft rim light, arched back, detailed fabric, candy-style adult, looking at viewer, hot",
  nude:
    "artistic fully nude selfie, beautiful adult body, soft window light, detailed skin pores, tasteful yet explicit, looking at camera, photorealistic, aroused flush",
  explicit:
    "explicit nude selfie, aroused expression, detailed anatomy, glistening skin, intense eye contact, highly detailed erotic photography, uncensored photoreal adult 21+, wet look, high resolution, cinematic lighting",
  sex:
    "explicit intimate sex scene, passionate motion blur, detailed anatomy, realistic skin sweat, intimate POV, erotic cinematography, uncensored photoreal adult, climax energy",
  aftercare:
    "post-sex aftercare portrait, soft sheets, satisfied smile, gentle embrace energy, warm morning light, photoreal intimate, messy hair",
  dual:
    "two beautiful adult women together, intimate dual scene, looking at viewer, detailed bodies touching, erotic composition, photoreal, hot",
  sph:
    "dominant woman looking down at viewer from above, teasing amused smile, pointing, SPH humiliation vibe, lingerie or nude, confident posture, low camera angle, photoreal, sharp unique face",
  bnwo:
    "powerful dominant Black woman in charge, luxury room, lingerie or nude, confident commanding gaze, BNWO fantasy aesthetic, regal posture, photoreal adult, gold accents",
  joi:
    "woman giving JOI to viewer, pointing at camera, seductive instructional pose, lingerie on edge of bed, intense eye contact, explicit adult coaching vibe, photoreal, unique face",
  "joi-finish":
    "woman encouraging climax, open mouth, intense eye contact, nude or open lingerie, finish-now command pose, erotic photography, uncensored, wet lips",
};

function buildPrompt(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
): string {
  const figure =
    character.figure ||
    "beautiful adult woman, photoreal influencer aesthetic, unique face, detailed body";
  return [
    "masterpiece, best quality, ultra detailed, photorealistic, 8k uhd",
    `adult woman ${character.age || 24} years old, 21+ only`,
    figure,
    `${character.name}, same face identity every shot, consistent face and body, unique person`,
    MOOD_PROMPTS[mood],
    extra,
    "looking at viewer, sharp focused eyes, detailed iris, natural proportions, no text, no watermark, no logos, no cartoon, no anime unless style requested",
  ]
    .filter(Boolean)
    .join(", ");
}

function pollinationsUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
  opts?: { seedOverride?: number; width?: number; height?: number },
): string {
  const prompt = buildPrompt(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  const baseFace = opts?.seedOverride ?? faceSeed(character);
  const moodJitter =
    settings?.aggressiveFaceLock !== false
      ? mediaSeed(character.id, mood, extra) % 17
      : mediaSeed(character.id, mood, extra);
  const seed = (baseFace * 97 + moodJitter) % 100000;
  const w = opts?.width ?? 768;
  const h = opts?.height ?? 1152;

  if (settings?.preferLocal && settings.localImageBase) {
    const base = settings.localImageBase.replace(/\/$/, "");
    if (settings.localImageMode === "prompt-url") {
      return `${base}/${encodeURIComponent(prompt)}?seed=${seed}&width=${w}&height=${h}`;
    }
  }

  // enhance=true + flux for sharper Candy-like results
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

export async function resolveBestMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
): Promise<{ url: string; note: string }> {
  const fallbackUrl = characterMediaUrl(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  if (settings?.preferLocal && settings.localImageBase) {
    const prompt = buildPrompt(character, mood, extra);
    const seed = (faceSeed(character) * 97 + (mediaSeed(character.id, mood, extra) % 17)) % 100000;
    const localRes = await generateLocalImage({
      prompt,
      seed,
      width: 768,
      height: 1152,
      characterId: character.id,
    });
    if (localRes.ok && localRes.imageUrl) {
      return { url: localRes.imageUrl, note: localRes.note };
    }
  }
  return { url: fallbackUrl, note: "Pollinations Flux" };
}

export function joiSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "joi", "start instruction, clothed lingerie, pointing"),
    characterMediaUrl(character, "joi", "stroking pace command, leaning forward, JOI"),
    characterMediaUrl(character, "seductive", "almost there, intense eye contact, aroused"),
    characterMediaUrl(character, "joi-finish", "finish now command, open mouth"),
  ];
}

export function sphSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "sph", "first look, amused smile"),
    characterMediaUrl(character, "sph", "pointing down, teasing SPH"),
    characterMediaUrl(character, "explicit", "comparison tease, dominant, nude"),
    characterMediaUrl(character, "sph", "final verdict, laughing softly"),
  ];
}

export function bnwoSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "bnwo", "entering room, powerful walk"),
    characterMediaUrl(character, "bnwo", "standing over viewer, dominant"),
    characterMediaUrl(character, "lingerie", "dominant lingerie, in control"),
    characterMediaUrl(character, "bnwo", "claiming the scene, luxury"),
  ];
}

export function sexSequenceFrames(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
): string[] {
  return [
    characterMediaUrl(character, "lingerie", "starting undress, pulling straps"),
    characterMediaUrl(character, "nude", "aroused, fully nude"),
    characterMediaUrl(character, "explicit", "intense, explicit anatomy"),
    characterMediaUrl(character, "sex", "climax, passionate"),
  ];
}

export function characterGallery(character: Character): {
  mood: MediaMood;
  label: string;
  url: string;
}[] {
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

/** Always prefer live AI portrait over static SVG placeholders */
export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  // /avatars/*.svg → replace with Flux beauty portrait
  return characterMediaUrl(character, "beauty", `${character.name} beauty portrait`);
}
