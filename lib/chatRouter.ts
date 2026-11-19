/**
 * Zero-server 5-tier Chat Router + <think> sanitizer.
 * Priority:
 *  1. Local KoboldCpp (127.0.0.1:5001/v1/chat/completions)
 *  2. Local Ollama (127.0.0.1:11434/v1/chat/completions)
 *  3. User BYOK / OpenRouter (customBaseUrl or openRouterApiKey)
 *  4. Free Cloud Route (AI Horde / OpenRouter free tier)
 *  5. Context-Aware In-Character Fallback
 */
import { assertCompliance } from "./complianceFilter";
import { reportGenerationSpeed } from "./localEngineBridge";

export interface RouterMessage {
  role: "user" | "assistant";
  text: string;
}

export interface CompanionPersona {
  id: string;
  name: string;
  age: number;
  tagline: string;
  personality?: string;
  backstory?: string;
  memoryBlock?: string;
}

export interface ChatRouterSettings {
  provider: "auto" | "openrouter" | "ai-horde" | "custom" | "local";
  openRouterApiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  aiHordeApiKey?: string;
}

const KEY = "velvetmotion_llm_settings";

export function loadRouterSettings(): ChatRouterSettings {
  if (typeof window === "undefined") return { provider: "auto" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { provider: "auto", ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { provider: "auto", aiHordeApiKey: "0000000000" };
}

export function saveRouterSettings(next: Partial<ChatRouterSettings>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadRouterSettings(), ...next }));
  } catch {
    /* ignore */
  }
}

