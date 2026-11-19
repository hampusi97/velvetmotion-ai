/**
 * VelvetMotion AI — Local RAM/GPU & WebGPU Model Catalog (November 2026)
 *
 * Powers Settings -> Local Ultra Mode and /download RAM-tier recommendations.
 * Maps detected system RAM (via Tauri `get_system_specs()`) to optimal local
 * LLM, Voice/TTS, and Image/Video engines for KoboldCpp, Ollama, ComfyUI, and WebGPU.
 */

export type RamTierId = '8gb-lite' | '16gb-balanced' | '32gb-ultra';
export type ModelKind = 'llm' | 'tts' | 'image' | 'video';
export type RuntimeTarget = 'koboldcpp' | 'ollama' | 'comfyui' | 'webgpu';

export interface LocalModelPreset {
  id: string;
  name: string;
  kind: ModelKind;
  tier: RamTierId;
  runtime: RuntimeTarget;
  minRamGb: number;
  estimatedSize: string;
  badge: string;
  description: string;
  launchCommand: string;
  defaultPort?: number;
}

export interface VoiceEngineOption {
  id: 'kokoro-82m' | 'kitten-tts-2-pico' | 'reverb-tts-webgpu' | 'fish-drama-3-local' | 'browser-speech';
  label: string;
  footprint: string;
  mode: 'browser' | 'desktop-local';
  badge: string;
  description: string;
}

export const VOICE_ENGINE_OPTIONS: VoiceEngineOption[] = [
  {
    id: 'kitten-tts-2-pico',
    label: 'Kitten-TTS-2 Pico (Apache 2.0)',
    footprint: '~4 MB',
    mode: 'browser',
    badge: 'ULTRA LIGHT · 16 LANG',
    description: 'Super-tiny 4 MB open-source neural TTS for instant voice notes on any laptop or phone.',
  },
  {
    id: 'kokoro-82m',
    label: 'Kokoro-82M Neural Voice',
    footprint: '~82 MB',
    mode: 'browser',
    badge: 'DEFAULT · BALANCED',
    description: 'Expressive in-browser neural TTS with dedicated voice IDs per VelvetMotion companion.',
  },
  {
    id: 'reverb-tts-webgpu',
    label: 'Reverb-TTS (WebGPU Zero-Shot)',
    footprint: 'WebGPU Accelerated',
    mode: 'browser',
    badge: '17x REALTIME · CLONING',
    description: 'Open-source zero-shot voice cloning running directly in WebGPU browsers with near-zero latency.',
  },
  {
    id: 'fish-drama-3-local',
    label: 'Fish Audio Drama 3 (Q8_0 GGUF)',
    footprint: 'Local audio.cpp / Desktop',
    mode: 'desktop-local',
    badge: 'ULTRA EXPRESSIVE',
    description: 'Studio-grade emotional pacing, whispering, and dramatic narration via local desktop engine.',
  },
  {
    id: 'browser-speech',
    label: 'Instant System Voice (Fallback)',
    footprint: '0 MB',
    mode: 'browser',
    badge: 'ZERO DOWNLOAD',
    description: 'Built-in OS speech synthesis used automatically if WebGPU/WASM audio is disabled.',
  },
];

