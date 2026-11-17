/** Pollinations portrait URLs so every girl has a real picture. */

export function characterPortraitUrl(id: string, figure: string, mood = "beauty portrait soft light"): string {
  const prompt = [
    "masterpiece, best quality, photorealistic",
    "beautiful adult woman 25 years old",
    figure,
    mood,
    "looking at viewer, sharp eyes, detailed skin, magazine quality, 8k",
  ].join(", ");
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const seed = (h % 800000000) + 120000;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}
