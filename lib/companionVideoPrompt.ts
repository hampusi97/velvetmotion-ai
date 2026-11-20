import { assertCompliance } from "./complianceFilter";

export type CompanionVideoScene = {
  action: string;
  setting: string;
  camera: string;
  lighting: string;
};

export const VIDEO_SCENE_LIMITS = { action: 330, setting: 64, camera: 48, lighting: 48 } as const;

export const DEFAULT_COMPANION_VIDEO_SCENE: CompanionVideoScene = {
  action: "",
  setting: "",
  camera: "slow dolly in at eye level",
  lighting: "soft side light",
};

export const VIDEO_SCENE_PRESETS = [
  {
    id: "first-date",
    label: "First date",
    adult: false,
    scene: {
      action: "She looks up with a quiet smile and leans toward the camera.",
      setting: "a quiet corner booth after dinner",
      camera: "tight portrait, steady push in",
      lighting: "warm practical lamp light",
    },
  },
  {
    id: "after-hours",
    label: "After Hours",
    adult: true,
    scene: {
      action: "She turns toward the camera in silk lingerie, holds eye contact, then smiles.",
      setting: "a private boudoir suite",
      camera: "slow eye-level dolly in",
      lighting: "dim amber lamps and soft rim light",
    },
  },
  {
    id: "velvet-mirror",
    label: "Velvet mirror",
    adult: true,
    scene: {
      action: "She adjusts a satin robe over lace lingerie and glances back over her shoulder.",
      setting: "a backstage dressing room with velvet drapes",
      camera: "medium portrait, gentle side-to-side motion",
      lighting: "warm mirror bulbs and a deep plum backdrop",
    },
  },
] satisfies Array<{ id: string; label: string; adult: boolean; scene: CompanionVideoScene }>;

export const NEUTRAL_PORTRAIT_MOTION =
  "Nonsexual portrait animation. Fully clothed, gentle head turn, natural blink, stable lighting.";

export function composeCompanionVideoPrompt(
  scene: CompanionVideoScene,
  fictional: boolean,
  adultMode: boolean,
): string {
  if (!fictional) return NEUTRAL_PORTRAIT_MOTION;

  const direction = [
    (scene.action.trim() || "Subtle natural motion and relaxed eye contact.").slice(0, VIDEO_SCENE_LIMITS.action),
    scene.setting.trim() && `Setting: ${scene.setting.trim().slice(0, VIDEO_SCENE_LIMITS.setting)}`,
    scene.camera.trim() && `Camera: ${scene.camera.trim().slice(0, VIDEO_SCENE_LIMITS.camera)}`,
    scene.lighting.trim() && `Lighting: ${scene.lighting.trim().slice(0, VIDEO_SCENE_LIMITS.lighting)}`,
  ].filter(Boolean).join("\n");

  const subject = adultMode ? "Consenting fictional adult (18+)." : "Fictional adult companion.";
  return `${subject}\n${direction}\nKeep face and motion consistent.`;
}

export function validateCompanionVideoPrompt(prompt: string, adultMode: boolean): string | null {
  const compliance = assertCompliance(prompt);
  if (!compliance.ok) return compliance.reason;
  if (!adultMode && /\b(nsfw|nud(?:e|ity)|naked|undress(?:ing)?|explicit|erotic|sex(?:ual)?|lingerie|boudoir)\b/i.test(prompt)) {
    return "Enable 18+ mode for this prompt, or choose a standard scene.";
  }
  return null;
}
