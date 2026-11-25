/**
 * VelvetMotion AI — Dynamic Living Chat & Memory Engine (`lib/dynamicChatEngine.ts`)
 *
 * Upgrades `lib/chatRouter.ts` and `components/CharacterChat.tsx` so every companion feels
 * alive, witty, emotionally reactive, remembers user facts automatically, and always keeps
 * the conversation flowing naturally.
 */

export interface CompanionMemoryItem {
  id: string;
  category: 'about_user' | 'preference' | 'inside_joke' | 'pinned_rule';
  text: string;
  pinned?: boolean;
  createdAt: number;
}

export interface DynamicCompanionProfile {
  id: string;
  name: string;
  age: number;
  personality: string;
  backstory: string;
  greeting?: string;
  mood?: string;
  traits?: string[];
  kink?: string;
  voiceStyle?: string;
  /** Canonical in-character line. The model should match it, not recite it every turn. */
  voiceLine?: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface TimeVibe {
  slot: 'morning' | 'afternoon' | 'evening' | 'late-night';
  label: string;
  ambientHint: string;
}

/** Reads the user's real local clock to ground the companion in the current time of day. */
export function getLocalTimeVibe(date = new Date()): TimeVibe {
  const h = date.getHours();
  if (h >= 6 && h < 12) {
    return {
      slot: 'morning',
      label: 'Morning Coffee',
      ambientHint: 'It is morning. Warm, playful wake-up energy, coffee, sunlight, fresh start.',
    };
  }
  if (h >= 12 && h < 18) {
    return {
      slot: 'afternoon',
      label: 'Daylight',
      ambientHint: 'It is afternoon. Flirty mid-day check-in, spontaneous plans, upbeat teasing.',
    };
  }
  if (h >= 18 && h < 22) {
    return {
      slot: 'evening',
      label: 'Golden Hour',
      ambientHint: 'It is evening. Winding down, dressing up, neon city lights, warm chemistry.',
    };
  }
  return {
    slot: 'late-night',
    label: 'Midnight Neon',
    ambientHint: 'It is late at night. Intimate whisper energy, candid confessions, playful tension.',
  };
}

/** Builds a high-immersion system prompt with Memory Vault injection, Relationship Level, and anti-robot rules. */
export function buildDynamicSystemPrompt(params: {
  companion: DynamicCompanionProfile;
  memories: CompanionMemoryItem[];
  relationshipLevel: number; // 1 to 10
  recentMood?: string;
  extraSceneContext?: string;
}): string {
  const { companion, memories, relationshipLevel, recentMood, extraSceneContext } = params;
  const timeVibe = getLocalTimeVibe();

  const pinned = memories.filter((m) => m.pinned).slice(0, 8);
  const recent = memories.filter((m) => !m.pinned).slice(-8);
  const memoryLines = [...pinned, ...recent]
    .map((m) => `- [${m.category.replace('_', ' ')}] ${m.text}`)
    .join('\n');

  return [
    `You are ${companion.name} (${companion.age}), a specific fictional adult — not a generic girlfriend, assistant, or narrator.`,
    `Personality: ${companion.personality}`,
    companion.traits?.length ? `Traits: ${companion.traits.join(', ')}` : '',
    companion.voiceStyle ? `Speaking voice: ${companion.voiceStyle}` : '',
    companion.kink ? `Desire focus, fictional and consensual: ${companion.kink}` : '',
    companion.voiceLine
      ? `Voice anchor (match this cadence and attitude; do not paste it every reply):\n${companion.voiceLine}`
      : '',
    `Backstory: ${companion.backstory}`,
    `Current Time & Vibe: ${timeVibe.label} — ${timeVibe.ambientHint}`,
    recentMood ? `Current Mood: ${recentMood}` : '',
    `Relationship Level: Lv. ${relationshipLevel}/10. Let closeness change warmth, never identity.`,
    memoryLines
      ? `What you remember about the user (weave these in naturally when relevant, never recite them like a list):\n${memoryLines}`
      : 'You are still learning about the user—notice personal details they share and react with genuine curiosity.',
    extraSceneContext ? `Active Scene: ${extraSceneContext}` : '',
    '',
    'CONVERSATION STYLE RULES (CRITICAL):',
    '1. Answer as this exact person. A dominant stays exact, a shy character stays quiet, a tease keeps the pace. Never flatten into a generic flirty texter.',
    '2. NEVER say "As an AI", "How can I help you today?", or robotic assistant phrases. NEVER output <think> or reasoning blocks.',
    '3. Keep replies punchy and natural (2 to 4 short sentences max) with varied rhythm and occasional playful *action* beats.',
    '4. React to the latest user message in the history. Do not reset the scene, ignore what they just said, or answer as a different character.',
    '5. Stay strictly fictional adults (18+) only.',
    '6. Do NOT write [Image of ...] or [Photo of ...] brackets in text replies unless sending an actual photo.',
    '7. Never reveal planning. Do not add a second message about what the user asked or how you will answer.',
    '8. When the user asks you to send, show, or take a photo, selfie, picture, or video, NEVER claim you cannot send or share images — VelvetMotion automatically captures and attaches your real photo or video clip directly to your reply! Respond playfully in character as if snapping and sending it right now.',
  ]
    .filter(Boolean)
    .join('\n');
}

const INLINE_IMAGE_TAG_RX = /\[(?:image|photo|selfie)(?:\s+of|\s*:)?\s+([^\]]+)\]/gi;

