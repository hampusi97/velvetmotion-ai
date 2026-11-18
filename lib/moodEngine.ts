import type { Character } from "./charactersTypes";
import type { PortraitMood } from "./portraits";

export type MoodId =
  | "shy"
  | "curious"
  | "flirty"
  | "teasing"
  | "excited"
  | "devoted"
  | "dominant";

export interface MoodMessageSample {
  role: "user" | "assistant";
  content: string;
}

export interface MoodState {
  mood: MoodId;
  label: string;
  statusText: string;
  styleTag: string;
  intensity: number;
  durationSeconds: number;
  portraitMood: PortraitMood;
  responseStyle: string;
  ringClass: string;
  badgeClass: string;
  dotClass: string;
  auraColor: string;
  avatarFilter: string;
}

export interface MoodInput {
  character: Pick<Character, "id" | "name" | "category" | "intimacy" | "voice">;
  messages: MoodMessageSample[];
  durationSeconds: number;
  intimacy: number;
  romanceMode: boolean;
  giftCount?: number;
  periodicPhase?: number;
}

const HIGH_HEAT_WORDS = [
  "want",
  "need",
  "touch",
  "kiss",
  "bed",
  "close",
  "closer",
  "undress",
  "nude",
  "naked",
  "lingerie",
  "moan",
  "cum",
  "edge",
  "hard",
  "wet",
  "please",
  "straddle",
  "ride",
  "mouth",
  "lips",
  "skin",
  "hot",
  "crave",
  "obey",
  "kneel",
  "yours",
];

const SOFT_FLIRT_WORDS = [
  "beautiful",
  "gorgeous",
  "cute",
  "pretty",
  "blush",
  "smile",
  "miss",
  "love",
  "sweet",
  "tease",
  "stare",
  "wink",
  "warm",
  "hold",
  "gentle",
  "soft",
];

interface MoodPreset {
  label: string;
  statusLines: string[];
  styleTag: string;
  responseStyle: string;
  ringClass: string;
  badgeClass: string;
  dotClass: string;
  auraColor: string;
  avatarFilter: string;
}

