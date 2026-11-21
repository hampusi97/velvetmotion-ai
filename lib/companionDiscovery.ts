import type { Character } from "./charactersTypes";

export const CONVERSATION_TYPES = [
  "Everyday",
  "Creative",
  "Reflective",
  "Romance",
  "Adventure",
] as const;
export const VISUAL_STYLES = [
  "Realistic",
  "Illustrated",
  "Anime",
  "Unspecified",
] as const;
export type CompanionDiscovery = {
  interests: string[];
  conversationTypes: string[];
  visualStyle: (typeof VISUAL_STYLES)[number];
};

export type CompanionLibraryFilters = {
  query: string;
  category: string;
  tag: string | null;
  interest: string;
  conversation: string;
  visualStyle: string;
  savedOnly: boolean;
  sort: "featured" | "name";
};

export const DEFAULT_COMPANION_LIBRARY_FILTERS: CompanionLibraryFilters = {
  query: "",
  category: "All",
  tag: null,
  interest: "",
  conversation: "",
  visualStyle: "",
  savedOnly: false,
  sort: "featured",
};

export const MAX_COMPANION_QUERY_LENGTH = 160;

function canonicalOption(value: string | null, options: readonly string[]) {
  const normalized = value?.trim().toLowerCase();
  return normalized && options.find((option) => option.toLowerCase() === normalized);
}

export function readCompanionLibraryFilters(
  params: URLSearchParams,
  options: { categories: readonly string[]; tags: readonly string[]; interests: readonly string[] },
): CompanionLibraryFilters {
  return {
    query: (params.get("q") || "").trim().slice(0, MAX_COMPANION_QUERY_LENGTH),
    category: canonicalOption(params.get("category"), options.categories) || "All",
    tag: canonicalOption(params.get("tag"), options.tags) || null,
    interest: canonicalOption(params.get("interest"), options.interests) || "",
    conversation: canonicalOption(params.get("conversation"), CONVERSATION_TYPES) || "",
    visualStyle: canonicalOption(params.get("style"), VISUAL_STYLES) || "",
    savedOnly: params.get("saved") === "1",
    sort: params.get("sort") === "name" ? "name" : "featured",
  };
}

export function writeCompanionLibraryFilters(params: URLSearchParams, filters: CompanionLibraryFilters) {
  const values = {
    q: filters.query.trim().slice(0, MAX_COMPANION_QUERY_LENGTH),
    category: filters.category === "All" ? "" : filters.category,
    tag: filters.tag,
    interest: filters.interest,
    conversation: filters.conversation,
    style: filters.visualStyle,
    saved: filters.savedOnly ? "1" : "",
    sort: filters.sort === "featured" ? "" : filters.sort,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
}

const INTERESTS: Record<string, RegExp> = {
  Art: /\b(art|artist|gallery|illustrat\w*)\b/i,
  Books: /\b(book\w*|literary|poet\w*|reading)\b/i,
  Music: /\b(music|jazz|piano|pianist|singer|dj|radio)\b/i,
  Games: /\b(game\w*|gaming|arcade|co-op)\b/i,
  Travel: /\b(travel|hiking|outdoor\w*|mountain\w*|adventure\w*)\b/i,
  Science: /\b(science|scientist|astronom\w*|space|robotics|engineer\w*)\b/i,
  Food: /\b(cook\w*|chef|food|baking|supper|restaurant)\b/i,
  Design: /\b(design\w*|fashion|architect\w*)\b/i,
};

export function discoveryFor(character: Character): CompanionDiscovery {
  const text = [
    character.category,
    character.tagline,
    character.personality,
    character.background,
    ...character.tags,
  ].join(" ");
  const supplied = character.discovery;
  const interests =
    supplied && Array.isArray(supplied.interests)
      ? supplied.interests
          .filter((v): v is string => typeof v === "string")
          .slice(0, 12)
      : Object.entries(INTERESTS)
          .filter(([, pattern]) => pattern.test(text))
          .map(([name]) => name);
  const conversationTypes =
    supplied && Array.isArray(supplied.conversationTypes)
      ? supplied.conversationTypes.filter((v) =>
          CONVERSATION_TYPES.includes(v as (typeof CONVERSATION_TYPES)[number]),
        )
      : [
          "Everyday",
          ...(/creative|artistic|inventive/i.test(text) ? ["Creative"] : []),
          ...(/intellectual|reflective|philosoph|thoughtful/i.test(text)
            ? ["Reflective"]
            : []),
          ...(/romantic|romance|sensual/i.test(text) ? ["Romance"] : []),
          ...(/adventur|travel|outdoor/i.test(text) ? ["Adventure"] : []),
        ];
  const visualStyle =
    supplied && VISUAL_STYLES.includes(supplied.visualStyle)
      ? supplied.visualStyle
      : /\banime\b/i.test(character.figure)
        ? "Anime"
        : /\bphotoreal/i.test(character.figure)
          ? "Realistic"
          : "Unspecified";
  return { interests, conversationTypes, visualStyle };
}

export function discoverCompanions(
  characters: Character[],
  filters: {
    query?: string;
    category?: string;
    tag?: string | null;
    interest?: string;
    conversation?: string;
    visualStyle?: string;
    favorites?: string[];
    savedOnly?: boolean;
    sort?: "featured" | "name";
  },
): Character[] {
  const words = (filters.query || "")
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const result = characters.filter((character) => {
    const meta = discoveryFor(character);
    const text = [
      character.name,
      character.tagline,
      character.personality,
      character.background,
      character.category,
      ...character.traits,
      ...character.tags,
      ...meta.interests,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!filters.category ||
        filters.category === "All" ||
        character.category === filters.category) &&
      (!filters.tag ||
        character.tags.some(
          (tag) => tag.toLocaleLowerCase() === filters.tag!.toLocaleLowerCase(),
        )) &&
      (!filters.interest || meta.interests.includes(filters.interest)) &&
      (!filters.conversation ||
        meta.conversationTypes.includes(filters.conversation)) &&
      (!filters.visualStyle || meta.visualStyle === filters.visualStyle) &&
      (!filters.savedOnly || filters.favorites?.includes(character.id)) &&
      words.every((word) => text.includes(word))
    );
  });
  return filters.sort === "name"
    ? result.sort((a, b) => a.name.localeCompare(b.name))
    : result;
}
