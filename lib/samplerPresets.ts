/**
 * VelvetMotion AI — DavidAU Sampler, Anti-Slop & Edit-Continue Steering (`lib/samplerPresets.ts`)
 *
 * Adapted from Apache-2.0 guide:
 * https://huggingface.co/DavidAU/Maximizing-Model-Performance-All-Quants-Types-And-Full-Precision-by-Samplers_Parameters
 *
 * Plugs directly into `lib/chatRouter.ts`, `components/CharacterChat.tsx`, and
 * `velvetmotion_home_engine.py` to stop repetition, block AI clichés,
 * support Stop -> Edit -> Continue steering, and maximize roleplay quality.
 */

export type SamplerPresetId = 'roleplay-balanced' | 'creative-dry-class3' | 'ultra-prose-class4';

export interface SamplerPreset {
  id: SamplerPresetId;
  label: string;
  badge: string;
  description: string;
  standard: {
    temperature: number;
    top_p: number;
    max_tokens: number;
    presence_penalty: number;
    frequency_penalty: number;
  };
  localExtended: {
    min_p: number;
    top_k: number;
    repeat_penalty: number;
    repeat_last_n: number;
    dry_multiplier?: number;
    dry_allowed_length?: number;
    dry_base?: number;
    smoothing_factor?: number;
    smoothing_curve?: number;
    dynatemp_range?: number;
    dynatemp_exponent?: number;
  };
}

/** Curated Anti-Slop cliché phrases for KoboldCpp / llama.cpp generation-level banning */
export const ANTI_SLOP_BAN_PHRASES: string[] = [
  'shivers down my spine',
  'shiver down my spine',
  'a testament to',
  "couldn't help but",
  'eyes widened',
  'a mixture of',
  'tapestry of',
  'symphony of',
  'unspoken promise',
  'as an ai',
  'how can i assist you',
  'how can i help you today',
];

export const DAVIDAU_SAMPLER_PRESETS: Record<SamplerPresetId, SamplerPreset> = {
  'roleplay-balanced': {
    id: 'roleplay-balanced',
    label: 'Roleplay Balanced (Class 1–2)',
    badge: 'DEFAULT · ALL APPS',
    description:
      'DavidAU core roleplay defaults: crisp 2–4 sentence turns (max 260 tokens), min_p 0.05, repeat_last_n 64 — works on Ollama, KoboldCpp, and OpenRouter.',
    standard: {
      temperature: 0.82,
      top_p: 0.95,
      max_tokens: 260,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
    },
    localExtended: {
      min_p: 0.05,
      top_k: 40,
      repeat_penalty: 1.08,
      repeat_last_n: 64,
    },
  },
  'creative-dry-class3': {
    id: 'creative-dry-class3',
    label: 'Anti-Repeat Creative (Class 3 + DRY)',
    badge: 'KOBOLDCPP / LLAMA.CPP',
    description:
      'Adds DRY (Don’t Repeat Yourself) + Quadratic Smoothing + Anti-Slop to stop word/phrase loops on creative 12B–24B roleplay models.',
    standard: {
      temperature: 0.95,
      top_p: 0.95,
      max_tokens: 280,
      presence_penalty: 0.1,
      frequency_penalty: 0.25,
    },
    localExtended: {
      min_p: 0.05,
      top_k: 60,
      repeat_penalty: 1.1,
      repeat_last_n: 64,
      dry_multiplier: 0.8,
      dry_allowed_length: 2,
      dry_base: 1.0,
      smoothing_factor: 1.5,
      smoothing_curve: 1.0,
    },
  },
  'ultra-prose-class4': {
    id: 'ultra-prose-class4',
    label: 'Ultra Human Prose (Class 4 + DynaTemp)',
    badge: 'MAX EXPRESSIVENESS',
    description:
      'High-creativity DavidAU Class 4 tuning with DRY, Quadratic Smoothing, Dynamic Temperature, and Anti-Slop for vivid human-like dialogue.',
    standard: {
      temperature: 1.25,
      top_p: 0.95,
      max_tokens: 300,
      presence_penalty: 0.2,
      frequency_penalty: 0.5,
    },
    localExtended: {
      min_p: 0.05,
      top_k: 80,
      repeat_penalty: 1.12,
      repeat_last_n: 64,
      dry_multiplier: 1.0,
      dry_allowed_length: 2,
      dry_base: 1.5,
      smoothing_factor: 3.5,
      smoothing_curve: 1.75,
      dynatemp_range: 0.5,
      dynatemp_exponent: 1.0,
    },
  },
};

