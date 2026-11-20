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
import { localComputeBudget } from "./localComputePreferences";
import { reportGenerationSpeed } from "./localEngineBridge";
import {
  buildDynamicSystemPrompt,
  sanitizeCompanionReply as sanitizeWithDynamicEngine,
  type CompanionMemoryItem,
} from "./dynamicChatEngine";
import {
  buildContinueSteeringMessages,
  buildSamplerPayload,
  type SamplerPresetId,
} from "./samplerPresets";

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
  memories?: CompanionMemoryItem[];
  relationshipLevel?: number;
  recentMood?: string;
  extraSceneContext?: string;
}

export interface ChatRouterSettings {
  provider: "auto" | "openrouter" | "ai-horde" | "custom" | "local";
  openRouterApiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  homeEngineUrl?: string;
  aiHordeApiKey?: string;
  samplerPreset?: SamplerPresetId;
  enableAntiSlop?: boolean;
}

const KEY = "velvetmotion_llm_settings";

export function loadRouterSettings(): ChatRouterSettings {
  if (typeof window === "undefined") {
    return { provider: "auto", samplerPreset: "roleplay-balanced", enableAntiSlop: true };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return {
        provider: "auto",
        samplerPreset: "roleplay-balanced",
        enableAntiSlop: true,
        ...JSON.parse(raw),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    provider: "auto",
    samplerPreset: "roleplay-balanced",
    enableAntiSlop: true,
    aiHordeApiKey: "0000000000",
  };
}

export function saveRouterSettings(next: Partial<ChatRouterSettings>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadRouterSettings(), ...next }));
  } catch {
    /* ignore */
  }
}

/**
 * Strips <think> / <reasoning> blocks, unclosed leading <think> tags,
 * stray role prefixes ("Mia:", "Assistant:", "[Character]:"), prompt echoes,
 * and rejects degenerate/robotic filler outputs.
 */
export function sanitizeCompanionReply(raw: string, companionName: string): string {
  return sanitizeWithDynamicEngine(raw, companionName);
}

function systemPrompt(p: CompanionPersona): string {
  const extraSceneContext = [p.extraSceneContext, p.tagline, p.memoryBlock].filter(Boolean).join("\n");
  return buildDynamicSystemPrompt({
    companion: {
      id: p.id,
      name: p.name,
      age: Math.max(18, p.age),
      personality: p.personality || p.tagline,
      backstory: p.backstory || "",
      mood: p.recentMood,
    },
    memories: p.memories || [],
    relationshipLevel: p.relationshipLevel ?? 1,
    recentMood: p.recentMood,
    extraSceneContext: extraSceneContext || undefined,
  });
}

async function fetchOpenAICompat(
  endpoint: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
    samplerPayload?: Record<string, unknown>;
  } = {},
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
        ...(opts.samplerPayload || { max_tokens: 260, temperature: 0.82 }),
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
    .slice(-16)
    .map((m) => `${m.role === "user" ? "User" : persona.name}: ${m.text}`)
    .join("\n");
  const prompt = `${systemPrompt(persona)}\n\n${transcript}\n${persona.name}:`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
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
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 1500));
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

