/**
 * Optional local ComfyUI / Forge / Fooocus-style endpoints.
 * Browser CORS often blocks localhost — users may need a local proxy.
 * Inspired by StableCanvas/comfyui-client + ai-dock wrappers.
 */

import { getMediaSettings } from "./mediaSettings";

export type LocalGenRequest = {
  prompt: string;
  seed: number;
  width?: number;
  height?: number;
  negative?: string;
  characterId?: string;
  referenceImageBase64?: string;
};

export type LocalGenResult = {
  ok: boolean;
  imageUrl?: string;
  note: string;
};

const DEFAULT_NEG =
  "low quality, blurry, deformed, extra fingers, watermark, text, logo, underage, child";

export interface ComfyWorkflowOptions {
  prompt: string;
  negativePrompt?: string;
  seed: number;
  width?: number;
  height?: number;
  checkpoint?: string;
  referenceImageBase64?: string;
  ipAdapterWeight?: number;
}

/**
 * Build a ComfyUI txt2img workflow graph, optionally wiring an IP-Adapter
 * face-lock reference node when a reference image is provided.
 */
export function buildComfyWorkflowGraph(opts: ComfyWorkflowOptions): Record<string, unknown> {
  const width = opts.width || 768;
  const height = opts.height || 1152;
  const checkpoint = opts.checkpoint || "flux1-dev-fp8.safetensors";
  const hasRef = Boolean(opts.referenceImageBase64 && opts.referenceImageBase64.length > 32);

  const graph: Record<string, unknown> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: 5.5,
        denoise: 1.0,
        latent_image: ["5", 0],
        model: [hasRef ? "11" : "4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: "euler",
        scheduler: "normal",
        seed: opts.seed,
        steps: 22,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { batch_size: 1, height, width },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: opts.prompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: opts.negativePrompt || DEFAULT_NEG },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "VelvetMotion", images: ["8", 0] },
    },
  };

  if (hasRef) {
    graph["10"] = {
      class_type: "ETN_LoadImageBase64",
      inputs: {
        image: opts.referenceImageBase64!.replace(/^data:[^;]+;base64,/, ""),
      },
    };
    graph["11"] = {
      class_type: "IPAdapterUnifiedLoaderFaceID",
      inputs: {
        model: ["4", 0],
        preset: "FACEID PLUS V2",
        lora_strength: 0.65,
        provider: "CUDA",
        image: ["10", 0],
        weight: opts.ipAdapterWeight ?? 0.85,
      },
    };
  }

  return graph;
}

/** Try Forge/A1111 txt2img style API */
async function tryForge(base: string, req: LocalGenRequest): Promise<LocalGenResult> {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negative || DEFAULT_NEG,
        seed: req.seed,
        width: req.width || 768,
        height: req.height || 1152,
        steps: 20,
        cfg_scale: 5,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { ok: false, note: `Forge HTTP ${res.status}` };
    const data = await res.json();
    const b64 = data.images?.[0];
    if (!b64) return { ok: false, note: "No image in Forge response" };
    return {
      ok: true,
      imageUrl: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
      note: "Local Forge/A1111",
    };
  } catch (e) {
    return {
      ok: false,
      note: `Forge failed (CORS or offline): ${e instanceof Error ? e.message : "error"}`,
    };
  }
}

/** Generic prompt-url style: POST {prompt,seed} → {url|image} */
async function tryCustom(base: string, req: LocalGenRequest): Promise<LocalGenResult> {
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        seed: req.seed,
        width: req.width || 768,
        height: req.height || 1152,
        negative_prompt: req.negative || DEFAULT_NEG,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { ok: false, note: `Custom HTTP ${res.status}` };
    const data = await res.json();
    const url = data.url || data.image || data.images?.[0];
    if (!url) return { ok: false, note: "No url/image in response" };
    return { ok: true, imageUrl: url, note: "Custom local endpoint" };
  } catch (e) {
    return {
      ok: false,
      note: `Custom endpoint failed: ${e instanceof Error ? e.message : "error"}`,
    };
  }
}

export async function generateLocalImage(req: LocalGenRequest): Promise<LocalGenResult> {
  const s = getMediaSettings();
  if (!s.localImageBase) {
    return { ok: false, note: "Set Advanced → Local image base (Comfy/Forge URL)" };
  }

  let refPhoto = req.referenceImageBase64;
  if (!refPhoto && s.aggressiveFaceLock && req.characterId && typeof window !== "undefined") {
    try {
      refPhoto = localStorage.getItem(`vm-ref-photo-${req.characterId}`) || undefined;
    } catch {
      /* ignore */
    }
  }

  // First try server-side /api/comfy proxy (avoids browser CORS and supports ComfyUI + IP-Adapter FaceID)
  if (s.localImageMode === "comfy" || s.localImageMode === "forge") {
    try {
      const apiRes = await fetch("/api/comfy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: s.localImageBase,
          mode: s.localImageMode,
          prompt: req.prompt,
          negative: req.negative || DEFAULT_NEG,
          seed: req.seed,
          width: req.width || 768,
          height: req.height || 1152,
          referenceImageBase64: refPhoto,
        }),
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.ok && data.imageUrl) {
          return { ok: true, imageUrl: data.imageUrl, note: data.note || "Local Comfy/Forge" };
        }
      }
    } catch {
      /* fall through to direct browser fetch or local Python proxy */
    }
  }

  if (s.localImageMode === "forge") return tryForge(s.localImageBase, req);
  if (s.localImageMode === "prompt-url") {
    return tryCustom(s.localImageBase, req);
  }
  return tryCustom(s.localImageBase, req);
}
