/**
 * VelvetMotion Media Engine
 * Candy-style photoreal + optional local ComfyUI/Forge base + aggressive face seeds.
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
  return Math.abs(hashCode(character.id + "|face|" + (character.figure || "").slice(0, 80))) % 100000;
}

export function seedFromPhotoDataUrl(dataUrl: string): number {
  const slice = dataUrl.slice(0, 400) + dataUrl.slice(-200);
  return Math.abs(hashCode(slice)) % 100000;
}

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty:
    "instagram influencer portrait, soft glam makeup, natural skin texture, candid selfie vibe, shallow depth of field, photorealistic, candy.ai style beauty",
  seductive:
    "seductive mirror selfie, bedroom eyes, soft neon or golden hour, alluring expression, intimate atmosphere, photoreal",
  lingerie:
    "sexy lingerie mirror selfie, lace bra and panties, bedroom, soft lighting, sensual pose, detailed fabric, photoreal influencer aesthetic",
  nude:
    "artistic nude selfie, beautiful naked body, soft natural lighting, detailed skin pores, looking at viewer, photorealistic",
  explicit:
    "explicit nude selfie, aroused, detailed anatomy, wet skin, intense eye contact, highly detailed erotic photography, photoreal",
  sex:
    "explicit sex scene, passionate, detailed anatomy, realistic skin texture, intimate POV energy, erotic photography",
  aftercare:
    "post-sex aftercare, soft lighting, intimate embrace, satisfied expression, gentle atmosphere, photoreal",
  dual:
    "two beautiful women together, intimate dual scene, looking at viewer, detailed bodies, erotic composition, photoreal",
  sph:
    "dominant woman looking down at viewer, teasing smile, pointing, SPH vibe, lingerie, confident posture, camera looking up, photoreal",
  bnwo:
    "dominant black woman in charge, powerful pose, lingerie, BNWO fantasy aesthetic, confident gaze, luxurious setting, photoreal",
  joi:
    "woman giving JOI, pointing at viewer, seductive expression, lingerie, edge of bed, instructional pose, eye contact, photoreal",
  "joi-finish":
    "woman encouraging climax, open mouth, intense eye contact, nude or lingerie, finish command pose, erotic photography",
};

function buildPrompt(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
): string {
  const figure = character.figure || "beautiful adult woman, photoreal influencer aesthetic";
  return [
    "masterpiece, best quality, ultra detailed, photorealistic, 8k",
    `adult woman ${character.age || 24} years old`,
    figure,
    `${character.name} face identity, consistent face and body across shots, same person`,
    MOOD_PROMPTS[mood],
    extra,
    "looking at viewer, sharp eyes, detailed skin, natural proportions, no text, no watermark, no logos",
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
  // Aggressive lock: mood offset tiny so face stays dominant
  const moodJitter =
    settings?.aggressiveFaceLock !== false ? mediaSeed(character.id, mood, extra) % 17 : mediaSeed(character.id, mood, extra);
  const seed = (baseFace * 97 + moodJitter) % 100000;
  const w = opts?.width ?? 768;
  const h = opts?.height ?? 1152;

  if (settings?.preferLocal && settings.localImageBase) {
    const base = settings.localImageBase.replace(/\/$/, "");
    if (settings.localImageMode === "prompt-url") {
      return `${base}/${encodeURIComponent(prompt)}?seed=${seed}&width=${w}&height=${h}`;
    }
    // forge/comfy: still return pollinations for browser-safe GET; local APIs need POST proxy
    // Documented in Advanced UI — true Comfy needs a small local proxy.
  }

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

/**
 * Resolve media URL preferring local ComfyUI / Forge (+ IP-Adapter face lock)
 * when configured in Advanced settings, with automatic fallback to Pollinations Flux.
 */
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
