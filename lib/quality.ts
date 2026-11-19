/**
 * Quality presets for free cloud and local GPU generation.
 * Photography-grade prompts + higher steps where free backends allow.
 */

export const QUALITY_PROMPT = [
  "Tight close-up portrait, shot on Sony A7R V, 85mm f/1.4 GM lens",
  "soft natural window light from the left, subtle fill",
  "realistic skin with visible pores, fine peach fuzz, natural freckles or subtle imperfections, no plastic skin, no oversmoothing",
  "individual hair strands with flyaways, soft catchlights in eyes",
  "Kodak Portra 400 warmth, shallow depth of field, razor sharp eyes",
  "photoreal editorial quality, looking directly at camera, gentle natural smile",
  "high detail skin texture, authentic body, unretouched",
].join(", ");

export const NEGATIVE_QUALITY = [
  "plastic skin, oversmoothed, airbrushed, doll, CGI, 3d render",
  "blurry, lowres, deformed, bad anatomy, extra limbs, watermark, text, logo",
  "cartoon, anime, illustration, painting",
].join(", ");

export const IMAGE_STEPS = 30;
export const IMAGE_CFG = 7;
export const IMAGE_WIDTH = 768;
export const IMAGE_HEIGHT = 1152;

export const VIDEO_STEPS = 25;
export const VIDEO_DURATION = 5;

export function qualityPrompt(base: string, extra = ""): string {
  return [base, QUALITY_PROMPT, extra].filter(Boolean).join(". ");
}
