/**
 * Zero-server 5-tier Chat Router + <think> sanitizer.
 * Priority:
 *  1. Local KoboldCpp (127.0.0.1:5001/v1/chat/completions)
 *  2. Local Ollama (127.0.0.1:11434/v1/chat/completions)
 *  3. User BYOK / OpenRouter (customBaseUrl or openRouterApiKey)
 *  4. Free Cloud Route (AI Horde / OpenRouter free tier)
 *  5. Context-Aware In-Character Fallback
 *
 * Every tier retries once on network errors, non-2xx, malformed JSON, and empty
 * completions. Timeouts do not retry — a slow endpoint falls through. The last
 * tier always returns in-character text.
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
  traits?: string[];
  kink?: string;
  voiceStyle?: string;
  /** This character's own example line. Fallback replies lead with it. */
  voiceLine?: string;
}

export interface ChatRouterSettings {
  provider: "auto" | "openrouter" | "ai-horde" | "custom" | "local";
  openRouterApiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  /** Explicit model choice should not be intercepted by KoboldCpp. */
  preferredLocalRuntime?: "auto" | "ollama" | "koboldcpp";
  homeEngineUrl?: string;
  aiHordeApiKey?: string;
  samplerPreset?: SamplerPresetId;
  enableAntiSlop?: boolean;
}

const KEY = "velvetmotion_llm_settings";

/** Per-attempt budget for cloud and auto-mode chat calls. */
export const CHAT_REQUEST_TIMEOUT_MS = 12_000;

export type ChatRouterRuntime = {
  settings?: ChatRouterSettings;
  fetchImpl?: typeof fetch;
  /** Overrides the per-attempt timeout. Timeouts do not retry. */
  timeoutMs?: number;
};

function runtimeSettings(runtime?: ChatRouterRuntime): ChatRouterSettings {
  return runtime?.settings ?? loadRouterSettings();
}

function readCompletionText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return "";
  const choice = choices[0] as {
    message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown };
    text?: unknown;
  };
  const content = choice.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object" || !("text" in part)) return "";
        const typed = part as { type?: unknown; text?: unknown };
        const kind = typeof typed.type === "string" ? typed.type.toLowerCase() : "";
        if (kind === "reasoning" || kind === "thinking" || kind === "reasoning_content") return "";
        return typeof typed.text === "string" ? typed.text : "";
      })
      .join("");
  }
  return typeof choice.text === "string" ? choice.text : "";
}

function readHomeReply(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const reply = (data as { reply?: unknown }).reply;
  return typeof reply === "string" ? reply : "";
}

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
  const extraSceneContext = [p.extraSceneContext, p.memoryBlock].filter(Boolean).join("\n");
  return buildDynamicSystemPrompt({
    companion: {
      id: p.id,
      name: p.name,
      age: Math.max(18, p.age),
      personality: [p.tagline, p.personality].filter(Boolean).join(" "),
      backstory: p.backstory || "",
      mood: p.recentMood,
      traits: p.traits,
      kink: p.kink,
      voiceStyle: p.voiceStyle,
      voiceLine: p.voiceLine,
    },
    memories: p.memories || [],
    relationshipLevel: p.relationshipLevel ?? 1,
    recentMood: p.recentMood,
    extraSceneContext: extraSceneContext || undefined,
  });
}

/** Dev console line, plus any build when `?chatDebug=1` or localStorage `vm_chat_debug=1`. */
export function chatDebugBadgeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("vm_chat_debug") === "1") return true;
    return new URLSearchParams(window.location.search).get("chatDebug") === "1";
  } catch {
    return false;
  }
}

