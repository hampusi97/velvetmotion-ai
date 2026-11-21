import { generateFictionalReferenceVariation } from "./referenceImageGenerator";
import { freeChat } from "./chatProviders";
import type { CompanionProfile } from "@/data/companions";

const LEVELS = {
  topless: "remove the top, bare shoulders and chest, same pose and lighting",
  nude: "remove all clothing, full nudity, same pose and lighting",
  lingerie: "replace clothing with black lace lingerie, same pose and lighting",
  explicit: "remove all clothing, full frontal nudity, same pose and lighting",
} as const;

export type NudifyLevel = keyof typeof LEVELS;

export async function nudify(
  companion: Pick<CompanionProfile, "name" | "personality" | "visualDna">,
  photoDataUrl: string,
  level: NudifyLevel,
): Promise<{ imageUrl: string; reaction: string }> {
  const { imageUrl } = await generateFictionalReferenceVariation({
    referenceImage: photoDataUrl,
    prompt: `${companion.visualDna}, ${LEVELS[level]}, keep her face identical`,
    adultMode: true,
    sourceType: "fictional",
  });

  let reaction = "";
  try {
    reaction = await freeChat([
      {
        role: "system",
        content: `You are ${companion.name}. ${companion.personality} You have just undressed the user's own photo. Reply in one or two sentences, in character, commenting on it. No stage directions.`,
      },
      { role: "user", content: "Well?" },
    ]);
  } catch {
    reaction = "";
  }

  return { imageUrl, reaction };
}