export const SAMPLER_PRESET_LIST: SamplerPreset[] = [
  DAVIDAU_SAMPLER_PRESETS['roleplay-balanced'],
  DAVIDAU_SAMPLER_PRESETS['creative-dry-class3'],
  DAVIDAU_SAMPLER_PRESETS['ultra-prose-class4'],
];

/** Recommended DavidAU NEO Imatrix GGUFs (IQ4_XS sweet spot) + optimization tools */
export const DAVIDAU_RECOMMENDED_GGUFS = [
  {
    id: 'l3-8b-stheno-neo',
    name: 'L3-8B-Stheno-v3.2-Ultra-NEO-V1-IMATRIX (IQ4_XS)',
    ramTier: '8gb-lite',
    ramLabel: '8 GB Lite',
    note: 'IQ4_XS NEO Imatrix gives stronger emotional nuance while keeping RAM free for long chat memory.',
    recommendedPreset: 'roleplay-balanced' as SamplerPresetId,
    url: 'https://huggingface.co/DavidAU/L3-8B-Stheno-v3.2-Ultra-NEO-V1-IMATRIX-GGUF',
  },
  {
    id: 'mn-grand-gutenberg-23b',
    name: 'MN-GRAND-Gutenberg-Lyra4-Lyra-23.5B (IQ4_XS / Q4_K_M)',
    ramTier: '32gb-ultra',
    ramLabel: '32 GB Ultra',
    note: 'Rich human-prose roleplay model tailored for 32 GB RAM rigs.',
    recommendedPreset: 'creative-dry-class3' as SamplerPresetId,
    url: 'https://huggingface.co/DavidAU/MN-GRAND-Gutenberg-Lyra4-Lyra-23.5B-GGUF',
  },
];

export const DAVIDAU_RESOURCES = {
  samplersGuide:
    'https://huggingface.co/DavidAU/Maximizing-Model-Performance-All-Quants-Types-And-Full-Precision-by-Samplers_Parameters',
  autoCorrectTool:
    'https://huggingface.co/DavidAU/AI_Autocorrect__Auto-Creative-Enhancement__Auto-Low-Quant-Optimization__gguf-exl2-hqq-SOFTWARE',
  antiSlopRepo: 'https://github.com/sam-paech/antislop-sampler',
};

/**
 * Builds the exact request payload fields for OpenRouter, Ollama, or KoboldCpp,
 * optionally attaching Anti-Slop banned phrases for KoboldCpp.
 */
export function buildSamplerPayload(
  provider: 'koboldcpp' | 'ollama' | 'openrouter' | 'custom',
  presetId: SamplerPresetId = 'roleplay-balanced',
  enableAntiSlop = true,
): Record<string, unknown> {
  const preset = DAVIDAU_SAMPLER_PRESETS[presetId] ?? DAVIDAU_SAMPLER_PRESETS['roleplay-balanced'];

  if (provider === 'koboldcpp') {
    return {
      ...preset.standard,
      ...preset.localExtended,
      ...(enableAntiSlop ? { banned_tokens: ANTI_SLOP_BAN_PHRASES } : {}),
    };
  }

  if (provider === 'ollama') {
    return {
      ...preset.standard,
      options: {
        temperature: preset.standard.temperature,
        top_p: preset.standard.top_p,
        min_p: preset.localExtended.min_p,
        top_k: preset.localExtended.top_k,
        repeat_penalty: preset.localExtended.repeat_penalty,
        repeat_last_n: preset.localExtended.repeat_last_n,
        num_predict: preset.standard.max_tokens,
      },
    };
  }

  return { ...preset.standard };
}

/**
 * Implements DavidAU's "Stop -> Edit -> Continue" steering pattern:
 * takes the chat history ending with the user's edited companion message and
 * instructs the model to seamlessly continue from that exact steer.
 */
export function buildContinueSteeringMessages(
  systemPrompt: string,
  historyWithEditedLastAssistant: Array<{ role: 'user' | 'assistant'; content: string }>,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    {
      role: 'system',
      content: `${systemPrompt}\n\nSTEERING INSTRUCTION: Seamlessly continue the scene directly from the last assistant message without repeating it. Match its exact tone and direction in 1–3 natural sentences.`,
    },
    ...historyWithEditedLastAssistant.slice(-16),
    {
      role: 'user',
      content: '[Continue naturally from your last line without repeating what you already said.]',
    },
  ];
}
