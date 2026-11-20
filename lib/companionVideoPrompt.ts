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
  {
    id: "silk-and-shadows",
    label: "Silk & shadows",
    adult: true,
    scene: {
      action: "She steps into the light in a silk slip, pauses, and meets the camera with a teasing smile.",
      setting: "a private suite with dark silk curtains",
      camera: "slow portrait push in from the doorway",
      lighting: "warm amber side light, deep shadows",
    },
  },
  {
    id: "midnight-encore",
    label: "Midnight encore",
    adult: true,
    scene: {
      action: "She slips off a velvet jacket to reveal lace lingerie, then turns slowly toward the mirror.",
      setting: "a quiet dressing room after the last show",
      camera: "one smooth arc from profile to eye level",
      lighting: "soft mirror bulbs and plum rim light",
    },
  },
  {
    id: "candlelight-closeup",
    label: "Candlelight close-up",
    adult: true,
    scene: {
      action: "She leans against the chaise in satin lingerie, tilts her head, and holds the camera's gaze.",
      setting: "a candlelit boudoir with burgundy velvet",
      camera: "unbroken close-up, gradual push in",
      lighting: "warm candlelight and a soft edge light",
    },
  },
  {
    id: "bnwo-secret-date",
    label: "BNWO · Secret date",
    adult: true,
    scene: {
      action: "Consensual BNWO jealousy roleplay. She shares a lingering look with her Black date, then turns to the camera with a knowing smile.",
      setting: "a private corner booth after the show",
      camera: "gentle two-shot, then hold on her reaction",
      lighting: "low amber light and soft velvet reflections",
    },
  },
  {
    id: "sph-night-in",
    label: "SPH · Night in",
    adult: true,
    scene: {
      action: "Agreed SPH roleplay. She gives the camera a mischievous smile, leans in to tease, then waits to read her adult partner's reaction.",
      setting: "the edge of a chaise in a private suite",
      camera: "eye-level portrait with a steady push in",
      lighting: "violet window light under a warm key light",
    },
  },
  {
    id: "bnwo-private-fantasy",
    label: "BNWO · Breeding fantasy",
    adult: true,
    scene: {
      action: "Opening beat of a consensual BNWO breeding fantasy. She draws her Black adult partner closer, holds his gaze, and pauses for an answer.",
      setting: "a private bedroom with soft velvet curtains",
      camera: "slow move from her profile to a two-shot",
      lighting: "dim rose light with warm practical lamps",
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
  if (!adultMode && /\b(nsfw|nud(?:e|ity)|naked|undress(?:ing)?|explicit|erotic|sex(?:ual)?|lingerie|boudoir|bnwo|sph|breeding fantasy)\b/i.test(prompt)) {
    return "Enable 18+ mode for this prompt, or choose a standard scene.";
  }
  return null;
}
