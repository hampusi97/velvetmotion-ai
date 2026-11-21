import { FACE_SEEDS } from "./faceSeeds";

/** Short-id aliases so a profile id with a surname still finds its seed. */
const ALIASES: Record<string, string> = {
  "yuki-sato": "yuki",
  "camille-laurent": "camille",
  "valeria-cruz": "valentina",
  "daisy-miller": "delilah-v",
  "claire-beaumont": "claire-bennett",
  "sloane-kensington": "sloane",
  "chloe-parker": "riley-re",
  "maya-solis": "lola",
  "raven-vance": "ravenna",
  "sora-takahashi": "suzu-m",
  "dalia-moreau": "dalia-x",
  "lena-brooks": "lena-plug",
  "aria-velasco": "sofia",
  "nova-park": "nova-p",
  "nadine-okoye": "nadine",
  "yumi-chen": "anime-yumi",
};

/** FNV-1a. Stable across sessions, platforms and reloads. */
export function seedFromId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 2147483000) + 1;
}

export function identityFragment(companionId?: string): string {
  if (!companionId) return "";
  const key = FACE_SEEDS[companionId] ? companionId : ALIASES[companionId];
  const seed = key ? FACE_SEEDS[key] : undefined;
  return seed ? `${seed}, consistent facial structure, same woman` : "";
}

/** Prepends identity text and locks the seed. Caller-supplied seeds still win. */
export function lockIdentity(
  prompt: string,
  companionId?: string,
  requestedSeed?: number,
): { prompt: string; seed: number } {
  const frag = identityFragment(companionId);
  return {
    prompt: frag ? `${frag}, ${prompt}` : prompt,
    seed: requestedSeed ?? (companionId ? seedFromId(companionId) : Math.floor(Math.random() * 90000) + 1000),
  };
}

/** True when a deterministic identity is available for this companion. */
export function hasIdentity(companionId?: string): boolean {
  if (!companionId) return false;
  const key = FACE_SEEDS[companionId] ? companionId : ALIASES[companionId];
  return Boolean(key && FACE_SEEDS[key]);
}
