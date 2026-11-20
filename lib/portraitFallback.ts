/**
 * Every companion maps 1-to-1 to a unique existing portrait in /public/portraits/.
 * Zero duplicate portraits across CHARACTERS or FLAGSHIP_COMPANIONS.
 */

export const PORTRAIT_BY_ID: Record<string, string> = {
  // Flagship companions (.webp)
  "chloe-parker": "/portraits/chloe-parker.webp",
  "maya-solis": "/portraits/maya-solis.webp",
  "sloane-kensington": "/portraits/sloane-kensington.webp",
  "raven-vance": "/portraits/raven-vance.webp",
  "sora-takahashi": "/portraits/sora-takahashi.webp",
  "dalia-moreau": "/portraits/dalia-moreau.webp",
  "lena-brooks": "/portraits/lena-brooks.webp",
  "aria-velasco": "/portraits/aria-velasco.webp",
  "nova-park": "/portraits/nova-park.webp",
  "nadine-okoye": "/portraits/nadine-okoye.webp",
  "claire-bennett": "/portraits/claire-bennett.webp",
  "yumi-chen": "/portraits/yumi-chen.webp",
  "imani-reed": "/portraits/imani-reed.webp",
  "renata-costa": "/portraits/renata-costa.webp",
  "celeste-voss": "/portraits/celeste-voss.webp",
  "mara-graves": "/portraits/mara-graves.webp",
  "vesna-nox": "/portraits/vesna-nox.webp",
  "blair-hartwell": "/portraits/blair-hartwell.webp",
  "rowan-mercer": "/portraits/rowan-mercer.webp",
  "jade-aster": "/portraits/jade-aster.webp",
  "morgan-ellis": "/portraits/morgan-ellis.webp",
  "veda-kane": "/portraits/veda-kane.webp",
  "noor-mansour": "/portraits/noor-mansour.webp",
  "juno-aimes": "/portraits/juno-aimes.webp",

  // 36 Distinct Roster Companions (.jpg)
  "nova-g": "/portraits/nova-g.jpg",
  "lexi-s": "/portraits/lexi.jpg",
  "blondie-m": "/portraits/mia.jpg",
  "sloane-v": "/portraits/sloane.jpg",
  "elena-a": "/portraits/elena-a.jpg",
  "riley-n": "/portraits/aria.jpg",
  "jules-b": "/portraits/genevieve.jpg",
  "ava-t": "/portraits/ava.jpg",
  maren: "/portraits/maren.jpg",
  liora: "/portraits/liora.jpg",
  tess: "/portraits/tess.jpg",
  isolde: "/portraits/isolde.jpg",
  briony: "/portraits/briony.jpg",
  calla: "/portraits/calla.jpg",
  nadine: "/portraits/nadine.jpg",
  vesper: "/portraits/vesper.jpg",
  valentina: "/portraits/valentina.jpg",
  "lana-rho": "/portraits/lana.jpg",
  "lena-plug": "/portraits/delilah-v.jpg",
  "dalia-x": "/portraits/lola.jpg",
  "riley-re": "/portraits/chloe.jpg",
  scarlett: "/portraits/scarlett.jpg",
  maya: "/portraits/maren-v.jpg",
  bianca: "/portraits/freya-v.jpg",
  ravenna: "/portraits/scarlett-v.jpg",
  tessa: "/portraits/tessa.jpg",
  nova: "/portraits/nova.jpg",
  raven: "/portraits/raven.jpg",
  priya: "/portraits/priya-v.jpg",
  sienna: "/portraits/sienna.jpg",
  yuki: "/portraits/yuki.jpg",
  freya: "/portraits/freya.jpg",
  elena: "/portraits/elena.jpg",
  "variety-kira": "/portraits/variety-kira.jpg",
  "anime-yumi": "/portraits/suzu-m.jpg",
  "mila-s": "/portraits/mila-s.jpg",
};

const FALLBACK_POOL = Object.values(PORTRAIT_BY_ID);

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function staticPortraitUrl(id: string): string {
  if (PORTRAIT_BY_ID[id]) return PORTRAIT_BY_ID[id];
  const pick = FALLBACK_POOL[hash(id) % FALLBACK_POOL.length];
  return pick || "/portraits/chloe-parker.webp";
}

export function safePortraitUrl(id: string, _generatedUrl?: string): string {
  return staticPortraitUrl(id);
}

export function onPortraitError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.includes("/portraits/")) {
    img.src = "/portraits/chloe-parker.webp";
  }
}
