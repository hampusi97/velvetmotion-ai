/** Portable V2/V3 JSON cards. No chat history, user memory, API keys or remote fetches. */
import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";
import { normalizeLorebook, type LorebookEntry } from "./lorebook";
import { safeCompanionAvatarUrl } from "./avatarOptimize";
import { discoveryFor } from "./companionDiscovery";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function exportCharacterCard(
  character: Character,
  version: "v2" | "v3",
  lorebook: LorebookEntry[] = [],
) {
  if (
    !Number.isInteger(character.age) ||
    character.age < 18 ||
    character.age > 120
  )
    throw new Error("Only fictional adult character cards can be exported.");
  const guard = validateCharacterCompliance({
    ...character,
    backstory: character.background,
  });
  if (!guard.ok) throw new Error(guard.reason);
  const raw = record(character.cardData);
  const extensions = record(raw.extensions);
  const data: Record<string, unknown> = {
    ...raw,
    name: character.name,
    description: character.tagline,
    personality: character.personality,
    scenario: character.background,
    first_mes: character.initialMessage,
    mes_example: text(raw.mes_example),
    creator_notes: text(
      raw.creator_notes,
      "Original fictional adult companion. Exported from VelvetMotion.",
    ),
    system_prompt: text(raw.system_prompt),
    post_history_instructions: text(raw.post_history_instructions),
    alternate_greetings: strings(raw.alternate_greetings),
    tags: character.tags,
    creator: text(raw.creator),
    character_version: text(raw.character_version, "1.0"),
    extensions: {
      ...extensions,
      velvetmotion: {
        ...record(extensions.velvetmotion),
        age: character.age,
        category: character.category,
        voiceId: character.voiceId,
        voice: character.voice,
        traits: character.traits,
        visualDna: character.visualDna || character.figure,
        kink: character.kink,
        discovery: discoveryFor(character),
        // A local raster portrait travels with JSON without exposing a remote tracking URL.
        avatar: safeCompanionAvatarUrl(character.avatar) || "",
      },
    },
  };
  const originalBook = record(raw.character_book);
  if (lorebook.length || originalBook.entries) {
    const originals = Array.isArray(originalBook.entries)
      ? originalBook.entries.map(record)
      : [];
    data.character_book = {
      ...originalBook,
      extensions: record(originalBook.extensions),
      entries: [
        ...normalizeLorebook(lorebook).map((entry, index) => {
          const original =
            originals.find((e) => String(e.id) === entry.id) || {};
          return {
            ...original,
            keys: entry.keys,
            content: entry.content,
            enabled: entry.enabled,
            constant: entry.constant,
            insertion_order: entry.order,
            id: typeof original.id === "number" ? original.id : index,
            extensions: record(original.extensions),
          };
        }),
        ...originals.filter((entry) => entry.enabled === false),
      ],
    };
  }
  if (version === "v3") {
    data.group_only_greetings = strings(raw.group_only_greetings);
    data.modification_date = Math.floor(Date.now() / 1000);
  } else {
    for (const key of [
      "group_only_greetings",
      "assets",
      "nickname",
      "creator_notes_multilingual",
      "source",
      "creation_date",
      "modification_date",
    ])
      delete data[key];
  }
  return {
    spec: version === "v3" ? "chara_card_v3" : "chara_card_v2",
    spec_version: version === "v3" ? "3.0" : "2.0",
    data,
  };
}
