export type Gift = {
  id: string;
  name: string;
  cost: number;
  tag: string;
  line: string; // she remembers this
};

export const GIFTS: Gift[] = [
  { id: "roses", name: "Roses", cost: 25, tag: "romantic", line: "You sent her roses. She brings them up when she's soft." },
  { id: "lingerie", name: "Lingerie set", cost: 40, tag: "sexy", line: "You bought her lingerie. She offers to model it." },
  { id: "vibrator", name: "Toy", cost: 55, tag: "explicit", line: "You gifted her a toy. She teases using it on call." },
  { id: "wine", name: "Wine", cost: 30, tag: "sensual", line: "You sent wine. Slow nights, slower hands." },
  { id: "collar", name: "Collar", cost: 60, tag: "protocol", line: "You gave her a collar. Protocol mode unlocks." },
  { id: "hotel", name: "Hotel key", cost: 80, tag: "fantasy", line: "You booked a night. She plans the room." },
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
