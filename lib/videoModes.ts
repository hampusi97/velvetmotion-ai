import {
  joiSequenceFrames,
  sphSequenceFrames,
  bnwoSequenceFrames,
  sexSequenceFrames,
} from "./media";
import type { Character } from "./charactersTypes";
import { spendCoins, addToGallery, GEN_COST } from "./storage";
import { saveTribute } from "./rewards";

export type SequenceKind = "joi" | "sph" | "bnwo" | "sex";

export function buildSequence(
  character: Pick<Character, "id" | "name" | "figure" | "age">,
  kind: SequenceKind,
): string[] {
  if (kind === "joi") return joiSequenceFrames(character);
  if (kind === "sph") return sphSequenceFrames(character);
  if (kind === "bnwo") return bnwoSequenceFrames(character);
  return sexSequenceFrames(character);
}

export function runSequenceGeneration(
  character: Character,
  kind: SequenceKind,
): { frames: string[]; cost: number; ok: boolean } {
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
  return { frames, cost, ok: true };
}

export const SEQUENCE_LABELS: { id: SequenceKind; label: string }[] = [
  { id: "joi", label: "JOI video" },
  { id: "sph", label: "SPH video" },
  { id: "bnwo", label: "BNWO video" },
  { id: "sex", label: "Sex video" },
];