async function tryOpenAIChatTiers(
  chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  companionName: string,
): Promise<{ text: string; providerUsed: string } | null> {
  const settings = loadRouterSettings();
  // Respect explicit engine choice. Never silently send local-only chats to cloud.
  const allowLocal = settings.provider === "auto" || settings.provider === "local";
  const allowCustom = settings.provider === "auto" || settings.provider === "custom";
  const allowOpenRouter = settings.provider === "auto" || settings.provider === "openrouter";
  const localBudget = localComputeBudget();
  const presetId: SamplerPresetId = settings.samplerPreset || "roleplay-balanced";
  const enableAntiSlop = settings.enableAntiSlop !== false;
  const measure = (text: string, providerUsed: string, startedMs: number) => {
    const elapsedSec = Math.max(0.15, (Date.now() - startedMs) / 1000);
    const estTokens = Math.max(6, Math.round(text.split(/\s+/).length * 1.35));
    reportGenerationSpeed({ tokPerSec: Math.round(estTokens / elapsedSec), lastEngine: providerUsed });
    return { text, providerUsed };
  };

  // Tier 1: Local KoboldCpp (127.0.0.1:5001)
  if (allowLocal && typeof window !== "undefined") {
    const t0 = Date.now();
    const koboldRaw = await fetchOpenAICompat("http://127.0.0.1:5001/v1/chat/completions", chatMessages, {
      model: "koboldcpp",
      timeoutMs: localBudget.timeoutMs,
      samplerPayload: { ...buildSamplerPayload("koboldcpp", presetId, enableAntiSlop), max_tokens: localBudget.maxTokens },
    });
    const koboldClean = sanitizeCompanionReply(koboldRaw, companionName);
    if (koboldClean) return measure(koboldClean, "koboldcpp-local", t0);
  }

  // Tier 2: Local Ollama (127.0.0.1:11434 or configured URL)
  if (allowLocal && typeof window !== "undefined") {
    const t0 = Date.now();
    const ollamaBase = (settings.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    const ollamaRaw = await fetchOpenAICompat(`${ollamaBase}/v1/chat/completions`, chatMessages, {
      model: settings.ollamaModel || "llama3.1:8b",
      timeoutMs: localBudget.timeoutMs,
      samplerPayload: { ...buildSamplerPayload("ollama", presetId, enableAntiSlop), max_tokens: localBudget.maxTokens },
    });
    const ollamaClean = sanitizeCompanionReply(ollamaRaw, companionName);
    if (ollamaClean) return measure(ollamaClean, "ollama-local", t0);
  }

  // Tier 2.5: VelvetMotion Home Engine (:8787 or Cloudflared Quick Tunnel URL)
  if (allowLocal && typeof window !== "undefined") {
    const t0 = Date.now();
    const homeBase = (settings.homeEngineUrl || "http://127.0.0.1:8787").replace(/\/+$/, "");
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), localBudget.timeoutMs);
      const res = await fetch(`${homeBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.ollamaModel || "llama3.1:8b",
          messages: chatMessages,
          samplerPreset: presetId,
          enableAntiSlop,
          ...buildSamplerPayload("koboldcpp", presetId, enableAntiSlop),
          max_tokens: localBudget.maxTokens,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { reply?: string; provider?: string } | null;
        const clean = sanitizeCompanionReply(data?.reply || "", companionName);
        if (clean) return measure(clean, `home-engine-${data?.provider || "local"}`, t0);
      }
    } catch {
      /* home engine offline; continue to BYOK / Cloud fallbacks */
    }
  }

  // Tier 3: User BYOK Custom endpoint or OpenRouter API Key
  if (allowCustom && settings.customBaseUrl) {
    const t0 = Date.now();
    const base = settings.customBaseUrl.replace(/\/+$/, "");
    const customRaw = await fetchOpenAICompat(`${base}/chat/completions`, chatMessages, {
      apiKey: settings.customApiKey,
      model: settings.customModel || "local",
      timeoutMs: 30000,
      samplerPayload: buildSamplerPayload("custom", presetId, enableAntiSlop),
    });
    const customClean = sanitizeCompanionReply(customRaw, companionName);
    if (customClean) return measure(customClean, "byok-custom", t0);
  }

  if (allowOpenRouter && settings.openRouterApiKey) {
    const orRaw = await fetchOpenAICompat("https://openrouter.ai/api/v1/chat/completions", chatMessages, {
      apiKey: settings.openRouterApiKey,
      model: settings.customModel || "meta-llama/llama-3.1-8b-instruct:free",
      timeoutMs: 30000,
      headers: {
        "HTTP-Referer": "https://velvetmotion-ai.hampusi97.workers.dev",
        "X-Title": "VelvetMotion AI",
      },
      samplerPayload: buildSamplerPayload("openrouter", presetId, enableAntiSlop),
    });
    const orClean = sanitizeCompanionReply(orRaw, companionName);
    if (orClean) return { text: orClean, providerUsed: "openrouter-byok" };
  }

  return null;
}

/** One-shot raw prompt runner used by Generative Pace Studio (pre-fetch + live cues). */
export async function runGenerativePrompt(
  system: string,
  user: string,
  companionName: string,
): Promise<string> {
  const safety = assertCompliance(user);
  if (!safety.ok) return "";
  const hit = await tryOpenAIChatTiers(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    companionName,
  );
  return hit?.text || "";
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

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt(persona) },
    ...history.slice(-16).map((m) => ({ role: m.role, content: m.text })),
  ];

  const llmRes = await tryOpenAIChatTiers(chatMessages, persona.name);
  if (llmRes) return llmRes;

  // Tier 4: Free Cloud Route (AI Horde text)
  const provider = loadRouterSettings().provider;
  if (provider === "auto" || provider === "ai-horde") {
    const hordeRaw = await callHordeText(persona, history);
    const hordeClean = sanitizeCompanionReply(hordeRaw, persona.name);
    if (hordeClean) return { text: hordeClean, providerUsed: "ai-horde" };
  }

  // Never disguise a connection failure as a generated conversational reply.
  return {
    text: "The AI model isn't responding right now. Check your selected provider in Settings and retry. Your message wasn't answered by an AI model.",
    providerUsed: "provider-unavailable",
  };
}

/**
 * DavidAU Stop -> Edit -> Continue steering helper: takes a slice ending on the
 * edited companion turn, calls the active LLM via `buildContinueSteeringMessages`,
 * and falls back smoothly if local/cloud endpoints are offline.
 */
export async function continueCompanionScene(
  historyWithEditedLastAssistant: RouterMessage[],
  persona: CompanionPersona,
): Promise<{ text: string; providerUsed: string }> {
  const lastAssistantText =
    [...historyWithEditedLastAssistant].reverse().find((m) => m.role === "assistant")?.text || "";
  const safety = assertCompliance(lastAssistantText);
  if (!safety.ok) {
    return { text: safety.reason, providerUsed: "compliance-guard" };
  }

  const steeringMessages = buildContinueSteeringMessages(
    systemPrompt(persona),
    historyWithEditedLastAssistant.map((m) => ({ role: m.role, content: m.text })),
  );

  const llmRes = await tryOpenAIChatTiers(steeringMessages, persona.name);
  if (llmRes) return llmRes;

  return {
    text: "The AI model isn't responding. Check your provider settings and retry continuing the scene.",
    providerUsed: "provider-unavailable",
  };
}
