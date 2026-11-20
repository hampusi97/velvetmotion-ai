/**
 * Optional local ComfyUI / Forge / Fooocus-style endpoints.
 * Browser CORS often blocks localhost — users may need a local proxy.
 * Inspired by StableCanvas/comfyui-client + ai-dock wrappers.
 */

import { getMediaSettings } from "./mediaSettings";
import { blobToDataUrl } from "./imageStore";

export type LocalGenRequest = {
  prompt: string;
  seed: number;
  width?: number;
  height?: number;
  negative?: string;
  characterId?: string;
  referenceImageBase64?: string;
  checkpoint?: string;
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
  if (hasRef) {
    throw new Error("Reference-image FaceID requires a compatible, installed IP-Adapter workflow; the basic txt2img workflow cannot guarantee face identity.");
  }

  const graph: Record<string, unknown> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: 5.5,
        denoise: 1.0,
        latent_image: ["5", 0],
        model: ["4", 0],
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

/** Direct ComfyUI workflow runner (works in browser with --enable-cors-header or Tauri desktop). */
export async function tryComfyDirect(baseUrl: string, req: LocalGenRequest): Promise<LocalGenResult> {
  const base = baseUrl.replace(/\/$/, "");
  try {
    const statsRes = await fetch(`${base}/system_stats`, { signal: AbortSignal.timeout(1000) });
    if (!statsRes.ok) return { ok: false, note: `ComfyUI HTTP ${statsRes.status}` };
  } catch {
    return { ok: false, note: "ComfyUI offline" };
  }

  try {
    // A reachable ComfyUI server does not imply the old hard-coded FLUX
    // filename is installed. Ask ComfyUI which checkpoints actually exist.
    const infoRes = await fetch(`${base}/object_info/CheckpointLoaderSimple`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!infoRes.ok) {
      return { ok: false, note: `ComfyUI checkpoint discovery HTTP ${infoRes.status}` };
    }
    const info = (await infoRes.json()) as {
      CheckpointLoaderSimple?: { input?: { required?: { ckpt_name?: string[][] } } };
    };
    const checkpoints = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
    const preferred = req.checkpoint || getMediaSettings().comfyCheckpoint;
    if (preferred && !checkpoints.includes(preferred)) {
      return { ok: false, note: `Selected ComfyUI model "${preferred.slice(0, 100)}" is not installed. Choose an available checkpoint in the Studio.` };
    }
    const checkpoint = preferred || checkpoints.find((name) => typeof name === "string" && name.trim());
    if (!checkpoint) {
      return { ok: false, note: "ComfyUI is online, but no CheckpointLoaderSimple model is installed. Install a compatible checkpoint or configure a custom image workflow." };
    }
    if (req.referenceImageBase64) {
      return { ok: false, note: "ComfyUI FaceID cannot run with the basic txt2img graph. Configure a compatible reference-aware image backend; no face-lock was applied." };
    }
    const workflow = buildComfyWorkflowGraph({
      checkpoint,
      prompt: req.prompt,
      negativePrompt: req.negative,
      seed: req.seed,
      width: req.width || 768,
      height: req.height || 1152,
      referenceImageBase64: req.referenceImageBase64,
    });
    const queueRes = await fetch(`${base}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(30000),
    });
    if (!queueRes.ok) {
      const detail = await queueRes.text().catch(() => "");
      return { ok: false, note: `ComfyUI queue HTTP ${queueRes.status}: ${detail.slice(0, 300)}` };
    }
    const { prompt_id: promptId } = (await queueRes.json()) as { prompt_id?: string };
    if (!promptId) return { ok: false, note: "ComfyUI returned no prompt_id" };

    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const histRes = await fetch(`${base}/history/${encodeURIComponent(promptId)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!histRes.ok) continue;
      const hist = (await histRes.json()) as Record<
        string,
        { status?: { status_str?: string }; outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }> }
      >;
      const current = hist?.[promptId];
      if (current?.status?.status_str === "error") {
        return { ok: false, note: "ComfyUI reported an execution error. Check model compatibility and ComfyUI console logs." };
      }
      const outputs = current?.outputs;
      if (!outputs) continue;
      for (const nodeOut of Object.values(outputs)) {
        const imgMeta = nodeOut?.images?.[0];
        if (imgMeta?.filename) {
          const params = new URLSearchParams({
            filename: imgMeta.filename,
            subfolder: imgMeta.subfolder || "",
            type: imgMeta.type || "output",
          });
          const viewRes = await fetch(`${base}/view?${params.toString()}`, {
            signal: AbortSignal.timeout(10000),
          });
          if (!viewRes.ok) continue;
          const dataUrl = await blobToDataUrl(await viewRes.blob());
          if (dataUrl) {
            return { ok: true, imageUrl: dataUrl, note: "Local ComfyUI (RTX/GPU)" };
          }
        }
      }
    }
    return { ok: false, note: "ComfyUI generation timed out" };
  } catch (e) {
    return {
      ok: false,
      note: `ComfyUI failed: ${e instanceof Error ? e.message : "error"}`,
    };
  }
}

export async function generateLocalImage(
  req: LocalGenRequest,
  baseOverride?: string,
): Promise<LocalGenResult> {
  const s = getMediaSettings();
  const base = (baseOverride || s.localImageBase || "").trim();
  if (!base) {
    return { ok: false, note: "Set Local image base (ComfyUI :8188 or Home Engine :8787)" };
  }

  let refPhoto = req.referenceImageBase64;
  if (!refPhoto && s.aggressiveFaceLock && req.characterId && typeof window !== "undefined") {
    try {
      refPhoto = localStorage.getItem(`vm-ref-photo-${req.characterId}`) || undefined;
    } catch {
      /* ignore */
    }
  }

  if (s.localImageMode === "forge") return tryForge(base, req);
  if (s.localImageMode === "prompt-url" && !base.includes(":8188")) {
    return tryCustom(base, req);
  }
  return tryComfyDirect(base, { ...req, referenceImageBase64: refPhoto });
}
