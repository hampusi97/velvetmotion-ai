/**
 * Parse free-text chat for Candy-style media requests ("send a selfie",
 * "show me you in a red dress on the balcony", "send a video dancing", etc.)
 * and build clean, conversation-relevant visual prompts + moods.
 */

import type { MediaMood } from "@/lib/media";
import type { VideoMotionPreset } from "@/lib/canvasVideoExporter";

export type SceneRequest = {
  mood: MediaMood;
  label: string;
  extra: string;
};

export type ContextualMediaSpec = {
  mood: MediaMood;
  label: string;
  visualPrompt: string;
  motionId: VideoMotionPreset["id"];
};

const PATTERNS: Array<{
  re: RegExp;
  mood: MediaMood;
  label: string;
  extra?: string;
}> = [
  {
    re: /\b(joi|jerk\s*off\s*instruction|guide\s*me|talk\s*me\s*through)\b/i,
    mood: "joi",
    label: "JOI",
    extra: "JOI POV, looking at camera, guiding, intense eye contact",
  },
  {
    re: /\b(sph|small\s*penis\s*humiliation|tiny\s*dick)\b/i,
    mood: "sph",
    label: "SPH",
    extra: "SPH teasing face, smirking at camera, humiliation energy",
  },
  {
    re: /\b(bnwo|blacked|bbc\s*only)\b/i,
    mood: "bnwo",
    label: "BNWO",
    extra: "BNWO aesthetic, dominant pose, explicit",
  },
  {
    re: /\b(sex\s*(video|clip|scene|pic|photo)?|fuck(?:ing)?|hardcore|cowgirl|doggy|riding)\b/i,
    mood: "sex",
    label: "Intimate Scene",
    extra: "explicit intimate scene, intense eye contact, cinematic lighting",
  },
  {
    re: /\b(nude|naked|topless|no\s*clothes|fully\s*nude|undressed|bare\s*breasts)\b/i,
    mood: "nude",
    label: "Nude Photo",
    extra: "fully nude, tasteful explicit, soft natural lighting",
  },
  {
    re: /\b(explicit|pussy|tits\s*out|spread|close.?up)\b/i,
    mood: "explicit",
    label: "Explicit Photo",
    extra: "explicit close-up, detailed, photoreal",
  },
  {
    re: /\b(lingerie|bikini|swimsuit|lace|underwear|bra|panties|stockings|corset)\b/i,
    mood: "lingerie",
    label: "Lingerie Selfie",
    extra: "sheer lingerie, flattering warm lighting, looking at camera",
  },
  {
    re: /\b(sexy|seductive|flirty|tease|bedroom|shower|bath|hot\s*tub)\b/i,
    mood: "seductive",
    label: "Seductive Shot",
    extra: "intimate close-up, warm rim light, seductive gaze at camera",
  },
  {
    re: /\b(selfie|self.?pic|send\s*(a\s*)?(pic|photo|image|shot)|show\s*me\s*(you|your\s*face|yourself)|pic\s*of\s*you|photo\s*of\s*you)\b/i,
    mood: "beauty",
    label: "Selfie",
    extra: "intimate selfie, looking at camera, natural light",
  },
  {
    re: /\b(video|clip|motion|animation)\b/i,
    mood: "seductive",
    label: "Motion Clip",
    extra: "short cinematic clip, natural motion, looking at camera",
  },
];

export function parseSceneRequest(text: string): SceneRequest | null {
  const t = text.trim();
  if (t.length < 3 || t.length > 260) return null;
  const hasMediaVerb =
    /\b(send|show|give|take|snap|post|drop|share|make|generate)\b/i.test(t) ||
    /\b(pic|photo|picture|selfie|image|shot|video|clip|nude|naked|lingerie|bikini|joi|sph)\b/i.test(t);
  if (!hasMediaVerb) return null;

  for (const p of PATTERNS) {
    if (p.re.test(t)) {
      return {
        mood: p.mood,
        label: p.label,
        extra: p.extra || t.slice(0, 140),
      };
    }
  }
  return null;
}