export const LOCAL_MODEL_CATALOG: LocalModelPreset[] = [
  // 8 GB LITE TIER
  {
    id: 'llama-8b-q4',
    name: '8B Roleplay GGUF (Q4_K_M)',
    kind: 'llm',
    tier: '8gb-lite',
    runtime: 'koboldcpp',
    minRamGb: 8,
    estimatedSize: '4.9 GB',
    badge: '8 GB LITE · FAST',
    description: 'Snappy uncensored companion chat that fits comfortably inside 8 GB system RAM.',
    launchCommand: 'koboldcpp --model ./models/roleplay-8b-Q4_K_M.gguf --port 5001 --contextsize 8192',
    defaultPort: 5001,
  },
  {
    id: 'kitten-tts-2-web',
    name: 'Kitten-TTS-2 Pico / Nano',
    kind: 'tts',
    tier: '8gb-lite',
    runtime: 'webgpu',
    minRamGb: 4,
    estimatedSize: '4–18 MB',
    badge: '4 MB · 16 LANGUAGES',
    description: 'Runs straight in the browser or Tauri webview with near-zero RAM impact.',
    launchCommand: 'Built-in browser/WebGPU voice engine — select in Settings -> Voice Engine',
  },

  // 16 GB BALANCED TIER
  {
    id: 'qwen36-35b-a3b-moe',
    name: 'Qwen3.6-35B-A3B MTP (Q4_K_XL MoE GGUF)',
    kind: 'llm',
    tier: '16gb-balanced',
    runtime: 'koboldcpp',
    minRamGb: 16,
    estimatedSize: '~19 GB (MoE RAM Offload)',
    badge: 'SWEET SPOT · 3B ACTIVE MoE',
    description: '35B Mixture-of-Experts with only 3B active params/token—runs fast in system RAM + 8 GB GPU with rich emotive roleplay.',
    launchCommand: 'koboldcpp --model ./models/Qwen3.6-35B-A3B-MTP-Q4_K_XL.gguf --port 5001 --contextsize 16384 --gpulayers 24',
    defaultPort: 5001,
  },
  {
    id: 'reverb-tts-webgpu-preset',
    name: 'Reverb-TTS Zero-Shot (WebGPU)',
    kind: 'tts',
    tier: '16gb-balanced',
    runtime: 'webgpu',
    minRamGb: 8,
    estimatedSize: 'WebGPU Cached',
    badge: '17x REALTIME · ZERO-SHOT',
    description: 'High-fidelity zero-shot voice cloning right inside the WebGPU desktop/browser runtime.',
    launchCommand: 'Built-in WebGPU voice engine — select Reverb-TTS in Settings -> Voice Engine',
  },
  {
    id: 'flux-gguf-comfy',
    name: 'FLUX / SDXL GGUF (ComfyUI-GGUF)',
    kind: 'image',
    tier: '16gb-balanced',
    runtime: 'comfyui',
    minRamGb: 16,
    estimatedSize: '6–12 GB',
    badge: 'SHARP LOCAL SELFIES',
    description: 'Quantized FLUX/SDXL portrait generation on 127.0.0.1:8188 with zero cloud rate limits.',
    launchCommand: 'python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header',
    defaultPort: 8188,
  },

  // 32 GB+ ULTRA TIER
  {
    id: 'qwen38-27b-ultra',
    name: 'Qwen3.8-27B (Q4_K_M / 4-bit GGUF)',
    kind: 'llm',
    tier: '32gb-ultra',
    runtime: 'koboldcpp',
    minRamGb: 32,
    estimatedSize: '~16.5 GB',
    badge: 'FLAGSHIP · 80+ TOK/S CLASS',
    description: 'Flagship dense 27B intelligence for deep memory recall, 2-on-1 Group Drama, and zero repetition.',
    launchCommand: 'koboldcpp --model ./models/Qwen3.8-27B-Q4_K_M.gguf --port 5001 --contextsize 32768 --gpulayers 99',
    defaultPort: 5001,
  },
  {
    id: 'fish-drama-3-gguf',
    name: 'Fish Audio Drama 3 (Q8_0 GGUF)',
    kind: 'tts',
    tier: '32gb-ultra',
    runtime: 'koboldcpp',
    minRamGb: 16,
    estimatedSize: '~3.5 GB',
    badge: 'STUDIO WHISPER & DRAMA',
    description: 'Expressive local narration and whisper pacing via local audio.cpp / desktop bridge.',
    launchCommand: 'audio-server --model ./models/fish-drama-3-Q8_0.gguf --port 5002',
    defaultPort: 5002,
  },
  {
    id: 'framepack-wan22-video',
    name: 'FramePack / Wan 2.2 Local Video',
    kind: 'video',
    tier: '32gb-ultra',
    runtime: 'comfyui',
    minRamGb: 32,
    estimatedSize: '14–22 GB',
    badge: 'LOCAL SHORTS & MOTION',
    description: 'Generates smooth image-to-video motion loops locally for Velvet Shorts and Media Studio.',
    launchCommand: 'python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header',
    defaultPort: 8188,
  },
];

export function getRecommendedPresetsForRam(totalRamGb: number): {
  tier: RamTierId;
  label: string;
  presets: LocalModelPreset[];
} {
  if (totalRamGb >= 28) {
    return {
      tier: '32gb-ultra',
      label: '32 GB+ Ultra Tier',
      presets: LOCAL_MODEL_CATALOG.filter((m) => m.tier === '32gb-ultra' || m.id === 'qwen36-35b-a3b-moe'),
    };
  }
  if (totalRamGb >= 14) {
    return {
      tier: '16gb-balanced',
      label: '16 GB Balanced Tier',
      presets: LOCAL_MODEL_CATALOG.filter((m) => m.tier === '16gb-balanced'),
    };
  }
  return {
    tier: '8gb-lite',
    label: '8 GB Lite Tier',
    presets: LOCAL_MODEL_CATALOG.filter((m) => m.tier === '8gb-lite'),
  };
}
