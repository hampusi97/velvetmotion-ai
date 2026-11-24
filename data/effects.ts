export type EffectCategory = "undress" | "swap" | "style" | "enhance" | "scene";

export interface Effect {
  slug: string;
  label: string;
  title: string;
  description: string;
  category: EffectCategory;
  prompt: string;
  keepFace: boolean;
  nsfw: boolean;
  featured?: boolean;
}

export const EFFECTS: Effect[] = [
  {
    slug: "nudify",
    label: "Nudify",
    title: "Nudify AI — Undress a Photo in Seconds",
    description: "Upload a photo and remove the clothes. Keeps the face, pose and lighting.",
    category: "undress",
    prompt: "remove all clothing, full nudity, same pose, same lighting, same background, photorealistic",
    keepFace: true,
    nsfw: true,
    featured: true,
  },
  {
    slug: "topless",
    label: "Topless",
    title: "Topless AI — Remove the Top Only",
    description: "Take the top off a photo and leave everything else alone. Same pose, same light.",
    category: "undress",
    prompt: "remove the top, bare chest and shoulders, same pose, same lighting, photorealistic",
    keepFace: true,
    nsfw: true,
    featured: true,
  },
  {
    slug: "lingerie",
    label: "Lingerie",
    title: "AI Lingerie Swap",
    description: "Replace clothing with black lace lingerie. Face and pose preserved.",
    category: "undress",
    prompt: "replace clothing with black lace lingerie, same pose, same lighting, photorealistic",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "bikini",
    label: "Bikini",
    title: "AI Bikini Swap",
    description: "Swap clothes for a bikini. Face and pose stay the same.",
    category: "style",
    prompt: "replace clothing with a bikini, same pose, same lighting, photorealistic",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "boudoir",
    label: "Boudoir",
    title: "Boudoir Style",
    description: "Turn a photo into intimate boudoir lighting and pose.",
    category: "scene",
    prompt: "intimate boudoir, silk sheets, candlelight, photorealistic",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "shower",
    label: "Shower",
    title: "Shower Scene",
    description: "Place the subject in a steamy shower scene.",
    category: "scene",
    prompt: "in the shower, wet skin, steam, nude, photorealistic",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "cowgirl",
    label: "Cowgirl",
    title: "Cowgirl Pose",
    description: "Generate a cowgirl pose from the uploaded photo.",
    category: "scene",
    prompt: "cowgirl sex pose, bedroom, photorealistic adult",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "doggy",
    label: "Doggy",
    title: "Doggy Pose",
    description: "Generate a doggy style pose from the uploaded photo.",
    category: "scene",
    prompt: "doggy style pose, bedroom, photorealistic adult",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "joi",
    label: "JOI",
    title: "JOI Expression",
    description: "Looking-at-camera JOI expression from the photo.",
    category: "scene",
    prompt: "looking at camera, dirty talk expression, bedroom, photorealistic adult",
    keepFace: true,
    nsfw: true,
  },
  {
    slug: "enhance",
    label: "Enhance",
    title: "Enhance Portrait",
    description: "Improve lighting and detail while keeping the face.",
    category: "enhance",
    prompt: "enhanced lighting, sharper detail, natural skin, photorealistic",
    keepFace: true,
    nsfw: false,
  },
];

export function getEffect(slug: string): Effect | undefined {
  return EFFECTS.find((e) => e.slug === slug);
}
