import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";

export const COMPANION_LIBRARY_EVENT = "vm:companion-library-updated";
export const COMPANION_STORAGE_KEYS = [
  "velvet-custom-girls",
  "vm-custom-girls",
  "vm-imported-cards",
] as const;
const FAVORITES_KEY = "vm:favorite-companions";

/** Stored cards are untrusted: skip malformed records before rendering or chatting. */
export function isStoredCompanion(value: unknown): value is Character {
  if (!value || typeof value !== "object") return false;
  const c = value as Character;
  return (
    [
      "id",
      "name",
      "tagline",
      "category",
      "avatar",
      "voiceIntro",
      "initialMessage",
      "personality",
      "background",
      "figure",
      "kink",
      "reply",
    ].every(
      (key) =>
        typeof (c as unknown as Record<string, unknown>)[key] === "string",
    ) &&
    !!c.id.trim() &&
    !!c.name.trim() &&
    Number.isFinite(c.intimacy) &&
    Number.isInteger(c.age) &&
    c.age >= 18 &&
    c.age <= 120 &&
    [c.tags, c.traits].every(
      (items) =>
        Array.isArray(items) && items.every((item) => typeof item === "string"),
    ) &&
    !!c.voice &&
    typeof c.voice.label === "string" &&
    typeof c.voice.style === "string" &&
    Number.isFinite(c.voice.pitch) &&
    Number.isFinite(c.voice.rate)
  );
}

export function loadSavedCompanions(): Character[] {
  if (typeof window === "undefined") return [];
  const found = new Map<string, Character>();
  for (const key of COMPANION_STORAGE_KEYS) {
    try {
      const values: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        if (isStoredCompanion(value) && !found.has(value.id))
          found.set(value.id, value);
      }
    } catch {
      /* One damaged collection must not hide the others. */
    }
  }
  return [...found.values()];
}

export function notifyCompanionLibrary(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(COMPANION_LIBRARY_EVENT));
}

/** Keep the ID stable so existing chat, lorebooks and memories survive edits. */
export function saveCompanionCustomization(character: Character): void {
  if (!isStoredCompanion(character))
    throw new Error("Enter a complete fictional adult character profile.");
  const guard = validateCharacterCompliance({
    ...character,
    backstory: character.background,
  });
  if (!guard.ok) throw new Error(guard.reason);
  if (typeof window === "undefined")
    throw new Error("Saving needs browser storage.");
  // Do not discard existing records or silently evict another companion on quota failure.
  const raw: unknown = JSON.parse(
    localStorage.getItem(COMPANION_STORAGE_KEYS[0]) || "[]",
  );
  if (!Array.isArray(raw))
    throw new Error(
      "Your character collection could not be read. Back it up before editing.",
    );
  const next = [
    character,
    ...raw.filter((c) => !c || typeof c !== "object" || c.id !== character.id),
  ];
  localStorage.setItem(COMPANION_STORAGE_KEYS[0], JSON.stringify(next));
  notifyCompanionLibrary();
}

export function loadFavoriteCompanions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]",
    );
    return Array.isArray(raw)
      ? [
          ...new Set(
            raw.filter((id): id is string => typeof id === "string" && !!id),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteCompanion(id: string): string[] {
  const previous = loadFavoriteCompanions();
  const next = previous.includes(id)
    ? previous.filter((value) => value !== id)
    : [...previous, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  notifyCompanionLibrary();
  return next;
}
