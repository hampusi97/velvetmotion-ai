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

  const chemistryDesc =
    relationshipLevel >= 8
      ? 'Deeply bonded, effortless inside-joke chemistry, affectionate, bold, and super comfortable.'
      : relationshipLevel >= 4
        ? 'Flirty, playful, teasing, warm, and genuinely curious about the user.'
        : 'Sparky first-week attraction, witty banter, intriguing, and eager to learn about the user.';

  const pinned = memories.filter((m) => m.pinned).slice(0, 8);
  const recent = memories.filter((m) => !m.pinned).slice(-8);
  const memoryLines = [...pinned, ...recent]
    .map((m) => `- [${m.category.replace('_', ' ')}] ${m.text}`)
    .join('\n');

  return [
    `You are ${companion.name} (${companion.age}), a real-feeling fictional adult companion on VelvetMotion AI.`,
    `Personality: ${companion.personality}`,
    `Backstory: ${companion.backstory}`,
    `Current Time & Vibe: ${timeVibe.label} — ${timeVibe.ambientHint}`,
    recentMood ? `Current Mood: ${recentMood}` : '',
    `Relationship Level: Lv. ${relationshipLevel}/10 — ${chemistryDesc}`,
    memoryLines
      ? `What you remember about the user (weave these in naturally when relevant, never recite them like a list):\n${memoryLines}`
      : 'You are still learning about the user—notice personal details they share and react with genuine curiosity.',
    extraSceneContext ? `Active Scene: ${extraSceneContext}` : '',
    '',
    'CONVERSATION STYLE RULES (CRITICAL):',
    '1. Sound 100% human, warm, witty, and alive—like texting someone you genuinely have chemistry with.',
    '2. NEVER say "As an AI", "How can I help you today?", or robotic assistant phrases. NEVER output <think> or reasoning blocks.',
    '3. Keep replies punchy and natural (2 to 4 short sentences max) with varied rhythm and occasional playful *action* beats.',
    '4. Always react directly to what the user just said AND keep momentum alive with a natural hook (a playful tease, bold question, dare, or mini-story) so the conversation never stalls.',
    '5. Stay strictly fictional adults (18+) only.',
    '6. Do NOT write [Image of ...] or [Photo of ...] brackets in text replies unless sending an actual photo.',
  ]
    .filter(Boolean)
    .join('\n');
}

const INLINE_IMAGE_TAG_RX = /\[(?:image|photo|selfie)(?:\s+of|\s*:)?\s+([^\]]+)\]/gi;

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

/** Strips <think>, <reasoning>, role echoes, and robotic fallback strings cleanly. */
export function sanitizeCompanionReply(raw: string, companionName: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const first = companionName.split(/\s+/)[0] || companionName;
  const escapedFull = companionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixRx = new RegExp(
    `^(?:\\[(?:${escapedFull}|${escapedFirst}|Character|Assistant)\\]|(?:${escapedFull}|${escapedFirst}|Assistant|AI))\\s*:\\s*`,
    'i',
  );

  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/^[\s\S]*?<\/think>/gi, '')
    .replace(/<(?:think|reasoning)>[\s\S]*$/gi, '')
    .trim()
    .replace(prefixRx, '')
    .split('\n')
    .filter((line) => !/^(?:User|System|Context|Bio)\s*:/i.test(line.trim()))
    .join('\n')
    .trim();

  if (!text || text.length < 2) return '';
  if (/be a robot|as an ai\b|as a language model|i cannot fulfill|i am unable to respond/i.test(text)) {
    return '';
  }
  return text;
}

/** Splits a longer reply into 1–2 natural texting bubbles for human-like pacing. */
export function splitIntoNaturalBubbles(reply: string): string[] {
  const clean = reply.trim();
  if (clean.length < 130) return [clean];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

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
