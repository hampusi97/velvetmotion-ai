/**
 * Every character gets a real static portrait.
 * Prefer high-quality Vercel faces when available; fall back to the original 10.
 */

const HQ = [
  "chloe", "elena", "aria", "sienna", "raven", "yuki", "scarlett", "mia", "genevieve",
  "nova-g", "suzu-m", "mila-s", "elena-a", "delilah-v", "briony", "nadine", "lexi", "ava", "sloane", "lana", "tessa", "valentina", "lola", "maren-v",
];

const POOL = [
  ...HQ,
  "briony", "calla", "freya", "isolde", "liora",
  "maren", "nadine", "nova", "tess", "vesper",
];

const OWN: Record<string, string> = {
  chloe: "chloe", elena: "elena", aria: "aria", sienna: "sienna",
  raven: "raven", yuki: "yuki", scarlett: "scarlett", mia: "mia", genevieve: "genevieve",
  briony: "briony", calla: "calla", freya: "freya", isolde: "isolde",
  liora: "liora", maren: "maren", nadine: "nadine", nova: "nova",
  tess: "tess", vesper: "vesper",
  "nova-g": "nova-g", "suzu-m": "suzu-m", "mila-s": "mila-s", "elena-a": "elena-a", "delilah-v": "delilah-v", "lexi": "lexi", "ava": "ava", "sloane": "sloane", "lana": "lana", "tessa": "tessa", "valentina": "valentina", "lola": "lola", "maren-v": "maren-v",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function staticPortraitUrl(id: string): string {
  const own = OWN[id];
  if (own) return `/portraits/${own}.jpg`;
  // Prefer HQ faces for unknown IDs
  const pick = HQ[hash(id) % HQ.length];
  return `/portraits/${pick}.jpg`;
}

export function safePortraitUrl(id: string, _generatedUrl?: string): string {
  return staticPortraitUrl(id);
}

export function onPortraitError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.includes("/portraits/")) {
    img.src = "/portraits/chloe.jpg";
  }
}
