/**
 * VelvetMotion Media Engine
 * AAA Candy.ai-level portraits via photography prompts + face locks.
 */

import type { Character } from "./charactersTypes";
import { getCharacterFaceSeed, getMediaSettings } from "./mediaSettings";
import { generateLocalImage } from "./comfyClient";

const CF_IMAGE_WORKER = "https://velvetmotion-image.hampusi97.workers.dev/generate";

export type MediaMood = "beauty" | "lingerie" | "nude" | "explicit" | "sex" | "seductive" | "aftercare" | "dual" | "sph" | "bnwo" | "joi" | "joi-finish";

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

const PHOTO_BASE = "Shot on Sony A7R V, 85mm f/1.4 GM lens, soft natural window light, subtle fill. Realistic skin with visible pores, fine peach fuzz, natural freckles or subtle imperfections. Individual hair strands with flyaways, soft catchlights in eyes. Kodak Portra 400 warmth, shallow depth of field, razor sharp eyes, photoreal editorial quality, no plastic skin, no oversmoothing, no AI artifacts.";

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty: PHOTO_BASE + " Natural makeup, gentle closed-mouth smile, looking at camera. Soft ambient light, influencer editorial portrait.",
  seductive: PHOTO_BASE + " Intimate close-up, 50mm f/1.4, warm bedside lamp + soft rim light. Heavy-lidded eyes, parted glossy lips, slight head tilt, flushed cheeks. Soft shadows, realistic skin sheen with pores.",
  lingerie: PHOTO_BASE + " Mirror selfie, sheer lace lingerie slightly off shoulder, soft side window light. Looking over shoulder, natural skin texture, soft bokeh background, candid influencer aesthetic, authentic body.",
  nude: PHOTO_BASE + " Fully nude, soft morning window light from the side. Natural skin texture with pores and subtle stretch marks or freckles if fitting. Soft shadows defining form, looking at camera with soft expression. Unretouched photoreal adult, editorial nude.",
  explicit: PHOTO_BASE + " Explicit nude, intense eye contact, flushed cheeks, slightly parted lips. Detailed natural anatomy, glistening skin with visible pores and fine texture. Soft directional key light, high detail, uncensored photoreal adult.",
  sex: PHOTO_BASE + " Explicit intimate scene, sweaty realistic skin texture with pores, moaning or pleasure expression, detailed anatomy. Cinematic practical lighting, uncensored photoreal, natural proportions.",
  aftercare: PHOTO_BASE + " Post-intimacy, soft morning light through sheer curtains. Soft smile, messy hair, warm skin tones, realistic pores and glow. Intimate, tender, photoreal, gentle.",
  dual: PHOTO_BASE + " Two adult women together, soft shared warm lighting, both looking at viewer. Natural skin texture on both, warm bedroom atmosphere, photoreal, intimate.",
  sph: PHOTO_BASE + " Dominant woman looking down from above, low angle. Amused or commanding smile, pointing or gesturing. Natural skin texture, soft overhead light, sharp eyes.",
  bnwo: PHOTO_BASE + " Dominant Black woman, confident direct gaze, natural skin sheen with pores, gold jewelry. Warm directional light, photoreal adult, powerful presence.",
  joi: PHOTO_BASE + " Woman giving JOI, pointing at camera, intense eye contact. Seductive pose in lingerie or nude. Soft bedroom light, realistic skin, sharp face.",
  "joi-finish": PHOTO_BASE + " Close-up face and upper body, open mouth, intense eye contact. Nude or open lingerie. Soft flash or warm light, wet lips, realistic skin texture.",
};

function buildPrompt(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = ""): string {
  const figure = character.figure || "beautiful adult woman with unique distinctive face, natural features, photoreal";
  return [figure, `adult woman ${character.age || 24} years old, 21+`, `${character.name}, same face every shot, consistent identity lock, unique facial features, distinctive look`, MOOD_PROMPTS[mood], extra, "looking at viewer, sharp focused eyes, natural proportions, high detail skin texture with pores, photoreal, no plastic skin, no AI artifacts"].filter(Boolean).join(". ");
}

function pollinationsUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = "", opts?: { seedOverride?: number }): string {
  const prompt = buildPrompt(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  const baseFace = opts?.seedOverride ?? faceSeed(character);
  const moodJitter = settings?.aggressiveFaceLock !== false ? mediaSeed(character.id, mood, extra) % 17 : mediaSeed(character.id, mood, extra);
  const seed = (baseFace * 97 + moodJitter) % 100000;
  if (settings?.preferLocal && settings.localImageBase) {
    const base = settings.localImageBase.replace(/\/$/, "");
    if (settings.localImageMode === "prompt-url") return `${base}/${encodeURIComponent(prompt)}?seed=${seed}`;
  }
  return `${CF_IMAGE_WORKER}?prompt=${encodeURIComponent(prompt.slice(0, 1800))}&seed=${seed}`;
}

const STATIC_PORTRAITS = new Set(["briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper","livia-n","dalia-r","lisa-k","suzu-m","delilah-v","mila-s","diana-m","nova-p","valentina","lana-rho","lena-plug","dalia-x","riley-re"]);

export function characterMediaUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood = "beauty", extra = "", opts?: { seedOverride?: number }): string {
  if (mood === "beauty" && STATIC_PORTRAITS.has(character.id)) return `/portraits/${character.id}.jpg`;
  return pollinationsUrl(character, mood, extra, opts);
}

export async function resolveBestMediaUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood = "beauty", extra = ""): Promise<{ url: string; note: string }> {
  const fallbackUrl = characterMediaUrl(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  if (settings?.preferLocal && settings.localImageBase) {
    const prompt = buildPrompt(character, mood, extra);
    const seed = (faceSeed(character) * 97 + (mediaSeed(character.id, mood, extra) % 17)) % 100000;
    const localRes = await generateLocalImage({ prompt, seed, width: 768, height: 1152, characterId: character.id });
    if (localRes.ok && localRes.imageUrl) return { url: localRes.imageUrl, note: localRes.note };
  }
  return { url: fallbackUrl, note: "Cloudflare Flux" };
}

export function joiSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "joi", "start"), characterMediaUrl(c, "joi", "pace"), characterMediaUrl(c, "seductive", "almost"), characterMediaUrl(c, "joi-finish", "finish")];
}
export function sphSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "sph", "look"), characterMediaUrl(c, "sph", "point"), characterMediaUrl(c, "explicit", "tease"), characterMediaUrl(c, "sph", "verdict")];
}
export function bnwoSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "bnwo", "enter"), characterMediaUrl(c, "bnwo", "stand"), characterMediaUrl(c, "lingerie", "control"), characterMediaUrl(c, "bnwo", "claim")];
}
export function sexSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "lingerie", "start"), characterMediaUrl(c, "nude", "aroused"), characterMediaUrl(c, "explicit", "intense"), characterMediaUrl(c, "sex", "climax")];
}

export function characterGallery(character: Character) {
  const moods: { mood: MediaMood; label: string }[] = [
    { mood: "beauty", label: "Beauty" }, { mood: "seductive", label: "Seductive" }, { mood: "lingerie", label: "Lingerie" },
    { mood: "nude", label: "Nude" }, { mood: "explicit", label: "Explicit" }, { mood: "sex", label: "Sex" },
    { mood: "joi", label: "JOI" }, { mood: "sph", label: "SPH" }, { mood: "bnwo", label: "BNWO" }, { mood: "aftercare", label: "Aftercare" },
  ];
  return moods.map(({ mood, label }) => ({ mood, label, url: characterMediaUrl(character, mood) }));
}

export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) return character.avatar;
  return characterMediaUrl(character, "beauty");
}

export function freeformImageUrl(prompt: string, character?: Pick<Character, "id" | "figure" | "name">, seedExtra = ""): string {
  const base = character ? `${character.figure || character.name}, same face, ` : "";
  const full = `${base}${prompt}. ${PHOTO_BASE}`;
  const seed = character ? faceSeed(character) + mediaSeed(character.id, "free", seedExtra) : mediaSeed("free", prompt, seedExtra);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1024&height=1536&nologo=true&model=flux&seed=${seed % 100000}&enhance=true`;
}
