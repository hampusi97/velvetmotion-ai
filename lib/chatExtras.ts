import { characterPortraitUrl } from "@/lib/portraits";
import type { Character } from "@/lib/characters";

/** After high intimacy, schedule a "she's typing" lingerie drop. */
export function shouldDropDelayedNude(intimacy: number, messageCount: number, alreadyDropped: boolean) {
  return intimacy >= 55 && messageCount >= 4 && messageCount <= 12 && !alreadyDropped;
}

export function delayedNudeMessage(character: Character) {
  const url = characterPortraitUrl(character.id, character.figure, "lingerie");
  return {
    role: "assistant" as const,
    content: `(She's typing…) Got something for you. Don't finish yet.`,
    imageUrl: url,
    mediaType: "lingerie",
  };
}

export function aftercareMessage(character: Character) {
  const name = character.name.split(" ")[0];
  return {
    role: "assistant" as const,
    content: `${name} softens. “Breathe. Drink some water. I'm still here — no rush, no performance. Tell me how you feel.” Aftercare mode: slow chat, warmth, no pressure to go again until you want.`,
  };
}
