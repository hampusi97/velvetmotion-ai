/**
 * VelvetMotion Media Engine
 * Consistent, high-quality NSFW image generation for every companion.
 * Uses Pollinations with character-specific seeds so faces stay stable
 * across beauty / lingerie / nude / explicit / sex moods.
 * Zero binary files required — everything is on-demand + cacheable.
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
  | "dual";

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty:
    "tasteful beauty portrait, soft cinematic lighting, sharp eyes, detailed skin texture, looking at viewer, magazine quality, seductive expression, elegant, photorealistic",
  lingerie:
    "wearing luxurious sheer black lingerie, bedroom ambient light, seductive pose, arched back, detailed lace and fabric, intimate atmosphere, photorealistic, 8k",
  nude:
    "fully nude, artistic erotic fine-art photography, natural skin detail, soft shadows, looking at viewer, beautiful body, photorealistic, intimate, tasteful yet explicit",
  explicit:
    "intimate boudoir photography, dramatic neon rim light, high contrast, aroused expression, fully nude, explicit pose, detailed anatomy, photorealistic, erotic",
  sex:
    "cinematic still from adult film, dramatic rim light, shallow depth of field, film grain, 35mm, explicit sexual pose, aroused, photorealistic, intense",
  seductive:
    "seductive half-lidded eyes, soft bedroom lighting, slight smile, intimate close-up, detailed skin, photorealistic",
  aftercare:
    "soft afterglow lighting, warm skin, gentle smile, relaxed intimate pose, cozy sheets, photorealistic, tender",
  dual:
    "two beautiful adult women together, intimate dual scene, close, erotic, photorealistic",
};

/** Deterministic seed from character id + mood so the same girl always looks the same */
export function mediaSeed(characterId: string, mood: MediaMood | string = "beauty"): number {
  let h = 2166136261;
  const str = `${characterId}:${mood}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 999999;
}

function encodePrompt(prompt: string): string {
  return encodeURIComponent(prompt).replace(/%20/g, "%20");
}

/**
 * Build a Pollinations image URL for a character + mood.
 * Fixed seed = consistent face/body across reloads.
 */
export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  opts?: { width?: number; height?: number; enhance?: boolean },
): string {
  const width = opts?.width ?? 768;
  const height = opts?.height ?? 1152;
  const seed = mediaSeed(character.id, mood);
  const style = MOOD_PROMPTS[mood] || MOOD_PROMPTS.beauty;

  const prompt = [
    "masterpiece, best quality, ultra detailed, photorealistic",
    `beautiful adult woman ${character.age || 25} years old`,
    character.figure || "beautiful adult woman",
    `${character.name} aesthetic, consistent face and body`,
    style,
    extra,
    "realistic skin pores, natural proportions, 8k uhd, no text, no watermark",
  ]
    .filter(Boolean)
    .join(", ");

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: "true",
    private: "true",
  });

  if (opts?.enhance !== false) {
    params.set("enhance", "true");
  }

  return `https://image.pollinations.ai/prompt/${encodePrompt(prompt)}?${params.toString()}`;
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

/** Better default avatar resolver — prefers live media over plain SVG */
export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) {
    return character.avatar;
  }
  // Prefer a beautiful portrait from the media engine
  return characterMediaUrl(character, "beauty", "portrait, looking at viewer");
}
