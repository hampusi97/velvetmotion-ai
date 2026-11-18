/**
 * VelvetMotion Media Engine
 * Every girl gets unique Pollinations Flux images driven by her figure description + id seed.
 * No shared studio JPGs — each companion is visually distinct.
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

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function mediaSeed(id: string, mood: string, extra = ""): number {
  return Math.abs(hashCode(id + ":" + mood + ":" + extra)) % 100000;
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
  const seed = mediaSeed(character.id, moodKey, extra || figure.slice(0, 40));
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

/**
 * Always use Pollinations so every girl has a unique face and body matching her figure description.
 * SVG fallback only when offline or for pure placeholders.
 */
export function characterMediaUrl(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  mood: MediaMood = "beauty",
  extra = "",
  _opts?: { width?: number; height?: number; enhance?: boolean },
): string {
  void _opts;
  // Prefer unique generated images for all moods and all characters
  return pollinationsUrl(character, mood, extra);
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
