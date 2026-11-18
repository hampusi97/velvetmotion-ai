/**
 * Nomi-style "Mind Map" Memory Engine + DreamGF / Kindroid Roleplay Director
 * Automatically extracts user preferences, nicknames, and shared moments from chat,
 * and manages active Wardrobe, Scene Location, and Inner Monologue state.
 */

export type MemoryCategory = "nickname" | "desire" | "memory" | "persona";

export interface MemoryNode {
  id: string;
  category: MemoryCategory;
  text: string;
  createdAt: number;
}

export interface RoleplayContext {
  outfit: string;
  sceneLocation: string;
  showInnerThoughts: boolean;
  memories: MemoryNode[];
}

export const WARDROBE_OPTIONS = [
  { id: "sheer-lace", label: "Sheer Black Lace", prompt: "wearing sheer black French lace lingerie and garter straps" },
  { id: "silk-robe", label: "Silk Boudoir Robe", prompt: "wearing an untied crimson silk robe slipping off her shoulders" },
  { id: "oversized-shirt", label: "Oversized Shirt", prompt: "wearing only an unbuttoned white dress shirt, bare legs" },
  { id: "crimson-latex", label: "Second-Skin Latex", prompt: "wearing glossy form-fitting dark rose bodysuit" },
  { id: "bare-skin", label: "Bare Skin (Unclothed)", prompt: "completely unclothed, bare warm skin, natural proportions" },
] as const;

export const SCENE_LOCATIONS = [
  { id: "penthouse-bed", label: "Penthouse Canopy Bed", prompt: "on black velvet sheets in a candlelit penthouse suite" },
  { id: "steamy-shower", label: "Steamy Glass Shower", prompt: "inside a warm steam-filled glass shower with wet skin" },
  { id: "midnight-jacuzzi", label: "Skyline Jacuzzi", prompt: "in a bubbling rooftop jacuzzi overlooking the neon city skyline" },
  { id: "red-darkroom", label: "Red Darkroom Studio", prompt: "under moody crimson darkroom lighting with deep shadows" },
  { id: "private-limo", label: "Midnight Limousine", prompt: "in the leather backseat of a tinted limousine at night" },
] as const;

const MEMORY_STORAGE_PREFIX = "velvet-mindmap-";
const RP_CONTEXT_PREFIX = "velvet-rp-context-";

