/** Advanced backend toggles — stored in localStorage. No secrets leave the device. */

const KEY = "vm-advanced-config";
export const CHAT_ROUTER_SETTINGS_KEY = "velvetmotion_llm_settings";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

export type AdvancedConfig = {
  ollamaUrl: string; // e.g. http://localhost:11434
  ollamaModel: string;
  useWebLLM: boolean;
  telegramBotToken: string; // user-provided, never sent to our servers
  discordWebhook: string;
};

const DEFAULTS: AdvancedConfig = {
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: "llama3.1:8b",
  useWebLLM: false,
  telegramBotToken: "",
  discordWebhook: "",
};

function readSettings(key: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function nonemptyString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function loadAdvancedConfig(): AdvancedConfig {
  const advanced = readSettings(KEY);
  const router = readSettings(CHAT_ROUTER_SETTINGS_KEY);
  return {
    ...DEFAULTS,
    ...advanced,
    ollamaUrl: (nonemptyString(router.ollamaUrl) || nonemptyString(advanced.ollamaUrl) || DEFAULT_OLLAMA_URL).replace(/\/+$/, ""),
    ollamaModel: nonemptyString(router.ollamaModel) || nonemptyString(advanced.ollamaModel) || DEFAULTS.ollamaModel,
  };
}

export function saveAdvancedConfig(partial: Partial<AdvancedConfig>) {
  if (typeof window === "undefined") return;
  const next = { ...loadAdvancedConfig(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  if (partial.ollamaUrl !== undefined || partial.ollamaModel !== undefined) {
    const router = readSettings(CHAT_ROUTER_SETTINGS_KEY);
    localStorage.setItem(CHAT_ROUTER_SETTINGS_KEY, JSON.stringify({
      ...router,
      ollamaUrl: nonemptyString(next.ollamaUrl) || DEFAULT_OLLAMA_URL,
      ollamaModel: nonemptyString(next.ollamaModel) || DEFAULTS.ollamaModel,
    }));
  }
}

/**
 * Future: point chat API at local Ollama when configured.
 * WebLLM can load a small model in-browser (WebGPU) for offline replies.
 * Telegram/Discord: use token/webhook from this config in a serverless bridge.
 */
export function describeAdvancedSetup(): string {
  return [
    "Ollama: run `ollama serve` locally, set URL + model here, then chat can route to it.",
    "WebLLM: enable for browser-side inference (needs WebGPU, first load is large).",
    "Telegram: paste a bot token from @BotFather — a future worker will relay messages.",
    "Discord: paste a webhook URL for tribute alerts or dual-girl digests.",
  ].join(" ");
}
