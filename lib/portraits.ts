/**
 * Real-Portrait Resolver (`lib/portraits.ts`).
 * Strictly routes every companion/mood portrait to verified photorealistic
 * files in `/public/portraits/` (never cartoon `.svg` fallbacks).
 */

import type { Character } from "./charactersTypes";
import { staticPortraitUrl } from "./portraitFallback";

export type PortraitMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "seductive";

function isForbiddenCartoonSvg(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return (
    !lower ||
    lower.includes("/avatars/") ||
    lower.startsWith("data:image/svg+xml") ||
    /\.svg(?:$|[?#])/i.test(lower)
  );
}

/** Returns verified photorealistic `/portraits/...` asset for any companion ID. */
export function characterPortraitUrl(
  id: string,
  _figure = "",
  _mood: PortraitMood | string = "seductive",
  _extraLabel?: string,
): string {
  return staticPortraitUrl(id || "chloe");
}

/** Never returns cartoon `.svg` avatars; upgrades legacy `/avatars/*.svg` to real portraits. */
export function resolveAvatar(avatar: string, id: string, _figure: string): string {
  if (!isForbiddenCartoonSvg(avatar) && (avatar.startsWith("data:") || avatar.startsWith("http") || avatar.startsWith("/portraits/"))) {
    return avatar;
  }
  return staticPortraitUrl(id || "chloe");
}

/** Convenience: get a verified photorealistic portrait directly from a Character object. */
export function characterRichPortrait(
  character: Character,
  mood: PortraitMood | string = "beauty",
): string {
  return characterPortraitUrl(character.id, character.figure || character.name, mood);
}
