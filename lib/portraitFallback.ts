/**
 * Every character gets a real static portrait.
 * Girls without their own file cycle through the 10 that exist.
 */

const POOL = [
  "briony", "calla", "freya", "isolde", "liora",
  "maren", "nadine", "nova", "tess", "vesper",
];

const OWN: Record<string, string> = {
  briony: "briony", calla: "calla", freya: "freya", isolde: "isolde",
  liora: "liora", maren: "maren", nadine: "nadine", nova: "nova",
  tess: "tess", vesper: "vesper",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function staticPortraitUrl(id: string): string {
  const own = OWN[id];
  if (own) return `/portraits/${own}.jpg`;
  const pick = POOL[hash(id) % POOL.length];
  return `/portraits/${pick}.jpg`;
}

export function safePortraitUrl(id: string, _generatedUrl?: string): string {
  return staticPortraitUrl(id);
}

export function onPortraitError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.includes("/portraits/")) {
    img.src = "/portraits/briony.jpg";
  }
}
