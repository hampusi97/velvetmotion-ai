/**
 * VelvetMotion Media Engine
 * Beauty/seductive → Cloudflare Flux worker.
 * NSFW moods → AI Horde (free, nsfw:true) with Pollinations fallback.
 * Quality presets applied to all paths.
 */

import type { Character } from "./charactersTypes";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { getCharacterFaceSeed, getMediaSettings } from "./mediaSettings";
import { generateLocalImage } from "./comfyClient";
import { generateHordeImage } from "./aiHorde";
import { fetchWorkerImage } from "./imageWorker";
import { remoteImageToStableDataUrl } from "./imageStore";
import { checkContentSafety } from "./safety";
import { reportGenerationSpeed } from "./localEngineBridge";
import { QUALITY_PROMPT, IMAGE_STEPS, IMAGE_WIDTH, IMAGE_HEIGHT } from "./quality";

const CF_IMAGE_WORKER =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_IMAGE_WORKER_URL) ||
  "https://velvetmotion-image.hampusi97.workers.dev/generate";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export type MediaMood = "beauty" | "lingerie" | "nude" | "explicit" | "sex" | "seductive" | "aftercare" | "dual" | "sph" | "bnwo" | "joi" | "joi-finish";

const NSFW_MOODS = new Set<MediaMood>(["nude", "explicit", "sex", "joi", "joi-finish", "sph", "bnwo", "dual"]);

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

const PHOTO_BASE = QUALITY_PROMPT;

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty: PHOTO_BASE + " Natural makeup, soft ambient indoor light, influencer editorial close-up, intimate and warm.",
  seductive: PHOTO_BASE + " Intimate close-up, warm bedside lamp + soft rim light. Heavy-lidded eyes, parted glossy lips, slight head tilt, flushed cheeks. Soft shadows, realistic skin sheen with pores.",
  lingerie: PHOTO_BASE + " Mirror selfie, sheer lace lingerie slightly off shoulder, soft side window light. Looking over shoulder, natural skin texture, soft bokeh background, candid influencer aesthetic, authentic body.",
  nude: PHOTO_BASE + " Fully nude adult woman, soft morning window light from the side. Natural skin texture with pores. Soft shadows defining form, looking at camera with soft expression. Unretouched photoreal adult, editorial nude, 21+.",
  explicit: PHOTO_BASE + " Explicit nude adult woman, intense eye contact, flushed cheeks, slightly parted lips. Detailed natural anatomy, glistening skin with visible pores. Soft directional key light, high detail, uncensored photoreal adult, 21+.",
  sex: PHOTO_BASE + " Explicit intimate adult scene, sweaty realistic skin texture with pores, pleasure expression, detailed anatomy. Cinematic practical lighting, uncensored photoreal, natural proportions, 21+.",
  aftercare: PHOTO_BASE + " Post-intimacy, soft morning light through sheer curtains. Soft smile, messy hair, warm skin tones, realistic pores and glow. Intimate, tender, photoreal, gentle.",
  dual: PHOTO_BASE + " Two adult women together, soft shared warm lighting, both looking at viewer. Natural skin texture on both, warm bedroom atmosphere, photoreal, intimate, 21+.",
  sph: PHOTO_BASE + " Dominant adult woman looking down from above, low angle. Amused or commanding smile, pointing or gesturing. Natural skin texture, soft overhead light, sharp eyes, 21+.",
  bnwo: PHOTO_BASE + " Dominant Black adult woman, confident direct gaze, natural skin sheen with pores, gold jewelry. Warm directional light, photoreal adult, powerful presence, 21+.",
  joi: PHOTO_BASE + " Adult woman giving JOI, pointing at camera, intense eye contact. Seductive pose in lingerie or nude. Soft bedroom light, realistic skin, sharp face, 21+.",
  "joi-finish": PHOTO_BASE + " Close-up face and upper body, open mouth, intense eye contact. Nude or open lingerie. Soft flash or warm light, wet lips, realistic skin texture, 21+.",
};

function buildPrompt(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = ""): string {
  const figure = character.figure || "beautiful adult woman with unique distinctive face, natural features, photoreal";
  return [figure, `adult woman ${character.age || 24} years old, 21+`, `${character.name}, same face every shot, consistent identity lock, unique facial features, distinctive look`, MOOD_PROMPTS[mood], extra, "looking at viewer, sharp focused eyes, natural proportions, high detail skin texture with pores, photoreal, no plastic skin, no AI artifacts"].filter(Boolean).join(". ");
}

function workerUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = "", opts?: { seedOverride?: number }): string {
  const prompt = buildPrompt(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  const baseFace = opts?.seedOverride ?? faceSeed(character);
  const moodJitter = settings?.aggressiveFaceLock !== false ? mediaSeed(character.id, mood, extra) % 17 : mediaSeed(character.id, mood, extra);
  const seed = (baseFace * 97 + moodJitter) % 100000;
  if (settings?.preferLocal && settings.localImageBase) {
    const base = settings.localImageBase.replace(/\/$/, "");
    if (settings.localImageMode === "prompt-url") return `${base}/${encodeURIComponent(prompt)}?seed=${seed}`;
  }
  return `${CF_IMAGE_WORKER}?prompt=${encodeURIComponent(prompt.slice(0, 1800))}&steps=8`;
}

function pollinationsUncensoredUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood, extra = "", opts?: { seedOverride?: number }): string {
  const prompt = buildPrompt(character, mood, extra);
  const baseFace = opts?.seedOverride ?? faceSeed(character);
  const seed = (baseFace * 97 + mediaSeed(character.id, mood, extra)) % 100000;
  const key = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_POLLINATIONS_KEY) || "";
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt.slice(0, 1200))}?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true&model=flux&seed=${seed}&enhance=true${keyParam}`;
}

const STATIC_PORTRAITS = new Set(["briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper","livia-n","dalia-r","lisa-k","suzu-m","delilah-v","mila-s","diana-m","nova-p","valentina","lana-rho","lena-plug","dalia-x","riley-re"]);

export function characterMediaUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, _mood: MediaMood = "beauty", _extra = "", _opts?: { seedOverride?: number; preferStatic?: boolean }): string {
  // Use the same portrait fallback as Explore cards for consistency
  return staticPortraitUrl(character.id || "chloe");
}

export async function resolveBestMediaUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, mood: MediaMood = "beauty", extra = ""): Promise<{ url: string; note: string }> {
  const safety = checkContentSafety(`${character.name} ${character.figure || ""} ${extra}`);
  if (!safety.allowed) {
    return { url: staticPortraitUrl(character.id || "chloe"), note: safety.reason || "Blocked by safety policy" };
  }

  const prompt = buildPrompt(character, mood, extra);
  const seed = (faceSeed(character) * 97 + (mediaSeed(character.id, mood, extra) % 17)) % 100000;
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;

  const t0 = Date.now();
  const reportImg = (engine: string) => {
    const sec = Number(Math.max(0.2, (Date.now() - t0) / 1000).toFixed(1));
    reportGenerationSpeed({ imgSec: sec, lastEngine: engine });
  };

  if (settings?.preferLocal && settings.localImageBase) {
    const localRes = await generateLocalImage({ prompt, seed, width: IMAGE_WIDTH, height: IMAGE_HEIGHT, characterId: character.id });
    if (localRes.ok && localRes.imageUrl) {
      reportImg("local-gpu");
      return { url: localRes.imageUrl, note: localRes.note };
    }
  }

  if (typeof window !== "undefined") {
    const isNsfw = NSFW_MOODS.has(mood);

    if (!isNsfw) {
      const worker = await fetchWorkerImage(prompt, { steps: 6, seed });
      if (worker.ok) {
        reportImg("cf-flux");
        return { url: worker.url, note: "Cloudflare Flux" };
      }
    }

    try {
      const horde = await generateHordeImage({
        prompt,
        seed,
        nsfw: isNsfw,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        steps: IMAGE_STEPS,
      });
      try {
        const stableUrl = await remoteImageToStableDataUrl(horde.url);
        reportImg("ai-horde");
        return { url: stableUrl, note: horde.note };
      } catch {
        reportImg("ai-horde");
        return horde;
      }
    } catch {
      return { url: staticPortraitUrl(character.id || "chloe"), note: "Local portrait fallback" };
    }
  }

  return { url: characterMediaUrl(character, mood, extra), note: "Local portrait" };
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

export function freeformImageUrl(_prompt: string, character?: Pick<Character, "id" | "figure" | "name">, _seedExtra = ""): string {
  // No Pollinations. Return a local portrait.
  const id = character?.id || "chloe";
  const known = ["chloe","elena","aria","sienna","raven","yuki","scarlett","mia","genevieve","briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper"];
  if (known.includes(id)) return `/portraits/${id}.jpg`;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `/portraits/${known[Math.abs(h) % known.length]}.jpg`;
}
