/**
 * Import SillyTavern V1/V2 character cards (JSON) and OpenChara-style packs
 * into VelvetMotion Character objects.
 */

import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";

type STCard = {
  name?: string;
  char_name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  character_book?: unknown;
  data?: STCard; // V2 nested
  avatar?: string;
  creator?: string;
};

function hashId(name: string): string {
  let h = 0;
  const s = name.toLowerCase();
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `st-${Math.abs(h).toString(36)}`;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\{\{[^}]+\}\}/g, "").replace(/\s+/g, " ").trim();
}

export function parseSillyTavernCard(raw: unknown): Character | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as STCard;
  const card = root.data && typeof root.data === "object" ? { ...root, ...root.data } : root;

  const name = stripHtml(card.name || card.char_name || "");
  if (!name) return null;

  const personality = stripHtml(
    [card.personality, card.description, card.system_prompt].filter(Boolean).join(" "),
  ).slice(0, 1200);
  const scenario = stripHtml(card.scenario || card.creator_notes || "").slice(0, 600);
  const first = stripHtml(card.first_mes || `Hi… I'm ${name}.`).slice(0, 800);
  const tags = Array.isArray(card.tags)
    ? card.tags.map(String).slice(0, 12)
    : ["Imported", "SillyTavern"];

  const ext = (card as STCard & { extensions?: { velvetmotion?: { age?: unknown } } }).extensions?.velvetmotion;
  const explicitAge = ext?.age;
  const ageMatch = [personality, scenario, card.description || ""].join(" ").match(/\b(\d{1,3})\s*(?:years?\s*old|yo|yrs?)\b/i);
  const age = explicitAge !== undefined ? Number(explicitAge) : ageMatch ? Number(ageMatch[1]) : 24;
  if (!Number.isInteger(age) || age < 18 || age > 120) return null;
  if (!validateCharacterCompliance({ name, age, personality, backstory: scenario, tagline: card.description || "" }).ok) return null;

  // Include the card persona so two different characters sharing a name do not overwrite one another.
  const id = hashId([name, personality, scenario, first].join("\\u241f"));

  const character: Character = {
    id,
    name,
    age,
    tagline: (scenario || personality).slice(0, 120) || "Imported companion",
    category: tags.includes("Dominant")
      ? "Dominant"
      : tags.includes("Shy")
        ? "Shy"
        : "Custom",
    avatar: typeof card.avatar === "string" && card.avatar.startsWith("http") ? card.avatar : "",
    voiceIntro: first.slice(0, 100),
    initialMessage: first || `*${name} looks at you.* “Hey…”`,
    tags: [...new Set(["Imported", "SillyTavern", ...tags])].slice(0, 12),
    intimacy: 45,
    voice: {
      label: "Imported",
      pitch: 1.05,
      rate: 0.95,
      style: "Natural conversational.",
    },
    personality: personality || `${name} is an adult fictional companion from a character card.`,
    traits: tags.slice(0, 5),
    background: scenario || `Imported card by ${card.creator || "unknown"}.`,
    figure:
      "Photoreal adult woman, detailed face consistent with character card, influencer aesthetic, beautiful",
    kink: stripHtml(card.post_history_instructions || "Roleplay as written in the card.").slice(
      0,
      300,
    ),
    reply: `*${name} stays in character.* “Tell me more.”`,
  };

  return character;
}

export function parseCardFileText(text: string): Character | null {
  try {
    const json = JSON.parse(text);
    // OpenChara / array packs
    if (Array.isArray(json)) {
      for (const item of json) {
        const c = parseSillyTavernCard(item);
        if (c) return c;
      }
      return null;
    }
    if (json.character) return parseSillyTavernCard(json.character);
    if (json.card) return parseSillyTavernCard(json.card);
    return parseSillyTavernCard(json);
  } catch {
    return null;
  }
}

const IMPORTED_KEY = "vm-imported-cards";

export function saveImportedCharacter(c: Character): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    const list: Character[] = raw ? JSON.parse(raw) : [];
    const next = [c, ...list.filter((x) => x.id !== c.id)].slice(0, 40);
    localStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function loadImportedCharacters(): Character[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
