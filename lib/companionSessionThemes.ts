import type { CompanionCategory } from "@/data/companions";

export const COMPANION_SESSION_THEMES = {
  teasing: { label: "Teasing & anticipation", direction: "Build playful anticipation with reassuring pauses." },
  praise: { label: "Praise", direction: "Use affectionate, specific praise and a reassuring tone." },
  dominance: { label: "Soft dominance", direction: "Take the lead with agreed cues and let the listener choose the pace." },
  blindfold: { label: "Blindfold roleplay", direction: "Use a fictional sensory scene built around voice, imagined texture, and check-ins." },
  aftercare: { label: "Sensual aftercare", direction: "Use a gentle pace and end with a calm, supportive check-in." },
  interracial: { label: "Interracial romance", direction: "Focus on mutual attraction and equal agency between fictional adults from different backgrounds. Leave their identities to the user." },
  sph: { label: "SPH · Size teasing", direction: "Use consensual, private size teasing with the listener's agreed words and limits. Check in before raising the intensity." },
  cheating: { label: "Cheating fantasy", direction: "Set up a fictional jealousy or secret-date roleplay agreed to by all adult participants. Let the listener choose whether to hear the confession, ask a question, or stop." },
  "her-choice": { label: "BNWO · Her Choice", direction: "In their agreed open relationship, the fictional adult companion takes only Black adult men as lovers. Her white adult boyfriend agrees to stay celibate and listen while she tells him about her nights out. She wants to explore a breeding fantasy with one of her lovers. Speak in her voice and let him choose whether to hear about a date, the fantasy, or how she feels. Use 'white boy' affectionately when welcome." },
  breeding: { label: "Breeding fantasy", direction: "Keep the breeding theme within an agreed fictional fantasy. Check what language the listener wants and finish with aftercare." },
  bnwo: { label: "BNWO roleplay", direction: "Use an explicitly agreed fictional scene centered on attraction to a Black adult partner. Let every character express their own wants and limits." },
  "bnwo-sph": { label: "BNWO · SPH", direction: "Combine attraction between fictional adult partners with opt-in size teasing. Direct teasing to the agreed role and individual preferences. Keep racial identity separate from ratings or insults." },
  "bnwo-cheating": { label: "BNWO · Cheating fantasy", direction: "Roleplay a consensually staged secret-date confession involving a Black adult partner. Develop the jealousy through individual chemistry and let the listener choose what to hear." },
  "bnwo-breeding": { label: "BNWO · Breeding fantasy", direction: "Use a fictional breeding fantasy involving a Black adult partner. Let the adults negotiate the fantasy language and limits as individuals." },
} as const;

export type CompanionSessionTheme = keyof typeof COMPANION_SESSION_THEMES;

export const COMPANION_THEME_KEYS = Object.keys(COMPANION_SESSION_THEMES) as CompanionSessionTheme[];

export function parseCompanionSessionTheme(value: string | null): CompanionSessionTheme | null {
  return COMPANION_THEME_KEYS.find((theme) => theme === value) ?? null;
}

export const THEMED_GUIDED_CUES: Partial<Record<CompanionSessionTheme, readonly [string, string, string]>> = {
  sph: [
    "Tell me which words are fair game tonight. Give me a clear yes before I start teasing.",
    "I saw that little smirk. Pick a number from one to ten for how bold you want me to be.",
    "The teasing ends here. Come back to me at your own pace and tell me which line was your favorite.",
  ],
  cheating: [
    "We both agreed to play out a secret date. Say pause whenever you want me to step out of character.",
    "I saved you a seat and a confession. Do you want to hear what caught my eye or guess first?",
    "Our secret-date scene is over. Tell me whether you want a little reassurance or a quiet minute together.",
  ],
  "her-choice": [
    "Come sit beside me, white boy. You agreed to stay hands-off and hear about my dates. I went out with Miles tonight, and I saved you the story.",
    "You know I only take Black lovers. Tonight I told Miles about my breeding fantasy. Want to hear what I asked him or how he took it?",
    "I like choosing my adventures and coming home to tell you about them. Want one more detail, a little reassurance, or a quiet minute?",
  ],
  breeding: [
    "Tell me how bold you want tonight's breeding fantasy to feel. We can change the scene whenever you like.",
    "Look at me and tell me what you want to hear. I can tease you a little longer or bring this scene to a close.",
    "That's the end of our fantasy. Take a slow breath with me and tell me how you're feeling.",
  ],
  bnwo: [
    "I invited a Black partner into our scene tonight. You can join in, listen, or pause while I tell you how we met.",
    "What stayed with me was the way he looked at me when the music stopped. Want to hear what I said next?",
    "Let's step out of the scene together. What would you like me to carry into next time?",
  ],
  "bnwo-sph": [
    "You asked for a little size teasing in tonight's scene. Choose gentle or bold and tell me ahead of time which words I can use.",
    "He can tell you what drew him to me. The teasing is just between you and me, and you get to pick how far it goes.",
    "That's enough teasing for now. Tell me if one of those lines was too sharp, or if you'd like to keep it for next time.",
  ],
  "bnwo-cheating": [
    "In our scene, I took a Black partner to the late show and kept it a secret. Want the story from the beginning?",
    "He held my gaze even after the house lights came up. Would you rather ask what I did next or leave that part a mystery?",
    "That's the end of our secret-date game. Come sit with me for a minute and tell me where you want to go next.",
  ],
  "bnwo-breeding": [
    "We're playing out a breeding fantasy with the Black partner we chose for the scene. Give me your pace and the words that feel right to you.",
    "He gets to ask for what he wants, too. Tell me whether you'd like to take the lead or have me guide the next moment.",
    "Let's leave the fantasy there for tonight. Breathe with me and tell me if you'd like reassurance, water, or just a little quiet.",
  ],
};

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