/** Pure function: extract new memory facts from a user's message */
export function extractMemoriesFromMessage(
  userMessage: string,
  existing: MemoryNode[],
): MemoryNode[] {
  const text = userMessage.trim();
  if (!text) return existing;

  const added: MemoryNode[] = [];
  const lowerExists = new Set(existing.map((m) => m.text.toLowerCase()));

  const pushUnique = (category: MemoryCategory, fact: string) => {
    const cleaned = fact.trim().replace(/\s+/g, " ").slice(0, 90);
    if (!cleaned || lowerExists.has(cleaned.toLowerCase())) return;
    lowerExists.add(cleaned.toLowerCase());
    added.push({
      id: `mem-${Date.now()}-${added.length}`,
      category,
      text: cleaned,
      createdAt: Date.now(),
    });
  };

  // 1. Nickname / Title ("call me ...", "my name is ...", "you can call me ...")
  const callMeMatch = text.match(
    /\b(?:call me|my name is|you can call me)\s+([a-zA-Z0-9_-]{2,20}(?:\s+(?!and\b|or\b|but\b|i\b|because\b)[a-zA-Z0-9_-]{2,20})?)/i,
  );
  if (callMeMatch?.[1]) {
    pushUnique("nickname", `Prefers to be called "${callMeMatch[1].trim()}"`);
  }

  // 2. Desires & Turn-ons ("i love ...", "i like ...", "i'm into ...", "my favorite ... is ...")
  const desireMatch = text.match(
    /\b(?:i really love|i love|i like when you|i'm into|i am into|my kink is|turn me on with)\s+([^.!?]{3,65})/i,
  );
  if (desireMatch?.[1]) {
    pushUnique("desire", `Turned on by: ${desireMatch[1].trim()}`);
  }

  // 3. Shared moments / actions ("kiss", "touch", "shower", "champagne", "whisper", "kneel")
  if (/\b(champagne|toast|wine)\b/i.test(text)) {
    pushUnique("memory", "Shared a private midnight glass together");
  }
  if (/\b(shower|wet|steam)\b/i.test(text)) {
    pushUnique("memory", "Stepped into a steamy shower scene together");
  }
  if (/\b(neck|collarbone|ear)\b/i.test(text) && /\b(kiss|whisper|bite|touch)\b/i.test(text)) {
    pushUnique("desire", "Loves close neck kisses and breathy ear whispers");
  }

  return [...added, ...existing].slice(0, 20);
}

/** Generate an in-character inner monologue line based on mood, outfit, and scene */
export function buildInnerMonologue(params: {
  characterName: string;
  moodLabel: string;
  outfitLabel: string;
  sceneLabel: string;
  intimacy: number;
}): string {
  const first = params.characterName.split(" ")[0];
  if (params.intimacy >= 75) {
    return `${first}'s pulse races in the ${params.sceneLabel.toLowerCase()}—feeling bold in ${params.outfitLabel.toLowerCase()} and craving your next move.`;
  }
  if (params.moodLabel.toLowerCase().includes("shy")) {
    return `Trying to stay composed in ${params.outfitLabel.toLowerCase()}, though every word from you makes her blush deeper.`;
  }
  if (params.moodLabel.toLowerCase().includes("dominant")) {
    return `Watching your every reaction in the ${params.sceneLabel.toLowerCase()}, enjoying having complete control of the tempo.`;
  }
  return `Savoring the tension in the ${params.sceneLabel.toLowerCase()}, wondering how soon you'll ask for more than just words.`;
}

/** Parse optional [Inner Thought: ...] prefix from an AI reply */
export function splitInnerThoughtAndReply(rawReply: string): {
  innerThought: string | null;
  spokenReply: string;
} {
  const match = rawReply.match(/^\s*\[(?:Inner Thought|Thought|Thinking):\s*([^\]]+)\]\s*([\s\S]*)$/i);
  if (match) {
    return {
      innerThought: match[1].trim(),
      spokenReply: match[2].trim() || rawReply,
    };
  }
  return {
    innerThought: null,
    spokenReply: rawReply.trim(),
  };
}

export function loadMemories(characterId: string): MemoryNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${MEMORY_STORAGE_PREFIX}${characterId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemories(characterId: string, memories: MemoryNode[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${MEMORY_STORAGE_PREFIX}${characterId}`, JSON.stringify(memories.slice(0, 25)));
  } catch {
    /* ignore */
  }
}

export function loadRoleplayContext(characterId: string): {
  outfitId: string;
  sceneId: string;
  showInnerThoughts: boolean;
} {
  if (typeof window === "undefined") {
    return { outfitId: "sheer-lace", sceneId: "penthouse-bed", showInnerThoughts: true };
  }
  try {
    const raw = localStorage.getItem(`${RP_CONTEXT_PREFIX}${characterId}`);
    if (!raw) return { outfitId: "sheer-lace", sceneId: "penthouse-bed", showInnerThoughts: true };
    const parsed = JSON.parse(raw);
    return {
      outfitId: typeof parsed.outfitId === "string" ? parsed.outfitId : "sheer-lace",
      sceneId: typeof parsed.sceneId === "string" ? parsed.sceneId : "penthouse-bed",
      showInnerThoughts: typeof parsed.showInnerThoughts === "boolean" ? parsed.showInnerThoughts : true,
    };
  } catch {
    return { outfitId: "sheer-lace", sceneId: "penthouse-bed", showInnerThoughts: true };
  }
}

export function saveRoleplayContext(
  characterId: string,
  ctx: { outfitId: string; sceneId: string; showInnerThoughts: boolean },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${RP_CONTEXT_PREFIX}${characterId}`, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}
