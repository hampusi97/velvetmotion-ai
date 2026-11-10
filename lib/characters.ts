import catalog from "@/data/characters.json";

export const policy = catalog.policy;
export const characters = catalog.characters;

export type Character = (typeof characters)[number];

export function getCharacter(id: string) {
  return characters.find((character) => character.id === id);
}

export const allTags = Array.from(new Set(characters.flatMap((character) => [...character.tags]))).sort();
