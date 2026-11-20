import type { CompanionCategory } from "@/data/companions";

export const COMPANION_SESSION_THEMES = {
  teasing: { label: "Teasing & anticipation", direction: "Build playful anticipation with reassuring pauses." },
  praise: { label: "Praise", direction: "Use affectionate, specific praise and a reassuring tone." },
  dominance: { label: "Soft dominance", direction: "Take the lead with agreed cues and let the listener choose the pace." },
  blindfold: { label: "Blindfold roleplay", direction: "Use a fictional sensory scene built around voice, imagined texture, and check-ins." },
  aftercare: { label: "Sensual aftercare", direction: "Use a gentle pace and end with a calm, supportive check-in." },
  interracial: { label: "Interracial romance", direction: "Focus on mutual attraction and equal agency between fictional adults from different backgrounds. Leave their identities to the user." },
} as const;

export type CompanionSessionTheme = keyof typeof COMPANION_SESSION_THEMES;

export const COMPANION_THEME_KEYS = Object.keys(COMPANION_SESSION_THEMES) as CompanionSessionTheme[];

const RECOMMENDED_THEMES: Record<CompanionCategory, readonly CompanionSessionTheme[]> = {
  Sweetheart: ["praise", "aftercare"],
  Luxury: ["dominance", "aftercare"],
  Athletic: ["teasing", "praise"],
  Cyberpunk: ["blindfold", "teasing"],
  Goth: ["blindfold", "dominance"],
  Anime: ["teasing", "praise"],
  Sorority: ["teasing", "praise"],
  "Family Drama": ["praise", "aftercare"],
};

export function recommendedCompanionThemes(category: CompanionCategory): readonly CompanionSessionTheme[] {
  return RECOMMENDED_THEMES[category];
}
