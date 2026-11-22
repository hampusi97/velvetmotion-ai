export const KEYS = {
  rel: (id: string) => `velvet:rel:${id}`,
  chastity: (id: string) => `velvet:chastity:${id}`,
  tribute: (id: string) => `velvet:tributes:${id}`,
  verify: (id: string) => `velvet:verify:${id}`,
  photoBudget: (id: string) => `velvet:photobudget:${id}`,
  kinkLegacy: (id: string) => `velvet:kink:${id}`,
  global: "velvet:global",
  edgeLock: "velvet:edgelock",
  migrated: "velvet:migrated:v1",
} as const;

/** Legacy keys, read once by the migration and then deleted. */
export const LEGACY = {
  goonStreak: "vm-goon-streak",
  goonLastDate: "vm-goon-last-date",
  goonMinutes: "vm-goon-total-minutes",
  goonSessions: "vm-goon-sessions",
  goonMaxIntensity: "vm-goon-max-intensity",
  freeDual: "vm-free-dual",
  edgeStreak: "vm-edge-streak",
  edgeLast: "vm-edge-last",
  edgeLock: "vm-edge-lock",
} as const;
