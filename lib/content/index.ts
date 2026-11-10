import { CONTENT_DISCLAIMER } from "./disclaimer";
import { ADDED_JOI } from "./joi/added";
import { EXPANDED_JOI } from "./joi/expanded";
import { ADDED_STORY_PACKS } from "./story/added";
import { EXPANDED_STORY_PACKS } from "./story/expanded";
import type { JoiScenario, StoryPack } from "./types";

/**
 * Story packs and JOI presets.
 *
 * Names follow the original in-app catalogs: `STORY_PACKS` entries expose
 * id, title, tag, and desc; `JOI_PRESETS` entries expose id and label.
 * Chapters, choices, personas, and timed steps extend that shape so a pack
 * can be played instead of only announced.
 *
 * Incest packs and racial-humiliation packs from the old inline list are
 * not registered. This catalog is fictional adults and consensual fantasy.
 */
export const STORY_PACKS: StoryPack[] = [
  ...EXPANDED_STORY_PACKS,
  ...ADDED_STORY_PACKS,
];

export const JOI_PRESETS: JoiScenario[] = [...EXPANDED_JOI, ...ADDED_JOI];

export const EXPANDED_STORY_IDS = EXPANDED_STORY_PACKS.map((pack) => pack.id);
export const EXPANDED_JOI_IDS = EXPANDED_JOI.map((scenario) => scenario.id);

export function getStoryPack(id: string): StoryPack | undefined {
  return STORY_PACKS.find((pack) => pack.id === id);
}

export function getJoiScenario(id: string): JoiScenario | undefined {
  return JOI_PRESETS.find((scenario) => scenario.id === id);
}

export { CONTENT_DISCLAIMER };
export type { JoiScenario, StoryPack } from "./types";