const MOOD_PRESETS: Record<MoodId, MoodPreset> = {
  shy: {
    label: "Shy",
    statusLines: [
      "Blushing softly · glancing up",
      "Heart fluttering · shy smile",
      "Cheeks warm · hesitant but eager",
    ],
    styleTag: "Soft & blushing",
    responseStyle:
      "Speak softly with slight shy hesitation, warm ellipses, and self-conscious physical cues (tucking hair back, biting lip, glancing up through lashes).",
    ringClass: "ring-2 ring-rose-300/80 border-rose-200/70",
    badgeClass: "border-rose-300/40 bg-rose-400/15 text-rose-100",
    dotClass: "bg-rose-300",
    auraColor: "rgba(251, 113, 133, 0.35)",
    avatarFilter: "saturate(1.06) brightness(1.02) contrast(1.01)",
  },
  curious: {
    label: "Curious",
    statusLines: [
      "Studying you closely",
      "Intrigued · leaning in",
      "Reading every word you type",
    ],
    styleTag: "Attentive & intrigued",
    responseStyle:
      "Respond with observant curiosity, asking pointed follow-up questions while noticing small details in the user's tone.",
    ringClass: "ring-2 ring-sky-300/70 border-sky-200/60",
    badgeClass: "border-sky-400/35 bg-sky-500/15 text-sky-100",
    dotClass: "bg-sky-300",
    auraColor: "rgba(56, 189, 248, 0.28)",
    avatarFilter: "saturate(1.04) contrast(1.03)",
  },
  flirty: {
    label: "Flirty",
    statusLines: [
      "Flirty · biting her lip",
      "Playful grin · leaning closer",
      "Warming up fast · teasing you",
    ],
    styleTag: "Playful & seductive",
    responseStyle:
      "Use charged, playful banter, confident flirting, subtle double entendres, and tactile closeness.",
    ringClass: "ring-2 ring-pink-400/85 border-pink-300/75",
    badgeClass: "border-pink-400/45 bg-pink-500/20 text-pink-100",
    dotClass: "bg-pink-400",
    auraColor: "rgba(244, 114, 182, 0.42)",
    avatarFilter: "saturate(1.14) brightness(1.04) hue-rotate(-3deg)",
  },
  teasing: {
    label: "Teasing",
    statusLines: [
      "Teasing · making you wait",
      "Wicked smirk · pacing the heat",
      "Holding control of the tempo",
    ],
    styleTag: "Wicked & withholding",
    responseStyle:
      "Keep the tension high by playfully withholding, daring the user, and setting playful conditions before giving more.",
    ringClass: "ring-2 ring-fuchsia-400/85 border-fuchsia-300/75",
    badgeClass: "border-fuchsia-400/45 bg-fuchsia-500/20 text-fuchsia-100",
    dotClass: "bg-fuchsia-400",
    auraColor: "rgba(217, 70, 239, 0.44)",
    avatarFilter: "saturate(1.18) contrast(1.06)",
  },
  excited: {
    label: "Excited",
    statusLines: [
      "Excited · pulse racing",
      "Breathless · craving more",
      "Flushed & wide open for you",
    ],
    styleTag: "Breathless & intense",
    responseStyle:
      "Write with heightened urgency, shorter breathless sentences, vivid sensory heat, and eager desire for immediate escalation.",
    ringClass: "ring-2 ring-rose-500 border-pink-300",
    badgeClass: "border-rose-500/50 bg-rose-600/25 text-rose-100",
    dotClass: "bg-rose-400",
    auraColor: "rgba(244, 63, 94, 0.55)",
    avatarFilter: "saturate(1.24) brightness(1.06) contrast(1.06)",
  },
  devoted: {
    label: "Devoted",
    statusLines: [
      "Devoted · melted into you",
      "Soft gaze · completely yours",
      "Deeply attached · lingering close",
    ],
    styleTag: "Warm & devoted",
    responseStyle:
      "Lead with lush emotional warmth, unhurried sensual worship, eye contact, and intimate devotion.",
    ringClass: "ring-2 ring-amber-300/85 border-rose-300/75",
    badgeClass: "border-amber-400/45 bg-amber-500/15 text-amber-100",
    dotClass: "bg-amber-300",
    auraColor: "rgba(251, 191, 36, 0.38)",
    avatarFilter: "saturate(1.16) sepia(0.08) brightness(1.05)",
  },
  dominant: {
    label: "Commanding",
    statusLines: [
      "Commanding · expecting obedience",
      "Unhurried control · eyes on you",
      "Calling every move now",
    ],
    styleTag: "Crisp command",
    responseStyle:
      "Adopt an unhurried, commanding authority with concise directives, deliberate pauses, and expectation of obedience.",
    ringClass: "ring-2 ring-purple-400/90 border-fuchsia-300/80",
    badgeClass: "border-purple-400/50 bg-purple-600/25 text-purple-100",
    dotClass: "bg-purple-400",
    auraColor: "rgba(168, 85, 247, 0.48)",
    avatarFilter: "saturate(1.12) contrast(1.1)",
  },
};