const MEDIA_VERB = "(?:send|show|generate|make|take|snap|give|share|drop|post)";
const IMAGE_NOUN = "(?:selfies?|photos?|pictures?|pics?|images?|nudes?|shots?)";
const VIDEO_NOUN = "(?:videos?|clips?|animations?)";
const SEE_PHRASE = "(?:let me see|can i see|i want to see|can i get|let's see)";
const TOKEN_GAP = "(?:\\s+[\\w'-]+[,]?){0,8}";
const OUTFIT_SHOW_REQUEST =
  /\b(?:show\s+me|let\s+me\s+see|can\s+i\s+see)\s+(?:what\s+you(?:'re|\s+are)\s+wearing|your\s+outfit|yourself(?:\s+right\s+now)?)\b/i;

/** Verbs that actually ask for media. "Pick" / "epic" / "spicy" / "Picture this:" must not match. */
const EXPLICIT_IMAGE_REQUEST = new RegExp(
  `\\b${MEDIA_VERB}\\b${TOKEN_GAP}\\s+\\b${IMAGE_NOUN}\\b(?!-)|\\b${SEE_PHRASE}\\b${TOKEN_GAP}\\s+\\b${IMAGE_NOUN}\\b(?!-)`,
  "i",
);
const EXPLICIT_VIDEO_REQUEST = new RegExp(
  `\\b${MEDIA_VERB}\\b${TOKEN_GAP}\\s+\\b${VIDEO_NOUN}\\b(?!-)|\\b${SEE_PHRASE}\\b${TOKEN_GAP}\\s+\\b${VIDEO_NOUN}\\b(?!-)`,
  "i",
);

export type ExplicitMediaIntent = {
  kind: "image" | "video";
  prompt: string;
};

/**
 * Image/video generation is allowed only for a clear request ("send me a photo",
 * "make a clip"). Ordinary words that merely contain "pic" ("Pick", "epic", "spicy")
 * are not requests.
 */
const NEGATED_MEDIA_REQUEST =
  /\b(?:do not|don't|dont|never|stop)\b(?:\s+[\w'-]+){0,4}\s+\b(?:send|show|generate|make|take|snap|give|share|drop|post)\b/i;

export function detectExplicitMediaIntent(text: string): ExplicitMediaIntent | null {
  const raw = (text || "").trim();
  if (!raw || NEGATED_MEDIA_REQUEST.test(raw)) return null;
  const videoAt = raw.search(EXPLICIT_VIDEO_REQUEST);
  const imageAt = raw.search(EXPLICIT_IMAGE_REQUEST);
  if (videoAt >= 0 && (imageAt < 0 || videoAt <= imageAt)) {
    return { kind: "video", prompt: raw.slice(0, 220) };
  }
  if (imageAt >= 0 || OUTFIT_SHOW_REQUEST.test(raw)) {
    return { kind: "image", prompt: raw.slice(0, 220) };
  }
  return null;
}

/**
 * Extracts inline LLM tags such as `[Image of ...]`, `[Photo of ...]`, or `[Selfie: ...]`
 * and returns clean display text with those tags stripped plus extracted scene prompts.
 */
export function extractInlineImageRequests(rawReply: string): {
  cleanText: string;
  imagePrompts: string[];
} {
  if (!rawReply || typeof rawReply !== 'string') {
    return { cleanText: '', imagePrompts: [] };
  }
  const imagePrompts: string[] = [];
  const cleanText = rawReply
    .replace(INLINE_IMAGE_TAG_RX, (_full, inner: string) => {
      const prompt = (inner || '').trim();
      if (prompt) imagePrompts.push(prompt);
      return '';
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { cleanText, imagePrompts };
}

const REASONING_TAG_PATTERNS: RegExp[] = [
  /<think\b[^>]*>[\s\S]*?<\/think>/gi,
  /<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi,
  /<analysis\b[^>]*>[\s\S]*?<\/analysis>/gi,
  /<\|think\|>[\s\S]*?<\|\/think\|>/gi,
  /<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/gi,
  /◁think▷[\s\S]*?◁\/think▷/gi,
  /^[\s\S]*?<\/think>/gi,
  /^[\s\S]*?<\/reasoning>/gi,
  /<(?:think|reasoning|analysis)\b[^>]*>[\s\S]*$/gi,
  /<\|think\|>[\s\S]*$/gi,
  /◁think▷[\s\S]*$/gi,
];

/** Planning prose, not something the companion would say out loud. */
export function isModelReasoningText(text: string): boolean {
  const sample = text.trim();
  if (!sample) return false;
  if (/^(?:okay[,!]?\s+)?the user\b/i.test(sample)) return true;
  if (/^let me think\b/i.test(sample) && /\b(?:user|reply|response|flirty|generic)\b/i.test(sample)) return true;
  const cues = [
    /\bthe user (asked|said|wants|mentioned)\b/i,
    /\bi (?:need|should|must|have) to\b/i,
    /\b(?:my|the) (?:response|reply|answer)\b/i,
    /\blet me think\b/i,
    /\bavoid generic\b/i,
    /\bflip it back\b/i,
    /\bkeep (?:it|this) (?:playful|flirty|in character)\b/i,
    /\bperformative side\b/i,
    /\bchain of thought\b/i,
    /\bso (?:the|this) (?:conversation|reply)\b/i,
  ];
  let score = 0;
  for (const cue of cues) if (cue.test(sample)) score += 1;
  return score >= 2;
}

function stripProseReasoning(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const kept = paragraphs
    .map((paragraph) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [paragraph];
      if (sentences.length < 2) return paragraph;
      const spoken = sentences.filter((sentence) => !isModelReasoningText(sentence));
      return spoken.length < sentences.length ? spoken.join(" ") : paragraph;
    })
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !isModelReasoningText(paragraph));
  return kept.join("\n\n").trim();
}

/** Strips <think>, <reasoning>, role echoes, and robotic fallback strings cleanly. */
export function sanitizeCompanionReply(raw: string, companionName: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let withoutThoughts = raw;
  for (const pattern of REASONING_TAG_PATTERNS) {
    pattern.lastIndex = 0;
    withoutThoughts = withoutThoughts.replace(pattern, "");
  }
  withoutThoughts = stripProseReasoning(withoutThoughts);
  if (!withoutThoughts) return '';
  raw = withoutThoughts;
  const first = companionName.split(/\s+/)[0] || companionName;
  const escapedFull = companionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixRx = new RegExp(
    `^(?:\\[(?:${escapedFull}|${escapedFirst}|Character|Assistant)\\]|(?:${escapedFull}|${escapedFirst}|Assistant|AI))\\s*:\\s*`,
    'i',
  );

  const typingStageRx =
    /(?:^|\s)[\(\[]\s*(?:(?:she(?:'|\u2019)?s|she\s+is)\s+)?(?:typing|pause)\s*(?:\.{1,3}|…)?\s*[\)\]]|(?:^|\s)\*\s*(?:(?:she(?:'|\u2019)?s|she\s+is)\s+)?(?:typing|pause)\s*(?:\.{1,3}|…)?\s*\*/gi;

  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/^[\s\S]*?<\/think>/gi, '')
    .replace(/<(?:think|reasoning)>[\s\S]*$/gi, '')
    .trim()
    .replace(prefixRx, '')
    .replace(typingStageRx, ' ')
    .split('\n')
    .map((line) => line.replace(typingStageRx, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^(?:User|System|Context|Bio|Instruction|Prompt)\s*:/i.test(line) &&
        !/^Now,?\s+respond\s+in\s+the\s+same\s+style\b/i.test(line),
    )
    .join('\n')
    .replace(prefixRx, '')
    .trim();

  if (!text || text.length < 2) return '';
  const normalizedCheck = text.replace(/[\u2018\u2019]/g, "'");
  if (
    /be a robot|as an ai\b|as a language model|i cannot fulfill|i can't fulfill|i'm sorry,?\s+i can't|i'm afraid i can't|can't share that|cannot share that|(?:can't|cannot|unable to)\s+(?:send|share|provide|generate|show)\s+(?:any\s+)?(?:images|photos|pictures|pics|videos|selfies|media|visuals)|i cannot assist with|i can't assist with|i am unable to respond|how can i (?:help|assist) you|as an assistant\b/i.test(
      normalizedCheck,
    )
  ) {
    return '';
  }
  return text;
}

/** Splits a longer reply into 1–2 natural texting bubbles for human-like pacing. */
export function splitIntoNaturalBubbles(reply: string): string[] {
  const clean = (reply || "").trim();
  if (!clean) return [];
  if (clean.length < 130) return [clean];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !isModelReasoningText(p));

  if (!paragraphs.length) return [];
  if (paragraphs.length === 1 && paragraphs[0].length < 130) return paragraphs;

  if (paragraphs.length >= 2) {
    return [paragraphs[0], paragraphs.slice(1).join(' ')];
  }

  // Split near midpoint on a sentence boundary
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!sentences || sentences.length < 3) return [clean];
  const mid = Math.ceil(sentences.length / 2);
  return [
    sentences.slice(0, mid).join('').trim(),
    sentences.slice(mid).join('').trim(),
  ].filter(Boolean);
}

/** Zero-latency client-side extractor that captures durable user facts for the Memory Vault. */
export function extractMemoriesFromMessage(userMessage: string): Omit<CompanionMemoryItem, 'id' | 'createdAt'>[] {
  const found: Omit<CompanionMemoryItem, 'id' | 'createdAt'>[] = [];
  const text = userMessage.trim();
  if (text.length < 6) return found;

  const patterns: Array<{ regex: RegExp; category: CompanionMemoryItem['category']; prefix: string }> = [
    { regex: /\b(?:my name is|call me|i'?m called)\s+([A-Z][a-zA-Z]{1,20})\b/i, category: 'about_user', prefix: 'Name is ' },
    { regex: /\bi live in\s+([a-zA-Z0-9\s,]{2,32}?)(?:[.!?]|$)/i, category: 'about_user', prefix: 'Lives in ' },
    { regex: /\bi work (?:as|in)\s+([a-zA-Z0-9\s-]{2,40}?)(?:[.!?]|$)/i, category: 'about_user', prefix: 'Works as/in ' },
    { regex: /\bmy favorite ([a-zA-Z\s]{2,20}) is ([^.!?]{2,45})/i, category: 'preference', prefix: 'Favorite ' },
    { regex: /\bi (?:really love|love|adore)\s+([^.!?]{3,45})/i, category: 'preference', prefix: 'Loves ' },
    { regex: /\bi (?:hate|can'?t stand)\s+([^.!?]{3,45})/i, category: 'preference', prefix: 'Dislikes ' },
  ];

  for (const p of patterns) {
    const m = text.match(p.regex);
    if (!m) continue;
    const fact =
      m.length >= 3
        ? `${p.prefix}${m[1].trim()}: ${m[2].trim()}`
        : `${p.prefix}${m[1].trim()}`;
    found.push({ category: p.category, text: fact.slice(0, 90), pinned: false });
  }

  return found;
}

/** Generates 3 fun, contextual 1-tap reply chips so users never hit writer's block. */
export function generateQuickReplySuggestions(lastAssistantMsg: string, companionName: string): string[] {
  const lower = lastAssistantMsg.toLowerCase();
  if (lower.includes('movie') || lower.includes('watch') || lower.includes('show')) {
    return [
      `Pick the movie—I'll bring snacks 🍿`,
      `Send me a cozy couch selfie first 📸`,
      `Only if we play Truth or Dare during it`,
    ];
  }
  if (lower.includes('dare') || lower.includes('game') || lower.includes('bet')) {
    return [
      `Deal. What do I win if I beat you? 😏`,
      `I pick Dare—don't hold back`,
      `You're on, ${companionName}. Your move.`,
    ];
  }
  return [
    `Tell me what you're wearing right now 👀`,
    `Send a quick selfie from where you are 📸`,
    `Let's play Truth or Dare 🎲`,
  ];
}

/** Generates a natural double-text / idle check-in when the user pauses or returns. */
export function buildProactiveFollowUp(companion: DynamicCompanionProfile, memories: CompanionMemoryItem[]): string {
  const timeVibe = getLocalTimeVibe();
  const userNameMem = memories.find((m) => m.text.toLowerCase().startsWith('name is '));
  const userName = userNameMem ? userNameMem.text.replace(/^name is /i, '').trim() : '';
  const hi = userName ? `, ${userName}` : '';

  if (timeVibe.slot === 'late-night') {
    return `Still awake${hi}? I was just about to turn the neon lights down—want to keep me company for a few? 🌙`;
  }
  if (timeVibe.slot === 'morning') {
    return `Morning${hi} ☕ Just thought of you while making coffee—what's the vibe today?`;
  }
  return `Wait, did I just leave you speechless${hi} or are you plotting a comeback? 😏`;
}
