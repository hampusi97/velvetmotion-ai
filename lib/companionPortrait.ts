import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";
import { generateLocalImage } from "./comfyClient";
import { getMediaSettings } from "./mediaSettings";
import { compactCardPortrait } from "./avatarOptimize";

/** Explicit model request. Preparing a portrait never replaces a saved profile on its own. */
export async function createLocalCompanionPortrait(
  character: Character,
): Promise<{ avatar: string; engine: string }> {
  const guard = validateCharacterCompliance({
    ...character,
    backstory: character.background,
  });
  if (!guard.ok) throw new Error(guard.reason);
  const result = await generateLocalImage(
    {
      prompt: `${character.figure}, original fictional adult age ${character.age}, tasteful cinematic portrait, natural lighting, head and shoulders`,
      seed: Math.floor(Math.random() * 1_000_000_000) + 1,
      characterId: character.id,
      width: 512,
      height: 768,
    },
    getMediaSettings().localImageBase || "http://127.0.0.1:8188",
  );
  if (!result.ok || !result.imageUrl)
    throw new Error(
      result.note ||
        "No portrait was generated. Connect a compatible local image model in Settings.",
    );
  if (
    !/^data:image\/(?:png|jpeg|webp);base64,/i.test(result.imageUrl) ||
    result.imageUrl.length > 14_000_000
  ) {
    throw new Error(
      "The model must return a PNG, JPEG or WebP data URL under 10 MB.",
    );
  }
  const blob = await (await fetch(result.imageUrl)).blob();
  return {
    avatar: await compactCardPortrait(
      new File([blob], "portrait.png", { type: blob.type }),
    ),
    engine: result.note,
  };
}
