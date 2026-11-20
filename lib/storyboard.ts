/**
 * Original-fictional character shot planning. These are structured prompts,
 * not purported AI video frames or privileged access to a generative model.
 */
export type ShotComposition = "establishing" | "portrait" | "close-up" | "over-shoulder";
export type ShotLighting = "rose-gold" | "candlelight" | "moonlight" | "neon";
export type ShotWardrobe = "silk eveningwear" | "tailored couture" | "cozy knitwear" | "editorial lingerie";
export type ShotKind = "image" | "video";
export interface AtelierShot {
  id: string;
  title: string;
  composition: ShotComposition;
  lighting: ShotLighting;
  wardrobe: ShotWardrobe;
  direction: string;
  type: ShotKind;
  durationSec: 3 | 5 | 8;
}
export const SHOT_COMPOSITIONS: ShotComposition[] = ["establishing", "portrait", "close-up", "over-shoulder"];
export const SHOT_LIGHTING: ShotLighting[] = ["rose-gold", "candlelight", "moonlight", "neon"];
export const SHOT_WARDROBE: ShotWardrobe[] = ["silk eveningwear", "tailored couture", "cozy knitwear", "editorial lingerie"];
export const STORYBOARD_STORAGE_KEY = "vm-storyboard-v1";
export const DEFAULT_ATELIER_SHOTS: AtelierShot[] = [
  { id: "opening", title: "01 · Arrival", composition: "establishing", lighting: "rose-gold", wardrobe: "silk eveningwear", direction: "Elegant penthouse entrance, evening city lights", type: "image", durationSec: 5 },
  { id: "encounter", title: "02 · First glance", composition: "portrait", lighting: "candlelight", wardrobe: "tailored couture", direction: "A warm, character-driven moment, cinematic depth of field", type: "image", durationSec: 5 },
  { id: "reveal", title: "03 · The reveal", composition: "close-up", lighting: "moonlight", wardrobe: "silk eveningwear", direction: "Subtle expressive glance, intimate atmosphere and soft shadows", type: "video", durationSec: 5 },
];

export function validateAtelierShot(shot: AtelierShot) {
  if (!shot || typeof shot !== "object") return false;
  return Boolean(
    /^[a-z0-9-]{1,45}$/i.test(shot.id) &&
    shot.title && shot.title.length <= 90 &&
    SHOT_COMPOSITIONS.includes(shot.composition) &&
    SHOT_LIGHTING.includes(shot.lighting) &&
    SHOT_WARDROBE.includes(shot.wardrobe) &&
    typeof shot.direction === "string" && shot.direction.length <= 400 &&
    (shot.type === "image" || shot.type === "video") &&
    ([3,5,8] as number[]).includes(shot.durationSec)
  );
}
export function sanitizeAtelierShots(raw: unknown): AtelierShot[] {
  if (!Array.isArray(raw)) return DEFAULT_ATELIER_SHOTS.map((s) => ({ ...s }));
  const seen = new Set<string>();
  return raw.filter((s): s is AtelierShot => validateAtelierShot(s)).filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id); return true;
  }).slice(0, 5);
}
export function buildAtelierShotPrompt({
  visualDna, characterName, scene, shot, adultMode,
}: {
  visualDna: string; characterName: string; scene: string; shot: AtelierShot; adultMode: boolean;
}) {
  if (!validateAtelierShot(shot)) throw new Error("Invalid storyboard shot.");
  if (!visualDna || visualDna.length > 3500) throw new Error("A valid fictional-character visual description is required.");
  return [
    "ORIGINAL FICTIONAL consenting adult aged 21 or older; no resemblance to a real person",
    `Main character: ${characterName.slice(0, 100)}`,
    `Maintain recognizable appearance and facial identity across shots: ${visualDna}`,
    `Scene: ${scene.trim().slice(0, 380) || "elegant cinematic interior"}`,
    `Composition: ${shot.composition}`,
    `Lighting: ${shot.lighting}`,
    `Wardrobe: ${shot.wardrobe}`,
    `Direction: ${shot.direction}`,
    "Realistic lens, coherent hands, atmospheric shadows, high production value",
    adultMode ? "Adult fictional fashion and boudoir styling if the selected model permits it" : "Non-explicit cinematic portrait",
  ].join(". ");
}
