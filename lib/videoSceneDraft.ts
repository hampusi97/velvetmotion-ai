import {
  VIDEO_DURATIONS,
  VIDEO_MOTION_PRESETS,
  VIDEO_RESOLUTIONS,
  VIDEO_SPEEDS,
  type VideoMotionPreset,
} from "./canvasVideoExporter";
import { VIDEO_SCENE_LIMITS, type CompanionVideoScene } from "./companionVideoPrompt";

export type VideoSceneDraft = {
  scene: CompanionVideoScene;
  adultMode: boolean;
  durationSec: (typeof VIDEO_DURATIONS)[number];
  resolution: (typeof VIDEO_RESOLUTIONS)[number];
  speed: (typeof VIDEO_SPEEDS)[number];
  motionId: VideoMotionPreset["id"];
};

export function videoSceneDraftKey(companionId: string): string {
  return `velvetmotion-video-draft-v1:${companionId}`;
}

export function parseVideoSceneDraft(raw: string | null): VideoSceneDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<VideoSceneDraft> | null;
    if (!value?.scene || typeof value.adultMode !== "boolean" ||
        !VIDEO_DURATIONS.some((duration) => duration === value.durationSec) ||
        !VIDEO_RESOLUTIONS.some((resolution) => resolution === value.resolution) ||
        !VIDEO_SPEEDS.some((speed) => speed === value.speed) ||
        !VIDEO_MOTION_PRESETS.some(({ id }) => id === value.motionId)) {
      return null;
    }
    const { action, setting, camera, lighting } = value.scene;
    if (typeof action !== "string" || typeof setting !== "string" ||
        typeof camera !== "string" || typeof lighting !== "string") {
      return null;
    }
    const draft = value as VideoSceneDraft;
    return {
      adultMode: draft.adultMode,
      durationSec: draft.durationSec,
      resolution: draft.resolution,
      speed: draft.speed,
      motionId: draft.motionId,
      scene: {
        action: action.slice(0, VIDEO_SCENE_LIMITS.action),
        setting: setting.slice(0, VIDEO_SCENE_LIMITS.setting),
        camera: camera.slice(0, VIDEO_SCENE_LIMITS.camera),
        lighting: lighting.slice(0, VIDEO_SCENE_LIMITS.lighting),
      },
    };
  } catch {
    return null;
  }
}
