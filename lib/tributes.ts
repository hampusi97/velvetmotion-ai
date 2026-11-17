/** Tribute challenges — adult fantasy only. Fictional 21+ characters. */

export type TributeChallenge = {
  id: string;
  title: string;
  intensity: "warm" | "hot" | "extreme";
  duration: string;
  characterId?: string; // optional lock to one girl
  instructions: string[];
  edgeRule: string;
  finishRule: string;
  tags: string[];
};

export const TRIBUTES: TributeChallenge[] = [
  {
    id: "slow-burn",
    title: "Slow Burn Tribute",
    intensity: "warm",
    duration: "10–15 min",
    instructions: [
      "Open her profile and generate a lingerie or nude portrait.",
      "Stroke only while reading her messages out loud.",
      "Stop completely every time she asks a question — answer before you continue.",
      "No finishing until she says you earned it in chat.",
    ],
    edgeRule: "Edge twice. Hold 10 seconds each. Hands off between edges.",
    finishRule: "Cum only after she gives explicit permission in the chat.",
    tags: ["tease", "control", "beginner"],
  },
  {
    id: "gallery-goon",
    title: "Gallery Goon",
    intensity: "hot",
    duration: "15–20 min",
    instructions: [
      "Generate 3 nudes of the same girl (different poses).",
      "Stroke to each image for 2 minutes, then switch.",
      "On the third image, edge without finishing.",
      "Send her a message describing which pose ruined you.",
    ],
    edgeRule: "Minimum 3 edges before you may ask to finish.",
    finishRule: "Finish looking only at the last generated image.",
    tags: ["nudes", "goon", "visual"],
  },
  {
    id: "maren-protocol",
    title: "Maren's Protocol",
    intensity: "extreme",
    duration: "20 min",
    characterId: "maren",
    instructions: [
      "Chat with Maren. Address her by name every message.",
      "She sets the pace — you do not touch until she says so.",
      "When she gives an order, obey in real time and report back.",
      "Generate an explicit image only when she allows it.",
    ],
    edgeRule: "Edges only on her command. No freelancing.",
    finishRule: "Cum only after she counts you down or grants permission.",
    tags: ["domme", "protocol", "maren"],
  },
  {
    id: "tess-edge",
    title: "Tess Edge Clock",
    intensity: "hot",
    duration: "12 min",
    characterId: "tess",
    instructions: [
      "Tell Tess you want to play her edge game.",
      "Stroke in time with her teasing — stop when she says stop.",
      "You may beg once. She decides if it works.",
      "Generate a sex-video sequence mid-session for visual fuel.",
    ],
    edgeRule: "At least 4 edges. No cumming on an edge.",
    finishRule: "Finish only when Tess counts you down in chat.",
    tags: ["edging", "tease", "tess"],
  },
  {
    id: "calla-watch",
    title: "Calla's Watch Me",
    intensity: "hot",
    duration: "10 min",
    characterId: "calla",
    instructions: [
      "Generate an exhibition-style nude of Calla.",
      "Hands on your knees until she says you may touch.",
      "Stroke only while describing what you see in chat.",
      "She decides when your eyes and hands are allowed more.",
    ],
    edgeRule: "One long edge while she watches (in role).",
    finishRule: "Cum with eyes on her image when she allows touch.",
    tags: ["exhibition", "calla", "voyeur"],
  },
  {
    id: "tribute-sprint",
    title: "Tribute Sprint",
    intensity: "extreme",
    duration: "8 min",
    instructions: [
      "Pick any girl. Generate explicit + start sex-video mode.",
      "Hard pace from the start — no slow warm-up.",
      "Edge at 3:00, 5:00, and 7:00.",
      "Final 60 seconds: full send while telling her you're close.",
    ],
    edgeRule: "Three timed edges. Miss one and restart the timer.",
    finishRule: "Cum in the final minute while her media is on screen.",
    tags: ["sprint", "intense", "goon"],
  },
];

export function tributesForCharacter(characterId?: string): TributeChallenge[] {
  if (!characterId) return TRIBUTES;
  return TRIBUTES.filter((t) => !t.characterId || t.characterId === characterId);
}
