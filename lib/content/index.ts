import { CONTENT_DISCLAIMER } from "./disclaimer";
import { ADDED_JOI } from "./joi/added";
import { EXPANDED_JOI } from "./joi/expanded";
import { FETISH_JOI } from "./joi/fetish";
import { INTENSE_RELATIONSHIP_JOI_PRESETS } from "./joi/intense-relationships";
import { INTERRACIAL_JOI_PRESETS } from "./joi/interracial";
import { ADDED_STORY_PACKS } from "./story/added";
import { BNWO_SPH_PACKS } from "./story/bnwo";
import { EXPANDED_STORY_PACKS } from "./story/expanded";
import { INTENSE_RELATIONSHIP_STORY_PACKS } from "./story/intense-relationships";
import { INTERRACIAL_STORY_PACKS } from "./story/interracial";
import type { JoiScenario, StoryPack } from "./types";

/**
 * Story packs and JOI presets.
 *
 * Names follow the original in-app catalogs: `STORY_PACKS` entries expose
 * id, title, tag, and desc; `JOI_PRESETS` entries expose id and label.
 * Chapters, choices, personas, and timed steps extend that shape so a pack
 * can be played instead of only announced.
 */
export const STORY_PACKS: StoryPack[] = [
  ...INTERRACIAL_STORY_PACKS,
  ...INTENSE_RELATIONSHIP_STORY_PACKS,
  ...EXPANDED_STORY_PACKS,
  ...ADDED_STORY_PACKS,
];

export const ALL_STORY_PACKS: StoryPack[] = [
  ...STORY_PACKS,
  ...BNWO_SPH_PACKS,
];

export const JOI_PRESETS: JoiScenario[] = [
  ...INTERRACIAL_JOI_PRESETS,
  ...INTENSE_RELATIONSHIP_JOI_PRESETS,
  ...EXPANDED_JOI,
  ...ADDED_JOI,
];

export const ALL_JOI_PRESETS: JoiScenario[] = [
  ...JOI_PRESETS,
  ...FETISH_JOI,
];

export const EXPANDED_STORY_IDS = EXPANDED_STORY_PACKS.map((pack) => pack.id);
export const EXPANDED_JOI_IDS = EXPANDED_JOI.map((scenario) => scenario.id);

export function getStoryPack(id: string): StoryPack | undefined {
  return ALL_STORY_PACKS.find((pack) => pack.id === id);
}

export function getJoiScenario(id: string): JoiScenario | undefined {
  return ALL_JOI_PRESETS.find((scenario) => scenario.id === id);
}

export { CONTENT_DISCLAIMER, BNWO_SPH_PACKS, FETISH_JOI, INTERRACIAL_JOI_PRESETS, INTENSE_RELATIONSHIP_JOI_PRESETS };
export type { JoiScenario, StoryPack } from "./types";
