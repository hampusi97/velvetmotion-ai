/** Advanced backend toggles — stored in localStorage. No secrets leave the device. */

const KEY = "vm-advanced-config";

export type AdvancedConfig = {
  ollamaUrl: string; // e.g. http://localhost:11434
  ollamaModel: string;
  useWebLLM: boolean;
  telegramBotToken: string; // user-provided, never sent to our servers
  discordWebhook: string;
};

const DEFAULTS: AdvancedConfig = {
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  useWebLLM: false,
  telegramBotToken: "",
  discordWebhook: "",
};

export function loadAdvancedConfig(): AdvancedConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveAdvancedConfig(partial: Partial<AdvancedConfig>) {
  if (typeof window === "undefined") return;
  const next = { ...loadAdvancedConfig(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
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