export function calculateConversationIntensity(input: MoodInput): number {
  const { messages, durationSeconds, intimacy, romanceMode, giftCount = 0 } = input;
  const userMessages = messages.filter((m) => m.role === "user");
  const recentText = messages
    .slice(-5)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  let score = intimacy * 0.34;
  // Conversation turn momentum
  score += Math.min(26, userMessages.length * 5);
  // Conversation duration builds comfort and tension (+3 every 20 seconds, max +21)
  score += Math.min(21, Math.floor(Math.max(0, durationSeconds) / 20) * 3);
  // Gifts sent heighten attraction
  score += Math.min(12, giftCount * 4);
  if (romanceMode) score += 5;

  let heatHits = 0;
  for (const word of HIGH_HEAT_WORDS) {
    if (recentText.includes(word)) heatHits += 1;
  }
  score += Math.min(28, heatHits * 5);

  let softHits = 0;
  for (const word of SOFT_FLIRT_WORDS) {
    if (recentText.includes(word)) softHits += 1;
  }
  score += Math.min(14, softHits * 3);

  const exclamations = (recentText.match(/[!?]/g) || []).length;
  score += Math.min(8, exclamations * 2);

  return Math.max(12, Math.min(100, Math.round(score)));
}

function selectMoodId(
  input: MoodInput,
  intensity: number,
  phase: number,
): MoodId {
  const cat = input.character.category.toLowerCase();
  const recentUser =
    [...input.messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() || "";

  const isDominantType = cat.includes("dominant") || cat.includes("intense");
  const isShyType = cat.includes("shy");
  const isRomanticType = cat.includes("romantic") || cat.includes("nurturing") || input.romanceMode;

  if (/\b(obey|command|kneel|serve|punish|boss|control)\b/.test(recentUser) && (isDominantType || intensity >= 55)) {
    return "dominant";
  }
  if (/\b(blush|nervous|shy|slow|gentle|hold me)\b/.test(recentUser) && intensity < 75) {
    return isShyType ? "shy" : "devoted";
  }

  let pool: MoodId[];
  if (isDominantType) {
    if (intensity < 40) pool = ["curious", "teasing"];
    else if (intensity < 72) pool = ["teasing", "dominant", "flirty"];
    else pool = ["dominant", "excited", "teasing"];
  } else if (isShyType) {
    if (intensity < 42) pool = ["shy", "curious"];
    else if (intensity < 68) pool = ["shy", "flirty", "curious"];
    else pool = ["flirty", "excited", "devoted"];
  } else if (isRomanticType) {
    if (intensity < 40) pool = ["curious", "flirty"];
    else if (intensity < 70) pool = ["flirty", "devoted", "teasing"];
    else pool = ["devoted", "excited", "flirty"];
  } else {
    if (intensity < 38) pool = ["curious", "flirty"];
    else if (intensity < 68) pool = ["flirty", "teasing"];
    else pool = ["excited", "teasing", "flirty"];
  }

  return pool[Math.abs(phase) % pool.length];
}

function selectPortraitMood(mood: MoodId, intensity: number, intimacy: number): PortraitMood {
  if (intensity >= 82 && intimacy >= 60) return "explicit";
  if (intensity >= 74 && intimacy >= 40) return "nude";
  if (intensity >= 54 || mood === "teasing" || mood === "excited") return "lingerie";
  if (intensity >= 30 || mood === "flirty" || mood === "devoted" || mood === "dominant") {
    return "seductive";
  }
  return "beauty";
}

export function computeMoodState(input: MoodInput): MoodState {
  const intensity = calculateConversationIntensity(input);
  const periodicPhase =
    Math.floor(Math.max(0, input.durationSeconds) / 20) +
    (input.periodicPhase ?? 0) +
    input.messages.length;

  const mood = selectMoodId(input, intensity, periodicPhase);
  const preset = MOOD_PRESETS[mood];
  const statusText = `${preset.label} · ${preset.statusLines[Math.abs(periodicPhase) % preset.statusLines.length]}`;
  const portraitMood = selectPortraitMood(mood, intensity, input.intimacy);

  return {
    mood,
    label: preset.label,
    statusText,
    styleTag: preset.styleTag,
    intensity,
    durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
    portraitMood,
    responseStyle: preset.responseStyle,
    ringClass: preset.ringClass,
    badgeClass: preset.badgeClass,
    dotClass: preset.dotClass,
    auraColor: preset.auraColor,
    avatarFilter: preset.avatarFilter,
  };
}
