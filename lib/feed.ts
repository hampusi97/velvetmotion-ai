import { CHARACTERS } from "@/lib/characters";
import { resolveCharacterAvatar } from "@/lib/media";

/** Lightweight "she posted today" feed — living companion energy. */

export type FeedPost = {
  id: string;
  characterId: string;
  characterName: string;
  avatar: string;
  text: string;
  mood: "flirty" | "tease" | "soft" | "explicit";
  hoursAgo: number;
};

const LINES: Record<string, string[]> = {
  flirty: [
    "Thinking about last night. Don't make me wait too long to hear from you.",
    "Woke up still in that mood. You free later?",
    "I left something on for when you open the chat.",
  ],
  tease: [
    "You blinked. I noticed. Come earn another look.",
    "Hands where I can see them when you reply.",
    "Edge for me a little before you message. Just a little.",
  ],
  soft: [
    "Missed your voice today. Tell me one real thing.",
    "Quiet evening. Stay if you want company.",
    "I saved a soft one for you. Open the chat when you're ready.",
  ],
  explicit: [
    "I'm not wearing much. Open our room if you want proof.",
    "Need you in my head right now. Chat open.",
    "Tribute challenge unlocked for me tonight. You in?",
  ],
};

export function buildFeed(limit = 12): FeedPost[] {
  const moods = ["flirty", "tease", "soft", "explicit"] as const;
  return CHARACTERS.slice(0, limit).map((c, i) => {
    const mood = moods[i % moods.length];
    const pool = LINES[mood];
    const text = pool[i % pool.length];
    return {
      id: `feed-${c.id}`,
      characterId: c.id,
      characterName: c.name.split(" ")[0],
      avatar: resolveCharacterAvatar(c),
      text,
      mood,
      hoursAgo: (i * 2 + 1) % 14,
    };
  });
}
