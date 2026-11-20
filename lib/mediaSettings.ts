/** Optional user-configured media backends in browser storage. Actual generation depends on connected compatible services. */

export type MediaBackendSettings = {
  /** e.g. http://127.0.0.1:8188 or A1111/Forge /sdapi/v1/txt2img base */
  localImageBase: string;
  /** Path style: comfy | forge | custom-prompt-url */
  localImageMode: "comfy" | "forge" | "prompt-url";
  /** Optional installed CheckpointLoaderSimple model selected in the Studio. */
  comfyCheckpoint: string;
  /** Selected per-request Stable Diffusion WebUI / Forge checkpoint title. */
  a1111Checkpoint: string;
  /** Denoise strength for reference-based img2img, from 0.05 to 0.95. */
  a1111Denoise: number;
  /** Optional img2vid endpoint that accepts image URL + prompt */
  img2vidUrl: string;
  /** Use a local ComfyUI API-format video workflow when no generic video endpoint is set. */
  comfyVideoEnabled: boolean;
  comfyVideoBase: string;
  comfyVideoWorkflowJson: string;
  comfyVideoImageNodeId: string;
  comfyVideoPromptNodeId: string;
  /** Optional reference-aware img2img bridge URL for original fictional artwork. */
  img2imgUrl: string;
  /** Pollinations / external API key if needed for video */
  pollinationsKey: string;
  /** Prefer local when set */
  preferLocal: boolean;
  /** Force same face seed from Create photo into every mood */
  aggressiveFaceLock: boolean;
};

const KEY = "vm-media-backend";

export const LOCAL_COMFY_VIDEO_URL = "http://127.0.0.1:8787/generate-video";

export function localComfyVideoHealthUrl(endpoint: string): string | null {
  try {
    const url = new URL(endpoint);
    if (!(["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) ||
      url.pathname !== "/generate-video" || url.username || url.password) return null;
    return new URL("/video/health", url).href;
  } catch {
    return null;
  }
}

const DEFAULTS: MediaBackendSettings = {
  localImageBase: "",
  localImageMode: "prompt-url",
  comfyCheckpoint: "",
  a1111Checkpoint: "",
  a1111Denoise: 0.55,
  img2vidUrl: "",
  comfyVideoEnabled: false,
  comfyVideoBase: "http://127.0.0.1:8188",
  comfyVideoWorkflowJson: "",
  comfyVideoImageNodeId: "",
  comfyVideoPromptNodeId: "",
  img2imgUrl: "",
  pollinationsKey: "",
  preferLocal: false,
  aggressiveFaceLock: true,
};

export function getMediaSettings(): MediaBackendSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMediaSettings(partial: Partial<MediaBackendSettings>) {
  if (typeof window === "undefined") return;
  const next = { ...getMediaSettings(), ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

/** Per-character face seed override from Create upload */
const FACE_PREFIX = "vm-face-seed-";

export function setCharacterFaceSeed(characterId: string, seed: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FACE_PREFIX + characterId, String(seed));
  } catch {
    /* */
  }
}

export function getCharacterFaceSeed(characterId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(FACE_PREFIX + characterId);
    if (v === null) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