export function noteChatReplySource(info: { character: string; providerUsed: string; detail?: string }) {
  const dev = process.env.NODE_ENV !== "production";
  if (!dev && !chatDebugBadgeEnabled()) return;
  const detail = info.detail ? ` (${info.detail})` : "";
  console.info(`[velvetmotion-chat] ${info.character} source=${info.providerUsed}${detail}`);
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
    extraBody?: Record<string, unknown>;
    fetchImpl?: typeof fetch;
    parse?: (data: unknown) => string;
  } = {},
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? CHAT_REQUEST_TIMEOUT_MS;
  const parse = opts.parse ?? readCompletionText;

  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(endpoint, {
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
          ...(opts.extraBody || {}),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        if (attempt === 0) continue;
        return "";
      }
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        if (attempt === 0) continue;
        return "";
      }
      const text = parse(parsed).trim();
      if (!text) {
        if (attempt === 0) continue;
        return "";
      }
      return text;
    } catch {
      // A timeout means the endpoint is too slow — fall through immediately.
      if (ctrl.signal.aborted) return "";
      if (attempt === 0) continue;
      return "";
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

async function callHordeText(
  persona: CompanionPersona,
  history: RouterMessage[],
  runtime?: ChatRouterRuntime,
): Promise<string> {
  const fetchImpl = runtime?.fetchImpl ?? fetch;
  const timeoutMs = runtime?.timeoutMs ?? CHAT_REQUEST_TIMEOUT_MS;
  const started = Date.now();
  const remaining = () => Math.max(0, timeoutMs - (Date.now() - started));
  const transcript = history
    .slice(-16)
    .map((m) => `${m.role === "user" ? "User" : persona.name}: ${m.text}`)
    .join("\n");
  const prompt = `${systemPrompt(persona)}\n\n${transcript}\n${persona.name}:`;
  const apiKey = runtimeSettings(runtime).aiHordeApiKey || "0000000000";

  const submit = async (): Promise<{ id: string; retryable: boolean }> => {
    const budget = remaining();
    if (budget < 400) return { id: "", retryable: false };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), budget);
    try {
      const res = await fetchImpl("https://aihorde.net/api/v2/generate/text/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          "Client-Agent": "VelvetMotionAI:2.0:web",
        },
        body: JSON.stringify({
          prompt,
          params: {
            max_length: 240,
            temperature: 0.85,
            stop_sequence: ["\nUser:", `\n${persona.name}:`],
          },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) return { id: "", retryable: true };
      let data: { id?: unknown };
      try {
        data = (await res.json()) as { id?: unknown };
      } catch {
        return { id: "", retryable: true };
      }
      return { id: typeof data?.id === "string" ? data.id : "", retryable: true };
    } catch {
      return { id: "", retryable: !ctrl.signal.aborted };
    } finally {
      clearTimeout(timer);
    }
  };

  let submitted = await submit();
  if (!submitted.id && submitted.retryable) submitted = await submit();
  if (!submitted.id) return "";

  while (remaining() > 500) {
    const wait = Math.min(1500, remaining() - 300);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (remaining() < 200) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), remaining());
    try {
      const statusRes = await fetchImpl(
        `https://aihorde.net/api/v2/generate/text/status/${submitted.id}`,
        { signal: ctrl.signal },
      );
      if (!statusRes.ok) continue;
      const st = (await statusRes.json()) as {
        done?: boolean;
        faulted?: boolean;
        generations?: Array<{ text?: string }>;
      };
      if (st.done) {
        const text = (st.generations?.[0]?.text || "").split(/\nUser:/i)[0].trim();
        if (text) return text;
        return "";
      }
      if (st.faulted) return "";
    } catch {
      if (ctrl.signal.aborted) return "";
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

/**
 * Tier 5: Context-aware in-character fallback referencing the actual message topic
 * (movies, music, flirting, feelings, selfies, etc.) with companion personality.
 */
function voiceRegister(persona: CompanionPersona): "command" | "shy" | "tease" | "warm" {
  const blob = [persona.personality, persona.voiceStyle, persona.kink, ...(persona.traits || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(domin|command|protocol|exact|unhurried|service)\b/.test(blob)) return "command";
  if (/\b(shy|fluster|gentle|quiet|breath|earnest)\b/.test(blob)) return "shy";
  if (/\b(tease|edging|radio|sadist|control)\b/.test(blob)) return "tease";
  return "warm";
}

/**
 * Tier 5. Uses this character's own example line and register.
 * Topic keywords do not swap in a shared script.
 */
export function buildContextAwareFallback(
  history: RouterMessage[],
  persona: CompanionPersona,
): string {
  const first = persona.name.split(/\s+/)[0] || persona.name;
  const heard = ([...history].reverse().find((m) => m.role === "user")?.text || "")
    .replace(/["“”\n]/g, "")
    .trim()
    .slice(0, 120);
  const heardBit = heard ? `${heard}. ` : "";
  const register = voiceRegister(persona);
  const reaction =
    register === "command"
      ? `*${first} does not raise her voice.* “${heardBit}Again. Slower, and look at me.”`
      : register === "shy"
        ? `*${first} keeps the sentence small.* “${heardBit}I like that you said it out loud. Tell me the quiet part too.”`
        : register === "tease"
          ? `*${first} lets the pause do the work.* “${heardBit}Not yet. Finish the thought and keep your hands still.”`
          : `*${first} answers as herself, not as a hostess script.* “${heardBit}Stay on that. I want the next honest detail.”`;
  const anchor = persona.voiceLine?.trim();
  return [anchor, reaction].filter(Boolean).join("\n\n");
}

async function tryOpenAIChatTiers(
  chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  companionName: string,
  runtime?: ChatRouterRuntime,
): Promise<{ text: string; providerUsed: string } | null> {
  const settings = runtimeSettings(runtime);
  // Respect explicit engine choice. Never silently send local-only chats to cloud.
  const allowLocal = settings.provider === "auto" || settings.provider === "local";
  const allowCustom = settings.provider === "auto" || settings.provider === "custom";
  const allowOpenRouter = settings.provider === "auto" || settings.provider === "openrouter";
  const localBudget = localComputeBudget();
  const presetId: SamplerPresetId = settings.samplerPreset || "roleplay-balanced";
  const enableAntiSlop = settings.enableAntiSlop !== false;
  const fetchImpl = runtime?.fetchImpl;
  const cloudTimeout = runtime?.timeoutMs ?? CHAT_REQUEST_TIMEOUT_MS;
  const localTimeout =
    runtime?.timeoutMs ?? (settings.provider === "local" ? localBudget.timeoutMs : CHAT_REQUEST_TIMEOUT_MS);
  const measure = (text: string, providerUsed: string, startedMs: number) => {
    const elapsedSec = Math.max(0.15, (Date.now() - startedMs) / 1000);
    const estTokens = Math.max(6, Math.round(text.split(/\s+/).length * 1.35));
    reportGenerationSpeed({ tokPerSec: Math.round(estTokens / elapsedSec), lastEngine: providerUsed });
    return { text, providerUsed };
  };

  // Tier 1: Local KoboldCpp (127.0.0.1:5001)
  if (allowLocal && settings.preferredLocalRuntime !== "ollama" && typeof window !== "undefined") {
    const t0 = Date.now();
    const koboldRaw = await fetchOpenAICompat("http://127.0.0.1:5001/v1/chat/completions", chatMessages, {
      model: "koboldcpp",
      timeoutMs: localTimeout,
      fetchImpl,
      samplerPayload: { ...buildSamplerPayload("koboldcpp", presetId, enableAntiSlop), max_tokens: localBudget.maxTokens },
    });
    const koboldClean = sanitizeCompanionReply(koboldRaw, companionName);
    if (koboldClean) return measure(koboldClean, "koboldcpp-local", t0);
  }

  // Tier 2: Local Ollama (127.0.0.1:11434 or configured URL)
  if (allowLocal && settings.preferredLocalRuntime !== "koboldcpp" && typeof window !== "undefined") {
    const t0 = Date.now();
    const ollamaBase = (settings.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    const ollamaRaw = await fetchOpenAICompat(`${ollamaBase}/v1/chat/completions`, chatMessages, {
      model: settings.ollamaModel || "llama3.1:8b",
      timeoutMs: localTimeout,
      fetchImpl,
      samplerPayload: { ...buildSamplerPayload("ollama", presetId, enableAntiSlop), max_tokens: localBudget.maxTokens },
      extraBody: { think: false },
    });
    const ollamaClean = sanitizeCompanionReply(ollamaRaw, companionName);
    if (ollamaClean) return measure(ollamaClean, "ollama-local", t0);
  }

  // Tier 2.5: VelvetMotion Home Engine (:8787 or Cloudflared Quick Tunnel URL)
  if (allowLocal && typeof window !== "undefined") {
    const t0 = Date.now();
    const homeBase = (settings.homeEngineUrl || "http://127.0.0.1:8787").replace(/\/+$/, "");
    const homeRaw = await fetchOpenAICompat(`${homeBase}/api/chat`, chatMessages, {
      model: settings.ollamaModel || "llama3.1:8b",
      timeoutMs: localTimeout,
      fetchImpl,
      samplerPayload: {
        ...buildSamplerPayload("koboldcpp", presetId, enableAntiSlop),
        max_tokens: localBudget.maxTokens,
      },
      extraBody: { samplerPreset: presetId, enableAntiSlop },
      parse: readHomeReply,
    });
    const clean = sanitizeCompanionReply(homeRaw, companionName);
    if (clean) return measure(clean, "home-engine-local", t0);
  }

  // Tier 3: User BYOK Custom endpoint or OpenRouter API Key
  if (allowCustom && settings.customBaseUrl) {
    const t0 = Date.now();
    const base = settings.customBaseUrl.replace(/\/+$/, "");
    const customRaw = await fetchOpenAICompat(`${base}/chat/completions`, chatMessages, {
      apiKey: settings.customApiKey,
      model: settings.customModel || "local",
      timeoutMs: cloudTimeout,
      fetchImpl,
      samplerPayload: buildSamplerPayload("custom", presetId, enableAntiSlop),
    });
    const customClean = sanitizeCompanionReply(customRaw, companionName);
    if (customClean) return measure(customClean, "byok-custom", t0);
  }

  if (allowOpenRouter && settings.openRouterApiKey) {
    const orRaw = await fetchOpenAICompat("https://openrouter.ai/api/v1/chat/completions", chatMessages, {
      apiKey: settings.openRouterApiKey,
      model: settings.customModel || "meta-llama/llama-3.1-8b-instruct:free",
      timeoutMs: cloudTimeout,
      fetchImpl,
      headers: {
        "HTTP-Referer": "https://velvetmotion-ai.hampusi97.workers.dev",
        "X-Title": "VelvetMotion AI",
      },
      samplerPayload: buildSamplerPayload("openrouter", presetId, enableAntiSlop),
      extraBody: { reasoning: { exclude: true } },
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

/** Guarantees a non-empty companion line, using the in-character engine when a model returns nothing. */
export function ensureVisibleReply(
  text: string,
  history: RouterMessage[],
  persona: CompanionPersona,
): string {
  const trimmed = (text || "").trim();
  if (trimmed) return trimmed;
  const fallback = buildContextAwareFallback(history, persona);
  return sanitizeCompanionReply(fallback, persona.name).trim() || fallback;
}

function publishReply(
  persona: CompanionPersona,
  result: { text: string; providerUsed: string },
  detail?: string,
) {
  noteChatReplySource({ character: persona.name, providerUsed: result.providerUsed, detail });
  return result;
}

export async function generateCompanionReply(
  history: RouterMessage[],
  persona: CompanionPersona,
  runtime?: ChatRouterRuntime,
): Promise<{ text: string; providerUsed: string }> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.text || "";
  const safety = assertCompliance(lastUser);
  if (!safety.ok) {
    return publishReply(persona, { text: safety.reason, providerUsed: "compliance-guard" }, "compliance block");
  }

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt(persona) },
    ...history.slice(-16).map((m) => ({ role: m.role, content: m.text })),
  ];

  const llmRes = await tryOpenAIChatTiers(chatMessages, persona.name, runtime);
  if (llmRes?.text.trim()) return publishReply(persona, llmRes);

  // Tier 4: Free Cloud Route (AI Horde text) — secondary provider when auto/horde is selected.
  const provider = runtimeSettings(runtime).provider;
  if (provider === "auto" || provider === "ai-horde") {
    const hordeRaw = await callHordeText(persona, history, runtime);
    const hordeClean = sanitizeCompanionReply(hordeRaw, persona.name);
    if (hordeClean) return publishReply(persona, { text: hordeClean, providerUsed: "ai-horde" });
  }

  const fallback = buildContextAwareFallback(history, persona);
  const clean = sanitizeCompanionReply(fallback, persona.name).trim() || fallback;
  return publishReply(
    persona,
    { text: clean, providerUsed: "in-character-fallback" },
    "live model empty, timed out, non-2xx, malformed, or unreachable",
  );
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
    return publishReply(persona, { text: safety.reason, providerUsed: "compliance-guard" }, "compliance block");
  }

  const steeringMessages = buildContinueSteeringMessages(
    systemPrompt(persona),
    historyWithEditedLastAssistant.map((m) => ({ role: m.role, content: m.text })),
  );

  const llmRes = await tryOpenAIChatTiers(steeringMessages, persona.name);
  if (llmRes?.text.trim()) return publishReply(persona, llmRes);

  const historyForVoice = historyWithEditedLastAssistant.some((m) => m.role === "user")
    ? historyWithEditedLastAssistant
    : [...historyWithEditedLastAssistant, { role: "user" as const, text: "Continue the scene with me." }];
  const fallback = buildContextAwareFallback(historyForVoice, persona);
  return publishReply(
    persona,
    { text: fallback, providerUsed: "in-character-fallback" },
    "continue had no model completion",
  );
}
