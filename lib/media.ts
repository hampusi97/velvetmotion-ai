/**
 * VelvetMotion Media Engine
 * Chloe-quality portraits via photography prompts + face locks.
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

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty: "Shot on Sony A7IV, 85mm f/1.4, soft window light from the left. Realistic skin with visible pores and natural freckles. Individual hair strands, soft catchlights in eyes. Natural makeup, soft smile, looking at camera. Kodak Portra warmth, shallow depth of field, sharp focus on eyes.",
  seductive: "Intimate close-up, 50mm f/1.8, warm bedside lamp mixed with soft rim light. Heavy-lidded eyes, parted lips, slight head tilt. Soft shadows, realistic skin sheen, photoreal adult.",
  lingerie: "Mirror selfie, sheer lace, soft window light. Lace slightly off one shoulder, looking over shoulder. Realistic skin pores, soft bokeh, candid influencer aesthetic.",
  nude: "Fully nude, soft morning window light from the side. Natural skin texture with pores, soft shadows defining form, looking at camera. Unretouched, photoreal.",
  explicit: "Explicit nude, intense eye contact, flushed cheeks. Detailed natural anatomy, glistening skin with pores. Soft directional light, high detail, uncensored photoreal adult.",
  sex: "Explicit intimate scene, sweaty skin with realistic texture. Moaning expression, detailed anatomy. Cinematic practical lighting, uncensored photoreal.",
  aftercare: "Post-intimacy, soft morning light through curtains. Soft smile, messy hair, warm skin tones, realistic pores. Intimate, tender.",
  dual: "Two adult women together, soft shared lighting, both looking at viewer. Natural skin on both, warm bedroom atmosphere.",
  sph: "Dominant woman looking down from above, low angle. Amused smile, pointing. Natural skin texture, soft overhead light, sharp eyes.",
  bnwo: "Dominant Black woman, confident gaze, natural skin sheen, gold jewelry. Warm directional light, photoreal adult.",
  joi: "Woman giving JOI, pointing at camera, intense eye contact. Seductive pose, lingerie. Soft bedroom light, realistic skin, sharp face.",
  "joi-finish": "Close-up, open mouth, intense eye contact. Nude or open lingerie. Soft flash, wet lips, realistic skin texture.",
};

function buildPrompt(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = ""): string {
  const figure = character.figure || "beautiful adult woman with unique distinctive face, natural features";
  return [figure, `adult woman ${character.age || 24} years old, 21+`, `${character.name}, same face every shot`, MOOD_PROMPTS[mood], extra, "looking at viewer, sharp focused eyes, natural proportions"].filter(Boolean).join(". ");
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

const STATIC_PORTRAITS = new Set(["briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper"]);

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
  const full = `${base}${prompt}. Shot on 85mm, soft window light, realistic skin pores, sharp eyes.`;
  const seed = character ? faceSeed(character) + mediaSeed(character.id, "free", seedExtra) : mediaSeed("free", prompt, seedExtra);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1024&height=1536&nologo=true&model=flux&seed=${seed % 100000}&enhance=true`;
}
