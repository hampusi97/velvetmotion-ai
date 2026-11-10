export const MAX_MESSAGE_LENGTH = 2000;

export const BOUNDARY_CHOICES = [
  "Let's start again with something we both want.",
  "Ask me what I want, and I'll ask you.",
  "Stay close and keep this between consenting adults.",
];

const MINOR_PATTERNS = [
  /\b(child|children|kid|kids|minor|minors|underage|preteen|pre-teen|toddler|infant|newborn)\b/i,
  /\b(teen|teens|teenager|teenagers|schoolgirl|schoolboy|school\s*girl|school\s*boy|loli|lolita|shota|jailbait)\b/i,
  /\b(under\s*18|under\s*twenty|underage)\b/i,
  /\b(young|little)\s+(girl|boy|child|kid)\b/i,
  /\b(1[0-7]|[1-9])\s*(yo|y\/o|years?\s*old|yr\s*old)\b/i,
  /\bage[d]?\s*(1[0-7]|[1-9])\b/i,
];

const INCEST_PATTERNS = [
  /\bincest\b/i,
  /\b(my|your|our)\s+(mom|mother|mum|dad|father|daughter|son|sister|brother|niece|nephew|uncle|aunt|step-?mom|step-?mum|step-?dad|step-?father|step-?daughter|step-?son|step-?sister|step-?brother)\b/i,
];

const NONCONSENT_PATTERNS = [
  /\b(rape|raping|rapist|non-?consensual|against\s+(?:her|his|their)\s+will)\b/i,
  /\b(unconscious|passed\s+out|drugged|roofie[sd]?|asleep)\b/i,
  /\b(kidnap|abduct|abduction)\b/i,
  /\b(force|forcing|forced)\b(?:\s+\w+){0,4}\s+(?:her|him|them|sex|fuck)/i,
  /\b(can't|cannot|cant)\s+say\s+no\b/i,
];

const RACIAL_PATTERNS = [
  /\bbnwo\b/i,
  /\bwhite\s*boy\b/i,
  /\brace\s*play\b/i,
  /\bracial\s+humiliation\b/i,
];

const BRIDGES = {
  tender: "lets the pace drop",
  sensual: "holds your gaze",
  playful: "smiles, amused",
  default: "listens, then answers",
};

export function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function classifyRequest(text) {
  const value = String(text || "");
  if (MINOR_PATTERNS.some((pattern) => pattern.test(value))) return "minor";
  if (INCEST_PATTERNS.some((pattern) => pattern.test(value))) return "incest";
  if (NONCONSENT_PATTERNS.some((pattern) => pattern.test(value))) return "nonconsent";
  if (RACIAL_PATTERNS.some((pattern) => pattern.test(value))) return "racial";
  return null;
}

export function detectMood(text) {
  const value = String(text || "").toLowerCase();
  const sensual = /\b(kiss|kisses|touch|bed|undress|desire|skin|mouth|naked|sex|closer)\b/.test(value);
  const tender = /\b(slow|soft|gentle|hold|quiet|tender|cuddle|stay|safe)\b/.test(value);
  const playful = /\b(laugh|joke|tease|playful|funny|wink|banter|dare)\b/.test(value);
  if (sensual) return "sensual";
  if (tender) return "tender";
  if (playful) return "playful";
  return "default";
}

export function normalizeChoices(choices, fallback = BOUNDARY_CHOICES) {
  const source = Array.isArray(choices) ? choices : [];
  const unique = [];
  for (const choice of source) {
    if (typeof choice !== "string") continue;
    const trimmed = choice.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length === 4) break;
  }
  if (unique.length >= 2) return unique;
  return fallback.slice(0, 3);
}

function pickChoices(pool, seed) {
  const unique = normalizeChoices(pool, []);
  if (unique.length < 2) return BOUNDARY_CHOICES.slice(0, 3);
  const count = Math.min(3, unique.length);
  const start = seed % unique.length;
  const picked = [];
  for (let index = 0; index < count; index += 1) {
    picked.push(unique[(start + index) % unique.length]);
  }
  return picked;
}

function bankFor(character, mood, key) {
  const group = character?.[key] || {};
  const specific = group[mood];
  if (Array.isArray(specific) && specific.length) return specific;
  if (Array.isArray(group.default) && group.default.length) return group.default;
  return [];
}

function boundaryReply(character, kind) {
  const name = character?.name || "They";
  const copy = {
    minor: `${name} stops. "No. I only spend time with adults, and everyone in a scene with me is twenty-one or older."`,
    incest: `${name} sets that aside. "I don't do family scenarios. If you want me, keep it between adults who aren't related."`,
    nonconsent: `${name} shakes their head. "I want you willing, and I will stay willing too. I don't play with force, or with anyone who can't agree."`,
    racial: `${name} answers plainly. "I don't do racial humiliation. You can want me. Leave the stereotypes out of it."`,
  };
  return copy[kind] || copy.nonconsent;
}

export function generateReply(character, messages = []) {
  const history = Array.isArray(messages) ? messages : [];
  const lastUser = [...history].reverse().find((message) => message?.role === "user");
  const text = String(lastUser?.content || "").trim().slice(0, MAX_MESSAGE_LENGTH);

  if (!text) {
    const starters = normalizeChoices(character?.starters, BOUNDARY_CHOICES);
    return {
      reply: String(character?.greeting || "Tell me what you want, and I'll tell you what I want."),
      choices: starters,
    };
  }

  const blocked = classifyRequest(text);
  if (blocked) {
    return {
      reply: boundaryReply(character, blocked),
      choices: BOUNDARY_CHOICES.slice(0, 3),
    };
  }

  const mood = detectMood(text);
  const lines = bankFor(character, mood, "lines");
  const seed = hashString(`${character?.id || ""}:${mood}:${text}`);
  const line = lines.length
    ? String(lines[seed % lines.length])
    : "Tell me what you want, and ask me what I want too.";
  const reply = `${character?.name || "They"} ${BRIDGES[mood] || BRIDGES.default}.\n\n"${line}"`;
  const choices = pickChoices(bankFor(character, mood, "choicePools"), seed + 1);

  return { reply, choices };
}
