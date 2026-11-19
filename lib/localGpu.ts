/**
 * WebGPU local inference detection + helpers.
 * Runs on the visitor's GPU when available.
 * Falls back to free cloud (AI Horde / Cloudflare Flux) otherwise.
 */

export type GpuStatus = {
  webgpu: boolean;
  adapter: string | null;
  vendor: string | null;
  limits: { maxBufferSize?: number } | null;
};

export async function detectGpu(): Promise<GpuStatus> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return { webgpu: false, adapter: null, vendor: null, limits: null };
  }
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) return { webgpu: false, adapter: null, vendor: null, limits: null };
    const info = await adapter.requestAdapterInfo?.() || {};
    return {
      webgpu: true,
      adapter: adapter.name || "WebGPU",
      vendor: info.vendor || null,
      limits: { maxBufferSize: adapter.limits?.maxBufferSize },
    };
  } catch {
    return { webgpu: false, adapter: null, vendor: null, limits: null };
  }
}

export async function canRunLocalImage(): Promise<boolean> {
  const gpu = await detectGpu();
  if (!gpu.webgpu) return false;
  // Rough heuristic: need ~1GB+ buffer headroom for a small quantized model
  const max = gpu.limits?.maxBufferSize ?? 0;
  return max > 512 * 1024 * 1024;
}

/**
 * Placeholder for local image generation via transformers.js / ONNX.
 * Wire a real model (e.g. Janus-Pro 1B q4 or SD-Turbo ONNX) here when ready.
 * Returns null so callers fall back to cloud.
 */
export async function generateLocalBrowserImage(
  _prompt: string,
  _opts?: { width?: number; height?: number }
): Promise<{ url: string; note: string } | null> {
  const ok = await canRunLocalImage();
  if (!ok) return null;
  // TODO: load @huggingface/transformers pipeline("text-to-image", "onnx-community/...")
  // For now return null so free cloud path is used.
  return null;
}

export function freeStackInfo() {
  return {
    images: "AI Horde (nsfw:true) + Cloudflare Flux",
    video: "Image sequence + optional local ComfyUI/Wan",
    voice: "Browser SpeechSynthesis",
    chat: "Cloud LLM or WebLLM (local)",
    hosting: "Cloudflare Pages / Workers static assets",
  };
}
