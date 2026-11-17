export type Gift = {
  id: string;
  name: string;
  cost: number;
  tag: string;
  line: string; // she remembers this
};

export const GIFTS: Gift[] = [
  { id: "roses", name: "Roses", cost: 20, tag: "romantic", line: "You sent her roses. She brings them up when she's soft." },
  { id: "lingerie", name: "Lingerie set", cost: 35, tag: "sexy", line: "You bought her lingerie. She offers to model it." },
  { id: "vibrator", name: "Toy", cost: 50, tag: "explicit", line: "You gifted her a toy. She teases using it on call." },
  { id: "wine", name: "Wine", cost: 25, tag: "sensual", line: "You sent wine. Slow nights, slower hands." },
  { id: "collar", name: "Collar", cost: 55, tag: "protocol", line: "You gave her a collar. Protocol mode unlocks." },
  { id: "hotel", name: "Hotel key", cost: 70, tag: "fantasy", line: "You booked a night. She plans the room." },
  { id: "blindfold", name: "Silk blindfold", cost: 30, tag: "sensation", line: "You sent a blindfold. She wants to control what you see." },
  { id: "plug", name: "Plug", cost: 45, tag: "explicit", line: "You gifted a plug. She says she'll wear it under her clothes." },
  { id: "cuffs", name: "Soft cuffs", cost: 40, tag: "restraint", line: "You sent cuffs. She asks who gets locked first." },
  { id: "perfume", name: "Perfume", cost: 28, tag: "sensual", line: "You picked her scent. She sprays it before every session." },
];

const KEY = "vm-gifts-";

export function getGiftsFor(characterId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY + characterId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addGift(characterId: string, giftId: string) {
  const next = Array.from(new Set([...getGiftsFor(characterId), giftId]));
  try {
    localStorage.setItem(KEY + characterId, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}
