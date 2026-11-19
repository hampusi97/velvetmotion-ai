/**
 * VelvetMotion Media Engine
 * Candy-style photoreal with proper photography prompts.
 * Face-locked via seed + detailed figure strings.
 */

import type { Character } from "./charactersTypes";
import { getCharacterFaceSeed, getMediaSettings } from "./mediaSettings";
import { generateLocalImage } from "./comfyClient";

/** Cloudflare Workers AI image endpoint */
const CF_IMAGE_WORKER = "https://velvetmotion-image.hampusi97.workers.dev/generate";

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

/** Candy.ai quality prompts — photography language, natural skin, real lighting */
const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty:
    "Shot on Sony A7IV, 85mm f/1.4 lens, soft natural window light from the left creating gentle catchlights in the eyes, shallow depth of field with creamy bokeh. Realistic skin texture with visible pores, subtle freckles, and natural imperfections. Individual hair strands with soft flyaways. Natural makeup, soft genuine smile, looking directly at camera. Kodak Portra 400 color science, warm highlights, clean sharp focus on the eyes.",
  seductive:
    "Intimate bedroom portrait, shot on 50mm f/1.8, warm bedside lamp mixed with soft neon rim light. Heavy-lidded eyes with a knowing half-smile, parted glossy lips, slight head tilt. Soft shadows across collarbones, realistic skin with natural sheen. Shallow depth of field, cinematic color grade, photoreal adult sensual atmosphere.",
  lingerie:
    "Mirror selfie in sheer lace lingerie, shot on iPhone with natural window light. Lace bra slightly off one shoulder, soft fabric texture visible. Arched back, looking over shoulder at camera. Soft rim light outlining the figure, realistic skin pores, bedroom with soft bokeh background. Candid influencer aesthetic, warm tones.",
  nude:
    "Fully nude portrait, soft morning window light from the side. Completely bare adult body, natural skin texture with visible pores and subtle flush. Soft shadows defining form, looking at camera with calm expression. Shot on 85mm, shallow depth of field, unretouched skin, photorealistic, warm natural color.",
  explicit:
    "Explicit nude photography, intense eye contact, aroused expression with flushed cheeks. Detailed natural anatomy, glistening skin with realistic texture. Soft directional lighting, high detail on skin pores and individual hair strands. Shot on medium format, cinematic lighting, uncensored photoreal adult 21+, wet look highlights.",
  sex:
    "Explicit intimate scene, any position, sweaty skin with realistic texture and natural flush. Moaning expression, detailed anatomy, dynamic motion blur on limbs. Cinematic lighting with practical sources, uncensored photoreal adult, intense atmosphere, high detail.",
  aftercare:
    "Post-intimacy portrait, soft morning light through sheer curtains. Satisfied soft smile, messy hair, gentle embrace energy. Warm skin tones, realistic pores, soft sheets in background. Shot on 50mm, natural light, intimate and tender atmosphere.",
  dual:
    "Two beautiful adult women together, intimate dual scene, both looking at viewer. Soft shared lighting, detailed natural skin on both, bodies close. Warm bedroom atmosphere, photoreal, high detail, cinematic composition.",
  sph:
    "Dominant woman looking down at camera from above, low angle. Amused teasing smile, pointing finger, confident posture. Lingerie or nude, sharp unique face with natural skin texture. Soft overhead light, photoreal, sharp focus on eyes.",
  bnwo:
    "Powerful dominant Black woman in luxury setting, confident commanding gaze. Natural skin texture with realistic sheen, gold jewelry catching light. Regal posture, lingerie or nude, warm directional lighting, photoreal adult, high detail.",
  joi:
    "Woman giving JOI to viewer, pointing directly at camera, intense eye contact. Seductive instructional pose on edge of bed, lingerie. Soft bedroom lighting, realistic skin texture, sharp focus on face and hands. Photoreal adult coaching vibe.",
  "joi-finish":
    "Close-up of woman encouraging climax, open mouth, intense eye contact. Nude or open lingerie, finish-now energy. Soft flash lighting, wet lips, realistic skin texture, uncensored photoreal, high detail.",
};

function buildPrompt(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood,
  extra = "",
): string {
  const figure =
    character.figure ||
    "beautiful adult woman with unique distinctive face, natural features, photoreal";
  return [
    figure,
    `adult woman ${character.age || 24} years old, 21+ only`,
    `${character.name}, same face identity every shot, consistent unique person`,
    MOOD_PROMPTS[mood],
    extra,
    "looking at viewer, sharp focused eyes with detailed iris, natural proportions, no text, no watermark, no logos",
  ]
    .filter(Boolean)
    .join(". ");
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
  const w = opts?.width ?? 1280;
  const h = opts?.height ?? 1920;

  if (settings?.preferLocal && settings.localImageBase) {
    const base = settings.localImageBase.replace(/\/$/, "");
    if (settings.localImageMode === "prompt-url") {
      return `${base}/${encodeURIComponent(prompt)}?seed=${seed}&width=${w}&height=${h}`;
    }
  }

  const cf = `${CF_IMAGE_WORKER}?prompt=${encodeURIComponent(prompt.slice(0, 1800))}&seed=${seed}`;
  return cf;
}

const STATIC_PORTRAITS = new Set(["briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper"]);

export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  opts?: { width?: number; height?: number; enhance?: boolean; seedOverride?: number },
): string {
  if (mood === "beauty" && STATIC_PORTRAITS.has(character.id)) {
    return `/portraits/${character.id}.jpg`;
  }
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
  return { url: fallbackUrl, note: "Cloudflare Flux" };
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

export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  return characterMediaUrl(character, "beauty", `${character.name} beauty portrait`);
}

export function freeformImageUrl(
  prompt: string,
  character?: Pick<Character, "id" | "figure" | "name">,
  seedExtra = "",
): string {
  const base = character
    ? `${character.figure || character.name}, same face, photorealistic, adult woman 18+, `
    : "photorealistic adult woman 18+, ";
  const full = `${base}${prompt}. Shot on 85mm, natural light, realistic skin texture with pores, uncensored nsfw, sharp focus on eyes.`;
  const seed = character ? faceSeed(character) + mediaSeed(character.id, "free", seedExtra) : mediaSeed("free", prompt, seedExtra);
  const enc = encodeURIComponent(full);
  return `https://image.pollinations.ai/prompt/${enc}?width=1024&height=1536&nologo=true&model=flux&seed=${seed % 100000}&enhance=true&quality=100&private=true`;
}
