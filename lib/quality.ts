/**
 * Quality presets aimed at Candy.ai-level photoreal portraits.
 * Free backends still have limits; these prompts maximize what they can do.
 */

export const QUALITY_PROMPT = [
  "Photoreal close-up and three-quarter body, shot on Sony A7R V, 85mm f/1.4 GM",
  "soft natural window light or golden hour, subtle fill, no harsh flash",
  "realistic skin with visible pores, peach fuzz, subtle freckles or moles, no plastic, no oversmoothing, no doll look",
  "individual hair strands, flyaways, soft catchlights in eyes, razor sharp focus on eyes",
  "Kodak Portra 400 or Cinestill warmth, shallow depth of field, authentic body proportions",
  "editorial influencer quality, looking at camera or natural candid, high detail skin texture",
  "unretouched, 21+, adult, natural makeup or no makeup, real lighting",
].join(", ");

export const NEGATIVE_QUALITY = [
  "plastic skin, oversmoothed, airbrushed, doll, CGI, 3d render, unreal engine",
  "blurry, lowres, deformed, bad anatomy, extra limbs, fused fingers, watermark, text, logo",
  "cartoon, anime, illustration, painting, drawing, concept art",
  "overexposed, underexposed, harsh shadows, ring light glare",
].join(", ");

export const IMAGE_STEPS = 30;
export const IMAGE_CFG = 7.5;
export const IMAGE_WIDTH = 832;
export const IMAGE_HEIGHT = 1216;

export const VIDEO_STEPS = 25;
export const VIDEO_DURATION = 5;

export function qualityPrompt(base: string, extra = ""): string {
  return [base, QUALITY_PROMPT, extra].filter(Boolean).join(". ");
}
