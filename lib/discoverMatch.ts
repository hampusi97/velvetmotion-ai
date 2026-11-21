/**
 * Discover match progression utilities.
 * Rewards are granted only for a companion's first confirmed match.
 * Rewinding or reshuffling the card deck never resets persisted reward eligibility.
 */
export function canonicalMatchId(id: string): string {
  return id.replace(/^secret-/, "");
}

export function mergeMatchIds(...groups: readonly string[][]): string[] {
  return Array.from(new Set(groups.flat().map(canonicalMatchId).filter(Boolean)));
}

export function firstTimeMatch(matchedIds: ReadonlySet<string>, cardId: string): boolean {
  return !matchedIds.has(canonicalMatchId(cardId));
}

/** Fisher–Yates, returning a new array. Guarantees changed order when cards have distinct IDs. */
export function reshuffleDiscoverCards<T extends { id: string }>(
  cards: readonly T[],
  random: () => number = Math.random,
): T[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i--) {
    const n = random();
    const j = Math.floor(Math.max(0, Math.min(0.999999999, Number.isFinite(n) ? n : 0)) * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next.length > 1 && next.every((item,i)=>item.id===cards[i].id)) {
    [next[0],next[1]]=[next[1],next[0]];
  }
  return next;
}

export function previousSwipeIndex(index: number): number {
  return Math.max(0,Math.floor(index)-1);
}
