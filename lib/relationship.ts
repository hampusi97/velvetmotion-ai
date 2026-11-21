/** Relationship stages — Stranger → Soulmate + re-exports from `lib/relationshipState`. */
export * from "./relationshipState";

export type RelationshipStage =
  | "stranger"
  | "acquaintance"
  | "friend"
  | "close"
  | "romantic"
  | "dating"
  | "committed"
  | "soulmate";

export const STAGES: { id: RelationshipStage; label: string; minIntimacy: number }[] = [
  { id: "stranger", label: "Stranger", minIntimacy: 0 },
  { id: "acquaintance", label: "Acquaintance", minIntimacy: 15 },
  { id: "friend", label: "Friend", minIntimacy: 30 },
  { id: "close", label: "Close Friend", minIntimacy: 45 },
  { id: "romantic", label: "Romantic Interest", minIntimacy: 55 },
  { id: "dating", label: "Dating", minIntimacy: 70 },
  { id: "committed", label: "Committed", minIntimacy: 85 },
  { id: "soulmate", label: "Soulmate", minIntimacy: 95 },
];

export function stageFromIntimacy(intimacy: number): (typeof STAGES)[number] {
  let current = STAGES[0];
  for (const s of STAGES) {
    if (intimacy >= s.minIntimacy) current = s;
  }
  return current;
}

export function nextStage(intimacy: number): (typeof STAGES)[number] | null {
  const idx = STAGES.findIndex((s) => s.minIntimacy > intimacy);
  return idx >= 0 ? STAGES[idx] : null;
}
