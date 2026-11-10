/** Shared catalog types for story packs and JOI scenarios. */

export type StoryTag =
  | "CUCK"
  | "GROUP"
  | "ROMANCE"
  | "SLOW-BURN"
  | "TEASE"
  | "D/S"
  | "FANTASY"
  | "SCI-FI";

export type Accent =
  | "amber"
  | "violet"
  | "fuchsia"
  | "red"
  | "sky"
  | "orange"
  | "pink"
  | "rose"
  | "indigo"
  | "cyan"
  | "emerald"
  | "slate";

export interface StoryCharacter {
  name: string;
  /** Explicit adult age. Catalog validation requires 18 or older. */
  age: number;
  role: string;
  summary: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextSceneId: string;
}

export interface StoryScene {
  id: string;
  title: string;
  text: string;
  /** Linear advance when the scene has no choices. */
  nextSceneId?: string;
  choices?: StoryChoice[];
}

export interface StoryChapter {
  id: string;
  title: string;
  sceneIds: string[];
}

export interface StoryPack {
  id: string;
  title: string;
  tag: StoryTag;
  /** Short card line. Expanded historical packs keep their original desc. */
  desc: string;
  /** Longer description shown inside the pack. */
  summary: string;
  accent: Accent;
  character: StoryCharacter;
  chapters: StoryChapter[];
  scenes: StoryScene[];
}

export type JoiPhase = "warm-up" | "build" | "edge" | "finish";

export const JOI_PHASES: JoiPhase[] = ["warm-up", "build", "edge", "finish"];

export interface JoiPersona {
  name: string;
  age: number;
  summary: string;
}

export interface JoiStep {
  id: string;
  phase: JoiPhase;
  title: string;
  instruction: string;
  suggestedSeconds: number;
}

export interface JoiScenario {
  id: string;
  /** Historical presets used `label` as the display name. */
  label: string;
  persona: JoiPersona;
  summary: string;
  tone: string;
  accent: Accent;
  steps: JoiStep[];
}
