/** Free Pollinations portraits — every girl gets a real high-quality face. */

export type PortraitMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "seductive";

const MOOD_PROMPTS: Record<PortraitMood, string> = {
  beauty:
    "tasteful beauty portrait, soft cinematic lighting, magazine cover, sharp eyes, detailed skin",
  lingerie:
    "wearing luxurious sheer lingerie, bedroom light, seductive pose, intimate atmosphere, photorealistic",
  nude:
    "fully nude, artistic erotic photography, natural skin, soft shadows, tasteful nsfw, looking at viewer",
  explicit:
    "explicit nude, sexual pose, detailed anatomy, uncensored nsfw, studio lighting, highly detailed",
  seductive:
    "seductive portrait, parted lips, bedroom eyes, soft rim light, intimate close-up, photorealistic",
};

function seedFromId(id: string, salt = 0): number {
  let h = salt >>> 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 800000000) + 120000;
}

export function characterPortraitUrl(
  id: string,
  figure: string,
  mood: PortraitMood | string = "beauty",
): string {
  const moodKey = (mood in MOOD_PROMPTS ? mood : "beauty") as PortraitMood;
  const prompt = [
    "masterpiece, best quality, ultra detailed, photorealistic",
    "beautiful adult woman 25 years old",
    figure,
    MOOD_PROMPTS[moodKey],
    "looking at viewer, sharp eyes, detailed skin pores, natural proportions, 8k uhd",
  ].join(", ");
  const seed = seedFromId(id, moodKey === "beauty" ? 0 : moodKey.length * 97);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

/** Prefer live portrait over SVG placeholders. */
export function resolveAvatar(avatar: string, id: string, figure: string): string {
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  return characterPortraitUrl(id, figure, "seductive");
}
