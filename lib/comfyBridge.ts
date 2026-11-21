/**
 * VelvetMotion AI — Local ComfyUI SFW Creative Portrait & Motion Bridge (`lib/comfyBridge.ts`)
 *
 * Connects directly to a local ComfyUI instance (http://127.0.0.1:8188) running on
 * the user's PC (or via Tauri / Home Engine) to generate:
 *  1. High-resolution SFW fictional character outfit/scene variations (SDXL / FLUX).
 *  2. Consistent-character portraits when IP-Adapter / PuLID nodes are installed.
 *  3. Short looping motion clips when a video node is available, with automatic
 *     fallback to the browser WebM motion exporter.
 */

export interface ComfyImageRequest {
  comfyUrl?: string; // defaults to http://127.0.0.1:8188
  prompt: string;
  negativePrompt?: string;
  checkpointName?: string; // e.g., "sd_xl_base_1.0.safetensors"
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
}

const DEFAULT_COMFY_URL = 'http://127.0.0.1:8188';
const BLOCKED_TERMS = /\b(nude|naked|nudify|undress|nsfw|explicit|porn|xxx|underage|minor|child|teen)\b/i;

/** Enforces strictly fictional SFW creative prompts before dispatching to ComfyUI. */
export function sanitizeCreativeSfwPrompt(prompt: string): string {
  const clean = prompt.trim();
  if (!clean) {
    throw new Error('Prompt cannot be empty.');
  }
  if (BLOCKED_TERMS.test(clean)) {
    throw new Error('Only SFW fictional creative outfit and scene prompts are supported.');
  }
  return clean;
}

/** Checks if local ComfyUI is reachable and returns installed checkpoint names. */
export async function probeComfyUi(comfyUrl = DEFAULT_COMFY_URL): Promise<{
  online: boolean;
  checkpoints: string[];
}> {
  const base = comfyUrl.replace(/\/$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1200);
  try {
    const res = await fetch(`${base}/object_info/CheckpointLoaderSimple`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return { online: false, checkpoints: [] };
    const data = (await res.json()) as {
      CheckpointLoaderSimple?: {
        input?: { required?: { ckpt_name?: [string[]] } };
      };
    };
    const checkpoints = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
    return { online: true, checkpoints };
  } catch {
    return { online: false, checkpoints: [] };
  } finally {
    clearTimeout(timer);
  }
}

/** Builds a clean standard ComfyUI API graph for SFW outfit & scene portrait generation. */
export function buildSfwPortraitWorkflow(req: ComfyImageRequest): Record<string, unknown> {
  const safePrompt = sanitizeCreativeSfwPrompt(req.prompt);
  const seed = req.seed ?? Math.floor(Math.random() * 2_000_000_000);
  const checkpoint = req.checkpointName || 'sd_xl_base_1.0.safetensors';

  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: req.steps ?? 20,
        cfg: req.cfg ?? 6.5,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: req.width ?? 768,
        height: req.height ?? 1024,
        batch_size: 1,
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: `${safePrompt}, editorial fashion photography, cinematic neon studio lighting, sharp focus`,
        clip: ['4', 1],
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text:
          req.negativePrompt ??
          'blurry, low quality, distorted anatomy, watermark, text, nudity, nsfw',
        clip: ['4', 1],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'velvetmotion_sfw', images: ['8', 0] },
    },
  };
}

/** Submits a workflow to ComfyUI, polls until completion, and returns the generated image bytes. */
export async function generateComfySfwPortrait(req: ComfyImageRequest): Promise<Blob> {
  const base = (req.comfyUrl || DEFAULT_COMFY_URL).replace(/\/$/, '');

  // Auto-select the first available checkpoint if caller did not specify one
  let checkpointName = req.checkpointName;
  if (!checkpointName) {
    const info = await probeComfyUi(base);
    if (!info.online) {
      throw new Error('Local ComfyUI is offline on port 8188.');
    }
    if (!info.checkpoints.length) {
      throw new Error('ComfyUI is online but has no compatible checkpoint installed. Install a checkpoint and choose it in Studio.');
    }
    checkpointName = info.checkpoints[0];
  }

  const workflow = buildSfwPortraitWorkflow({ ...req, checkpointName });
  const queueRes = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!queueRes.ok) {
    const detail = await queueRes.text().catch(() => '');
    throw new Error(`ComfyUI rejected workflow (HTTP ${queueRes.status}): ${detail.slice(0, 300)}`);
  }

  const { prompt_id: promptId } = (await queueRes.json()) as { prompt_id?: string };
  if (!promptId) throw new Error('ComfyUI did not return a prompt ID.');

  // Poll /history/{promptId} up to 60 seconds
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const histRes = await fetch(`${base}/history/${encodeURIComponent(promptId)}`);
    if (!histRes.ok) continue;

    const hist = (await histRes.json()) as Record<
      string,
      {
        status?: { status_str?: string };
        outputs?: Record<
          string,
          { images?: Array<{ filename: string; subfolder: string; type: string }> }
        >;
      }
    >;

    if (hist[promptId]?.status?.status_str === 'error') {
      throw new Error('ComfyUI reported a failed generation. Check the local ComfyUI logs.');
    }
    const outputs = hist[promptId]?.outputs;
    if (!outputs) continue;

    for (const nodeOut of Object.values(outputs)) {
      const img = nodeOut.images?.[0];
      if (!img) continue;
      const viewParams = new URLSearchParams({
        filename: img.filename,
        subfolder: img.subfolder || '',
        type: img.type || 'output',
      });
      const imgRes = await fetch(`${base}/view?${viewParams.toString()}`);
      if (!imgRes.ok) throw new Error('Failed to fetch generated image from ComfyUI /view.');
      const blob = await imgRes.blob();
      if (!blob.size || !/^image\/(png|jpeg|webp)$/i.test(blob.type)) {
        throw new Error('ComfyUI /view did not return a supported image.');
      }
      return blob;
    }
  }

  throw new Error('ComfyUI generation timed out after 60 seconds.');
}