const REQUEST_WRAPPER_PATTERNS: RegExp[] = [
  /^(?:hey|hi|babe|baby|honey|please|pls|can\s+you|could\s+you|would\s+you|will\s+you|let\s+me\s+see|i\s+want\s+to\s+see|can\s+i\s+(?:see|get)|let's\s+see)[\s,]+/gi,
  /\b(?:please\s+)?(?:send|show|generate|make|take|snap|give|share|drop|post)(?:\s+me)?(?:\s+(?:a|an|some|another|one|quick|short|cute|hot|little))?\s+(?:full[- ]body\s+|mirror\s+|close[- ]up\s+)?(?:selfies?|photos?|pictures?|pics?|images?|shots?|videos?|clips?|animations?)(?:\s+(?:of|with|where|from|showing)\s+(?:you|yourself|urself))?\b/gi,
  /^\s*(?:of\s+(?:you|yourself)|where\s+you(?:'re|\s+are)|right\s+now|for\s+me|please|pls|now|first|too)\b[\s,.!?-]*/gi,
  /[\s,.!?-]+(?:right\s+now|for\s+me|please|pls|first)\s*[.!?]*$/gi,
];

/** Strip conversational "send me a picture of you..." wrappers down to the actual visual scene. */
export function extractCleanVisualSubject(userText: string): string {
  let cleaned = (userText || "").replace(/\s+/g, " ").trim();
  const isMirror = /\bmirror\s+selfie\b/i.test(cleaned);
  const isFullBody = /\bfull[- ]body\b/i.test(cleaned);

  for (let pass = 0; pass < 3; pass++) {
    for (const rx of REQUEST_WRAPPER_PATTERNS) {
      cleaned = cleaned.replace(rx, " ").replace(/\s+/g, " ").trim();
    }
  }
  cleaned = cleaned.replace(/^(?:in|on|at|by|wearing|with|doing)\b/i, (m) => m).trim();
  cleaned = cleaned.replace(/^[,.:;!?-]+|[,.:;!?-]+$/g, "").trim();

  if (/^(?:you|yourself|what\s+you(?:'re|\s+are)\s+wearing|your\s+outfit)$/i.test(cleaned)) {
    cleaned = "";
  }

  const prefixes: string[] = [];
  if (isMirror && !/\bmirror\b/i.test(cleaned)) prefixes.push("candid mirror selfie");
  if (isFullBody && !/\bfull[- ]body\b/i.test(cleaned)) prefixes.push("full-body framing");

  return [...prefixes, cleaned].filter(Boolean).join(", ").trim();
}

const VISUAL_SCENE_KEYWORDS =
  /\b(dress|gown|skirt|jeans|sweater|shirt|jacket|coat|lingerie|bikini|swimsuit|lace|silk|satin|leather|glasses|heels|boots|barefoot|towel|robe|nude|naked|beach|ocean|pool|balcony|terrace|rooftop|bar|lounge|club|piano|cafe|coffee|kitchen|couch|sofa|bed|bedroom|pillow|sheets|shower|bath|mirror|gym|workout|park|forest|snow|rain|sunset|sunrise|neon|candle|window|car|train|observatory|library|bookshop|studio|office)\b/i;

function extractSceneFromConversation(
  assistantReply: string,
  recentMessages: Array<{ role: string; content: string }>,
): string {
  // 1. Prefer *action / setting* beats in the companion's immediate reply
  const actionMatches = [...(assistantReply || "").matchAll(/\*([^*]{6,140})\*/g)]
    .map((m) => m[1].trim())
    .filter((s) => !/^sends you a/i.test(s));
  if (actionMatches.length > 0) {
    return actionMatches.join(", ").slice(0, 160);
  }

  // 2. Scan the companion's reply and last 4 turns for concrete outfit/location cues
  const pool = [
    assistantReply,
    ...recentMessages
      .slice(-4)
      .reverse()
      .map((m) => m.content),
  ];
  for (const line of pool) {
    if (!line) continue;
    const sentences = line.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (VISUAL_SCENE_KEYWORDS.test(sentence) && sentence.length <= 180) {
        return sentence.replace(/[*"]/g, "").trim();
      }
    }
  }
  return "";
}

function pickMotionPreset(scene: string, mood: MediaMood): VideoMotionPreset["id"] {
  if (/\b(beach|ocean|balcony|terrace|rooftop|rain|wind|breeze|pool|outdoor|park)\b/i.test(scene)) {
    return "balcony-breeze";
  }
  if (mood === "joi" || /\b(club|dance|dancing|party|bar|rave|strobe|beat)\b/i.test(scene)) {
    return "club-light-pulse";
  }
  if (/\b(piano|music|jazz|lounge|dress|gown|hair|walk|street|neon)\b/i.test(scene)) {
    return "neon-hair-sway";
  }
  return "slow-zoom-blink";
}

/**
 * Build a relevant `(mood, label, visualPrompt, motionId)` spec from the user's
 * chat message, inline `[Image: ...]` tags, and recent conversation context.
 */
export function buildContextualMediaSpec(opts: {
  userText: string;
  assistantReply?: string;
  inlineImagePrompt?: string;
  recentMessages?: Array<{ role: string; content: string }>;
}): ContextualMediaSpec {
  const { userText, assistantReply = "", inlineImagePrompt = "", recentMessages = [] } = opts;
  const parsed = parseSceneRequest(userText);
  const userVisual = extractCleanVisualSubject(userText);
  const inlineClean = inlineImagePrompt.trim();
  const convoScene =
    !inlineClean && userVisual.length < 8
      ? extractSceneFromConversation(assistantReply, recentMessages)
      : "";

  const combinedScene = [inlineClean || userVisual, convoScene]
    .filter(Boolean)
    .join(", ")
    .slice(0, 220)
    .trim();

  let mood: MediaMood = parsed?.mood || "beauty";
  if (mood === "beauty" && combinedScene.length >= 8) {
    mood = "scene";
  }

  const label = parsed?.label || (mood === "scene" ? "Scene Photo" : "Selfie");
  const visualPrompt = combinedScene || parsed?.extra || "candid intimate portrait looking at camera, natural lighting";
  const motionId = pickMotionPreset(`${userText} ${combinedScene}`, mood);

  return { mood, label, visualPrompt, motionId };
}
