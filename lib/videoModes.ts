import {
  joiSequenceFrames,
  sphSequenceFrames,
  bnwoSequenceFrames,
  sexSequenceFrames,
} from "./media";
import type { Character } from "./charactersTypes";
import { MOTION_PROMPTS, requestImg2Vid, sequenceOnlyResult } from "./img2vid";

export type SequenceKind = "joi" | "sph" | "bnwo" | "sex" | "doggy" | "cowgirl" | "shower";

export function buildSequence(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  kind: SequenceKind,
): string[] {
  if (kind === "joi") return joiSequenceFrames(character);
  if (kind === "sph") return sphSequenceFrames(character);
  if (kind === "bnwo") return bnwoSequenceFrames(character);
  return sexSequenceFrames(character); // sex, doggy, cowgirl, shower
}

/**
 * Prepare a still-frame preview only. The previous version charged users and
 * saved four identical portrait URLs as if they were newly generated videos.
 * Actual render/charging belongs after a compatible model confirms success.
 */
export function runSequenceGeneration(
  character: Character,
  kind: SequenceKind,
): { frames: string[]; cost: number; ok: boolean; videoUrl?: string | null; note?: string } {
  const preview = buildSequence(character, kind)[0];
  return {
    frames: preview ? [preview] : [],
    cost: 0,
    ok: true,
    videoUrl: null,
    note: "Still preview only — no coins charged and no video generated yet",
  };
}

/** Async: attach real clip when possible; always keeps frames. */
export async function enhanceSequenceWithVideo(
  character: Character,
  kind: SequenceKind,
  frames: string[],
): Promise<{ videoUrl: string | null; note: string; mode: "mp4" | "webm" | "sequence" }> {
  if (!frames.length) return sequenceOnlyResult([]);
  const motion = MOTION_PROMPTS[kind] || MOTION_PROMPTS.default;
  try {
    const result = await requestImg2Vid(frames[frames.length - 1], motion, frames);
    return { videoUrl: result.videoUrl, note: result.note, mode: result.mode };
  } catch {
    return sequenceOnlyResult(frames);
  }
}

export const SEQUENCE_LABELS: { id: SequenceKind; label: string }[] = [
  { id: "joi", label: "JOI video" },
  { id: "sph", label: "SPH video" },
  { id: "bnwo", label: "BNWO video" },
  { id: "sex", label: "Sex video" },
];
