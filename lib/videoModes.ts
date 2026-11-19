import {
  joiSequenceFrames,
  sphSequenceFrames,
  bnwoSequenceFrames,
  sexSequenceFrames,
} from "./media";
import type { Character } from "./charactersTypes";
import { spendCoins, addToGallery, GEN_COST } from "./storage";
import { saveTribute } from "./rewards";
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

export function runSequenceGeneration(
  character: Character,
  kind: SequenceKind,
): { frames: string[]; cost: number; ok: boolean; videoUrl?: string | null; note?: string } {
  const cost = GEN_COST.video || 28;
  if (!spendCoins(cost)) return { frames: [], cost, ok: false };
  const frames = buildSequence(character, kind);
  addToGallery({
    characterId: character.id,
    characterName: character.name,
    type: "video",
    url: frames[frames.length - 1],
    frames,
    prompt: `${character.name} ${kind} sequence`,
  });
  if (kind === "sex" || kind === "joi") {
    saveTribute({
      characterId: character.id,
      characterName: character.name,
      url: frames[frames.length - 1],
      frames,
      note: kind,
    });
  }
  return {
    frames,
    cost,
    ok: true,
    videoUrl: null,
    note: "Sequence ready — Live Action clip resolves async if img2vid configured",
  };
}

/** Async: attach real clip when possible; always keeps frames. */
export async function enhanceSequenceWithVideo(
  character: Character,
  kind: SequenceKind,
  frames: string[],
): Promise<{ videoUrl: string | null; note: string; mode: "mp4" | "sequence" }> {
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
