/**
 * Candy "Live Action" / spicy motion menu — maps to our sequence engine.
 * Not true 120s video; drives JOI/sex/SPH sequences + scene prompts.
 */

import type { SequenceKind } from "./videoModes";
import type { MediaMood } from "./media";

export type LiveActionPreset = {
  id: string;
  label: string;
  emoji: string;
  kind: SequenceKind | "photo";
  mood?: MediaMood;
  sceneExtra: string;
  minIntimacy: number;
};

export const LIVE_ACTION_PRESETS: LiveActionPreset[] = [
  {
    id: "wave",
    label: "Wave at you",
    emoji: "👋",
    kind: "photo",
    mood: "beauty",
    sceneExtra: "waving at camera, friendly smile, selfie",
    minIntimacy: 0,
  },
  {
    id: "blow-kiss",
    label: "Blow a kiss",
    emoji: "😘",
    kind: "photo",
    mood: "seductive",
    sceneExtra: "blowing a kiss to viewer, soft lips, flirty eyes",
    minIntimacy: 15,
  },
  {
    id: "lingerie-tease",
    label: "Lingerie tease",
    emoji: "👗",
    kind: "photo",
    mood: "lingerie",
    sceneExtra: "slow lingerie tease, looking at viewer",
    minIntimacy: 30,
  },
  {
    id: "undress",
    label: "Undress",
    emoji: "🔥",
    kind: "sex",
    sceneExtra: "starting to undress, sensual",
    minIntimacy: 40,
  },
  {
    id: "joi",
    label: "JOI session",
    emoji: "🎯",
    kind: "joi",
    sceneExtra: "instructional JOI pose",
    minIntimacy: 45,
  },
  {
    id: "sph",
    label: "SPH tease",
    emoji: "😏",
    kind: "sph",
    sceneExtra: "dominant teasing expression",
    minIntimacy: 50,
  },
  {
    id: "finish",
    label: "Finish for me",
    emoji: "💦",
    kind: "joi",
    sceneExtra: "climax command, intense eye contact",
    minIntimacy: 55,
  },
  {
    id: "bnwo",
    label: "BNWO claim",
    emoji: "👑",
    kind: "bnwo",
    sceneExtra: "powerful dominant pose",
    minIntimacy: 60,
  },
];
