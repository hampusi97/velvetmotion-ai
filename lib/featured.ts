/** Weekly featured dual-girl pair for home banner. */

import { CHARACTERS } from "@/lib/characters";

export function getFeaturedPair(): {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  label: string;
  dualDiscount: number;
} {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const a = CHARACTERS[week % CHARACTERS.length];
  const b = CHARACTERS[(week + 3) % CHARACTERS.length];
  return {
    aId: a.id,
    bId: b.id,
    aName: a.name.split(" ")[0],
    bName: b.name.split(" ")[0],
    label: `${a.name.split(" ")[0]} × ${b.name.split(" ")[0]} tonight`,
    dualDiscount: 50, // percent off dual gen when featured
  };
}
