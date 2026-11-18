/** Weekly featured dual-girl pair for home banner. */

const PAIRS = [
  { aId: "tess", bId: "calla", aName: "Tess", bName: "Calla", label: "Tess × Calla tonight", dualDiscount: 25 },
  { aId: "nova", bId: "jade", aName: "Nova", bName: "Jade", label: "Nova × Jade — late stream", dualDiscount: 20 },
  { aId: "liora", bId: "wren", aName: "Liora", bName: "Wren", label: "Shy girls night", dualDiscount: 30 },
  { aId: "maren", bId: "dahlia", aName: "Maren", bName: "Dahlia", label: "Dominant pairing", dualDiscount: 20 },
  { aId: "priya", bId: "sofia", aName: "Priya", bName: "Sofia", label: "Priya × Sofia heat", dualDiscount: 25 },
  { aId: "yuki", bId: "mila", aName: "Yuki", bName: "Mila", label: "Soft + secret", dualDiscount: 30 },
];

export function getFeaturedPair() {
  // Rotate by day of year so it changes daily without a backend
  const day = Math.floor(Date.now() / 86400000);
  return PAIRS[day % PAIRS.length];
}
