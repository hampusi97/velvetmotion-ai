/** Curated optional local companion text models.
 * All weights are user-installed; VelvetMotion never bundles or downloads them.
 * Ollama tags are verified against the publisher's official model registry.
 */
export interface CompanionTextModel {
  id: string;
  name: string;
  parameters: string;
  purpose: string;
  modelPage: string;
  licenseNote: string;
  ollamaTag?: string;
  setupCommand?: string;
  estimatedDownload?: string;
  ramGuidance: string;
  installationNote?: string;
}
export const COMPANION_TEXT_MODELS: readonly CompanionTextModel[] = [
  {
    id: "hermes3-8b",
    name: "Hermes 3 · Llama 3.1 8B",
    parameters: "8B",
    purpose: "Versatile conversational baseline with roleplay-oriented tuning",
    modelPage: "https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B",
    licenseNote: "Meta Llama 3 Community License — review conditions before redistribution",
    ollamaTag: "hermes3:8b",
    setupCommand: "ollama pull hermes3:8b",
    estimatedDownload: "~4.7 GB quantized",
    ramGuidance: "16 GB RAM recommended as a starting point; GPU and context change requirements",
  },
  {
    id: "yi15-9b",
    name: "Yi 1.5 · 9B Chat",
    parameters: "9B",
    purpose: "General-purpose conversation with multilingual strengths",
    modelPage: "https://huggingface.co/01-ai/Yi-1.5-9B-Chat",
    licenseNote: "Apache 2.0",
    ollamaTag: "yi:9b-v1.5",
    setupCommand: "ollama pull yi:9b-v1.5",
    estimatedDownload: "~5.0 GB quantized",
    ramGuidance: "16 GB RAM recommended as a starting point; GPU and context change requirements",
  },
  {
    id: "internlm25-7b",
    name: "InternLM 2.5 · 7B Chat",
    parameters: "7B",
    purpose: "General-purpose assistant; optional advanced local-server integration",
    modelPage: "https://huggingface.co/internlm/internlm2_5-7b-chat",
    licenseNote: "Custom weight license — review commercial terms before use",
    ramGuidance: "16 GB+ RAM suggested; depends on runtime and quantization",
    installationNote: "No verified official Ollama tag provided here. Run a compatible model server and configure the custom OpenAI-compatible endpoint.",
  },
  {
    id: "humanish-8b",
    name: "Humanish Roleplay · Llama 3.1 8B",
    parameters: "8B",
    purpose: "Roleplay and character consistency; requires a separately configured runtime",
    modelPage: "https://huggingface.co/vicgalle/Humanish-Roleplay-Llama-3.1-8B",
    licenseNote: "Model card: Apache 2.0; also review upstream Llama licensing",
    ramGuidance: "16 GB RAM suggested; depends on runtime and quantization",
    installationNote: "No official Ollama tag verified. Configure a compatible server after downloading and reviewing the weights.",
  },
  {
    id: "openchat-35-1210",
    name: "OpenChat 3.5 · 1210",
    parameters: "7B",
    purpose: "Efficient general chat; 7B rather than a larger-than-9B model",
    modelPage: "https://huggingface.co/openchat/openchat-3.5-1210",
    licenseNote: "Apache 2.0",
    ollamaTag: "openchat:7b-v3.5-1210",
    setupCommand: "ollama pull openchat:7b-v3.5-1210",
    estimatedDownload: "~4.1 GB quantized",
    ramGuidance: "12–16 GB RAM recommended as a starting point; GPU and context change requirements",
  },
] as const;

export function isOfficialOllamaPreset(tag: string): boolean {
  return COMPANION_TEXT_MODELS.some(model => model.ollamaTag === tag);
}

/** Strict comparison: installed model names must match an explicit preset tag. */
export function isModelInstalled(tag: string, installedNames: readonly string[]): boolean {
  return installedNames.some(name => name.trim() === tag);
}

export function installedModelNames(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("models" in payload)) return [];
  const entries = (payload as { models?: unknown }).models;
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => {
    if (!entry || typeof entry !== "object") return "";
    const name = (entry as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }).filter(Boolean).slice(0, 300);
}
