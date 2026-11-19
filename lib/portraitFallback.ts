/**
 * Portrait fallback so home cards never show a broken image.
 * Prefer /public/portraits when available; otherwise a known-good static.
 */

const STATIC_IDS = new Set([
  "briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper",
  "livia-n","dalia-r","lisa-k","suzu-m","delilah-v","mila-s","diana-m","nova-p",
  "valentina","lana-rho","lena-plug","dalia-x","riley-re",
]);

const FALLBACK = "/portraits/briony.jpg";

export function staticPortraitUrl(id: string): string | null {
  if (STATIC_IDS.has(id)) return `/portraits/${id}.jpg`;
  return null;
}

export function safePortraitUrl(id: string, generatedUrl: string): string {
  return staticPortraitUrl(id) || generatedUrl;
}

export function onPortraitError(e: React.SyntheticEvent<HTMLImageElement>, fallbackId?: string) {
  const img = e.currentTarget;
  if (fallbackId) {
    const s = staticPortraitUrl(fallbackId);
    if (s && !img.src.endsWith(s)) {
      img.src = s;
      return;
    }
  }
  if (!img.src.endsWith(FALLBACK)) img.src = FALLBACK;
}