const DEGENERATE_PATTERNS: RegExp[] = [
  /\bI think I['’]?ll just\.{0,3}\s*be a robot\b/i,
  /\bas an ai\b/i,
  /\bas a language model\b/i,
  /\bi cannot fulfill\b/i,
  /\bi am unable to respond\b/i,
];

/**
 * Strips <think> / <reasoning> blocks, unclosed leading <think> tags,
 * stray role prefixes ("Mia:", "Assistant:", "[Character]:"), prompt echoes,
 * and rejects degenerate/robotic filler outputs.
 */
export function sanitizeCompanionReply(raw: string, companionName: string): string {
  if (!raw || typeof raw !== "string") return "";
  const first = companionName.split(/\s+/)[0] || companionName;
  let cleaned = raw
    // Completed reasoning tags
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    // Unclosed truncated <think> or <reasoning> block at start or anywhere
    .replace(/^[\s\S]*?<\/think>/gi, "")
    .replace(/<(think|reasoning)>[\s\S]*$/gi, "")
    .trim();

  // Strip stray speaker prefixes like "Mia:", "Assistant:", "[Chloe]:"
  const escapedFull = companionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixRx = new RegExp(
    `^(?:\\[(?:${escapedFull}|${escapedFirst}|Character|Assistant)\\]|(?:${escapedFull}|${escapedFirst}|Assistant|AI))\\s*:\\s*`,
    "i",
  );
  cleaned = cleaned.replace(prefixRx, "").trim();

  // Strip accidental transcript/prompt echo lines
  cleaned = cleaned
    .split("\n")
    .filter((line) => !/^(?:User|System|Context|Bio)\s*:/i.test(line.trim()))
    .join("\n")
    .trim();

  if (!cleaned || cleaned.length < 2) return "";
  for (const rx of DEGENERATE_PATTERNS) {
    if (rx.test(cleaned)) return "";
  }
  return cleaned;
}

function systemPrompt(p: CompanionPersona): string {
  return [
    `You are ${p.name}, a consenting fictional ${Math.max(18, p.age)}-year-old adult companion.`,
    `Persona: ${p.tagline}. ${p.personality || ""} ${p.backstory || ""}`.trim(),
    p.memoryBlock ? `Remembered user details:\n${p.memoryBlock}` : "",
    "Stay 100% in character. Keep replies vivid, expressive, conversational, and concise (2-4 sentences). Never output <think> tags, system notes, or mention being an AI or robot.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchOpenAICompat(
  endpoint: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { apiKey?: string; model?: string; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
        ...(opts.headers || {}),
      },
      body: JSON.stringify({
        model: opts.model || "local-model",
        messages,
        max_tokens: 220,
        temperature: 0.86,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return "";
    const data = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
    } | null;
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function callHordeText(persona: CompanionPersona, history: RouterMessage[]): Promise<string> {
  const transcript = history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : persona.name}: ${m.text}`)
    .join("\n");
  const prompt = `${systemPrompt(persona)}\n\n${transcript}\n${persona.name}:`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch("https://aihorde.net/api/v2/generate/text/async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "0000000000",
        "Client-Agent": "VelvetMotionAI:2.0:web",
      },
      body: JSON.stringify({
        prompt,
        params: {
          max_length: 160,
          temperature: 0.85,
          stop_sequence: ["\nUser:", `\n${persona.name}:`],
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return "";
    const { id } = (await res.json()) as { id?: string };
    if (!id) return "";
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const s = await fetch(`https://aihorde.net/api/v2/generate/text/status/${id}`);
      if (!s.ok) continue;
      const st = (await s.json()) as {
        done?: boolean;
        faulted?: boolean;
        generations?: Array<{ text?: string }>;
      };
      if (st.done) {
        const text = (st.generations?.[0]?.text || "").split(/\nUser:/i)[0].trim();
        if (text) return text;
      }
      if (st.faulted) break;
    }
    return "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tier 5: Context-aware in-character fallback referencing the actual message topic
 * (movies, music, flirting, feelings, selfies, etc.) with companion personality.
 */
export function buildContextAwareFallback(
  history: RouterMessage[],
  persona: CompanionPersona,
): string {
  const first = persona.name.split(/\s+/)[0] || persona.name;
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.text.trim() || "";
  const lower = lastUser.toLowerCase();

  if (/(movie|film|watch|cinema|show|series|netflix)/i.test(lower)) {
    return `*${first} tucks a strand of hair back and smiles.* “If it's just the two of us after midnight? Definitely something moody like *Blade Runner 2049* or *Lost in Translation*—though honestly I'd get distracted halfway through just watching your reaction. What kind of movie puts you in the right mood?”`;
  }
  if (/(music|song|playlist|listen|album|track)/i.test(lower)) {
    return `*${first} leans closer, tracing the edge of her glass.* “Late-night synthwave, slowed R&B, anything with heavy bass and zero rush. Send me whatever track you're playing right now and let me judge your taste.”`;
  }
  if (/(photo|pic|selfie|nude|lingerie|show me|see you)/i.test(lower)) {
    return `*${first} bites her lip with a slow grin.* “Tap Scene Selfies below and pick the lighting—or tell me exactly what pose you want to unlock next.”`;
  }
  if (/(how are you|your day|what are you doing|wyd|up to)/i.test(lower)) {
    return `*${first} stretches lazily and glances up at you.* “Way better now that you're here. I was just waiting for an excuse to ditch everything else—so tell me how your night's going.”`;
  }
  if (/(cute|hot|sexy|gorgeous|beautiful|love you|miss you)/i.test(lower)) {
    return `*${first}'s eyes soften with a playful spark.* “Careful saying things like that unless you plan on keeping me up all night. Come a little closer.”`;
  }
  const topicSnippet = lastUser ? lastUser.slice(0, 64).replace(/["\n]/g, "") : "that";
  return `*${first} smiles slowly, keeping her eyes locked on yours.* “Tell me more about ${topicSnippet}… you already have my full attention.”`;
}

export async function generateCompanionReply(
  history: RouterMessage[],
  persona: CompanionPersona,
): Promise<{ text: string; providerUsed: string }> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.text || "";
  const safety = assertCompliance(lastUser);
  if (!safety.ok) {
    return { text: safety.reason, providerUsed: "compliance-guard" };
  }

  const settings = loadRouterSettings();
  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt(persona) },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
  ];

  const measureAndReturn = (text: string, providerUsed: string, startedMs: number) => {
    const elapsedSec = Math.max(0.15, (Date.now() - startedMs) / 1000);
    const estTokens = Math.max(6, Math.round(text.split(/\s+/).length * 1.35));
    reportGenerationSpeed({ tokPerSec: Math.round(estTokens / elapsedSec), lastEngine: providerUsed });
    return { text, providerUsed };
  };

  // Tier 1: Local KoboldCpp (127.0.0.1:5001)
  if (typeof window !== "undefined") {
    const t0 = Date.now();
    const koboldRaw = await fetchOpenAICompat("http://127.0.0.1:5001/v1/chat/completions", chatMessages, {
      model: "koboldcpp",
      timeoutMs: 2500,
    });
    const koboldClean = sanitizeCompanionReply(koboldRaw, persona.name);
    if (koboldClean) return measureAndReturn(koboldClean, "koboldcpp-local", t0);
  }

  // Tier 2: Local Ollama (127.0.0.1:11434 or configured URL)
  if (typeof window !== "undefined") {
    const t0 = Date.now();
    const ollamaBase = (settings.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    const ollamaRaw = await fetchOpenAICompat(`${ollamaBase}/v1/chat/completions`, chatMessages, {
      model: settings.ollamaModel || "llama3.1:8b",
      timeoutMs: 3200,
    });
    const ollamaClean = sanitizeCompanionReply(ollamaRaw, persona.name);
    if (ollamaClean) return measureAndReturn(ollamaClean, "ollama-local", t0);
  }

  // Tier 3: User BYOK Custom endpoint or OpenRouter API Key
  if (settings.customBaseUrl) {
    const t0 = Date.now();
    const base = settings.customBaseUrl.replace(/\/+$/, "");
    const customRaw = await fetchOpenAICompat(`${base}/chat/completions`, chatMessages, {
      apiKey: settings.customApiKey,
      model: settings.customModel || "local",
      timeoutMs: 8000,
    });
    const customClean = sanitizeCompanionReply(customRaw, persona.name);
    if (customClean) return measureAndReturn(customClean, "byok-custom", t0);
  }

  if (settings.openRouterApiKey) {
    const orRaw = await fetchOpenAICompat("https://openrouter.ai/api/v1/chat/completions", chatMessages, {
      apiKey: settings.openRouterApiKey,
      model: settings.customModel || "meta-llama/llama-3.1-8b-instruct:free",
      timeoutMs: 9000,
      headers: {
        "HTTP-Referer": "https://velvetmotion-ai.hampusi97.workers.dev",
        "X-Title": "VelvetMotion AI",
      },
    });
    const orClean = sanitizeCompanionReply(orRaw, persona.name);
    if (orClean) return { text: orClean, providerUsed: "openrouter-byok" };
  }

  // Tier 4: Free Cloud Route (AI Horde text)
  const hordeRaw = await callHordeText(persona, history);
  const hordeClean = sanitizeCompanionReply(hordeRaw, persona.name);
  if (hordeClean) return { text: hordeClean, providerUsed: "ai-horde" };

  // Tier 5: Context-Aware In-Character Fallback
  return {
    text: buildContextAwareFallback(history, persona),
    providerUsed: "context-fallback",
  };
}
