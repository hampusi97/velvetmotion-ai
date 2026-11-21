import { generateStudioPicture } from "./mediaGenerator";
import { consume, remaining } from "./photoBudget";
import type { CompanionProfile } from "@/data/companions";
import type { ProactiveKind } from "./proactiveEngine";

const PRESET: Record<ProactiveKind, string> = {
  milestone: "proud satisfied expression, looking at camera, warm light",
  absence: "waiting by a window, slightly reproachful look, evening light",
  streak_risk: "checking the time, pointed look, lamp light",
  session_callback: "half-dressed, expectant, seated on the edge of the bed",
  evening: "relaxed at home, warm low light, direct gaze",
};

export async function maybeUnpromptedPhoto(
  companion: Pick<CompanionProfile, "id" | "visualDna">,
  kind: ProactiveKind,
  generator: typeof generateStudioPicture = generateStudioPicture,
): Promise<string | null> {
  if (remaining(companion.id) <= 0) return null;
  if (!consume(companion.id)) return null;

  try {
    const res = await generator({
      prompt: `${companion.visualDna}, ${PRESET[kind]}, candid phone photo`,
      width: 768,
      height: 1152,
      nsfw: true,
      characterId: companion.id,
    });
    return res.imageUrl;
  } catch {
    return null;
  }
}
