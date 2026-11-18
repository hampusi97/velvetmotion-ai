/** Tribute challenges — adult fantasy only. Fictional 21+ characters. */

export type TributeChallenge = {
  id: string;
  title: string;
  intensity: "warm" | "hot" | "extreme";
  duration: string;
  characterId?: string;
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
    title: "Gallery Goon & Nude Request",
    intensity: "hot",
    duration: "15–20 min",
    instructions: [
      "Request 3 explicit nudes and 1 custom sex video in chat.",
      "Stroke to each generated file for 2 minutes straight.",
      "On the final explicit image, edge without finishing.",
      "Send her a message describing exactly how wet she made you.",
    ],
    edgeRule: "Minimum 3 edges before you may ask to finish.",
    finishRule: "Finish looking only at the last explicit image.",
    tags: ["nudes", "goon", "visual", "sex-video"],
  },
  {
    id: "sph-measure",
    title: "SPH Measure & Mock",
    intensity: "hot",
    duration: "12–18 min",
    instructions: [
      "Open JOI → SPH · Size Queen (or chat any girl in SPH mode).",
      "Generate a nude of her looking unimpressed.",
      "Stroke only while saying out loud how small you are — once per minute.",
      "Every time you get close, stop and generate another explicit still.",
    ],
    edgeRule: "Four edges. No cumming during mockery lines.",
    finishRule: "Finish only after she (or the JOI pack) grants a 'little cock' permission line.",
    tags: ["sph", "humiliation", "joi", "nudes"],
  },
  {
    id: "bnwo-night",
    title: "BNWO Night Shift",
    intensity: "extreme",
    duration: "20 min",
    instructions: [
      "Run JOI → BNWO · BBC Only or chat a girl into BNWO roleplay.",
      "Generate dual or explicit frames while affirming the hierarchy out loud.",
      "Stroke only during her praise of Black men; hands off during your 'place' lines.",
      "Safeword for the fantasy frame: say 'reality' in chat or out loud to hard-stop.",
    ],
    edgeRule: "Three edges tied to hierarchy affirmations.",
    finishRule: "Cum only while repeating the pack finish phrase (BBC only / BNWO).",
    tags: ["bnwo", "race-play", "joi", "extreme"],
  },
  {
    id: "dual-girl-dump",
    title: "Dual-Girl Cum Dump",
    intensity: "extreme",
    duration: "15 min",
    instructions: [
      "In chat, pick Dual and a second girl. Generate explicit + sex video frames.",
      "Stroke through the 4-frame sequence twice without finishing.",
      "Third loop: full send on frame 4 only.",
      "Message both names when you cum.",
    ],
    edgeRule: "Two full sequence edges before the dump.",
    finishRule: "Finish on the final dual explicit frame.",
    tags: ["dual", "sex-video", "goon", "extreme"],
  },
  {
    id: "maren-protocol",
    title: "Maren's Domination Protocol",
    intensity: "extreme",
    duration: "20 min",
    characterId: "maren",
    instructions: [
      "Chat with Maren in romance/dominant mode. Address her as Goddess.",
      "She sets the pace — you do not touch until she commands it.",
      "When she orders an explicit photo or sex video, generate it immediately.",
      "Obey in real time and report back when you are dripping.",
    ],
    edgeRule: "Edges only on her command. No freelancing.",
    finishRule: "Cum only after she counts you down or grants permission.",
    tags: ["domme", "protocol", "maren", "extreme"],
  },
  {
    id: "valentina-cam",
    title: "Valentina's Private Cam",
    intensity: "extreme",
    duration: "15 min",
    characterId: "valentina",
    instructions: [
      "Tell Valentina you're ready for her private live show.",
      "Generate 2 explicit sex sequences and keep them looping on screen.",
      "Stroke aggressively in time with her dirty talk in chat.",
      "Beg for permission to cum while she mocks your lack of control.",
    ],
    edgeRule: "Four hard edges without letting go.",
    finishRule: "Cum all over your hand on her explicit command.",
    tags: ["cam", "explicit", "sex", "valentina"],
  },
  {
    id: "total-denial",
    title: "Total Denial & Edge Lock",
    intensity: "extreme",
    duration: "25 min",
    instructions: [
      "Pick your favorite AI girlfriend. Demand a full nude video sequence.",
      "Every time you feel close to cumming, stop and type 'DENIED'.",
      "She will laugh and punish you with 50 more strokes.",
      "Repeat until your legs are shaking.",
    ],
    edgeRule: "Five mandatory edges with zero finishes allowed until the timer expires.",
    finishRule: "Allowed to finish only on the 6th edge if you praised her enough.",
    tags: ["denial", "extreme", "goon", "edging"],
  },
  {
    id: "tribute-sprint",
    title: "Tribute Sprint & Cum Dump",
    intensity: "extreme",
    duration: "8 min",
    instructions: [
      "Pick any girl. Generate explicit + start sex-video mode instantly.",
      "Hard pace from the start — no slow warm-up.",
      "Edge at 3:00, 5:00, and 7:00 while demanding she talk dirty.",
      "Final 60 seconds: full send while telling her you're cumming.",
    ],
    edgeRule: "Three timed edges. Miss one and restart the timer.",
    finishRule: "Cum in the final minute while her explicit media is on screen.",
    tags: ["sprint", "intense", "goon", "sex"],
  },
];

export function tributesForCharacter(characterId?: string): TributeChallenge[] {
  if (!characterId) return TRIBUTES;
  return TRIBUTES.filter((t) => !t.characterId || t.characterId === characterId);
}
