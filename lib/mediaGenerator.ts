/**
 * Dual-Engine Picture Generation Pipeline (`lib/mediaGenerator.ts`)
 *
 * Routing priority:
 *  1. Desktop Local Ultra: ComfyUI (127.0.0.1:8188) or KoboldCpp SD/FLUX (127.0.0.1:5001)
 *  2. Cloud Free: Cloudflare Image Worker (velvetmotion-image.hampusi97.workers.dev)
 *  3. Cloud Free Fallback: AI Horde (aihorde.net)
 */
import { assertCompliance } from "./complianceFilter";
import { generateLocalImage } from "./comfyClient";
import { fetchWorkerImage } from "./imageWorker";
import { generateHordeImage } from "./aiHorde";
import { remoteImageToStableDataUrl } from "./imageStore";
import { reportGenerationSpeed, type LocalEngineStatus } from "./localEngineBridge";

export interface PictureGenerationRequest {
  prompt: string;
  /** Honored by local Forge/Comfy/Kobold endpoints where supported; not guaranteed for cloud fallback. */
  negativePrompt?: string;
  seed?: number;
  width: number;
  height: number;
  nsfw?: boolean;
  characterId?: string;
  imageWorkerUrl?: string;
  localEngine?: Pick<LocalEngineStatus, "comfyOnline" | "koboldOnline">;
}

export interface PictureGenerationResult {
  imageUrl: string;
  engine: string;
  seed: number;
  elapsedSec: number;
}

async function tryKoboldSdTxt2Img(
  prompt: string,
  width: number,
  height: number,
  seed: number,
  negativePrompt?: string,
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35000);
    const res = await fetch("http://127.0.0.1:5001/sdapi/v1/txt2img", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: `low quality, blurry, deformed, watermark, text, underage, child${negativePrompt ? `, ${negativePrompt.slice(0, 360)}` : ""}`,
        seed,
        width,
        height,
        steps: 20,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: string[] };
    const b64 = data.images?.[0];
    if (!b64) return null;
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function generateStudioPicture(
  req: PictureGenerationRequest,
): Promise<PictureGenerationResult> {
  const compliance = assertCompliance(req.prompt);
  if (!compliance.ok) {
    throw new Error(compliance.reason);
  }

  // Detect adult requests even when the user types a custom prompt without
  // enabling Studio's mature-content switch; the generic worker is not suitable.
  const requiresAdultEngine = Boolean(req.nsfw) || /\b(nsfw|nude|nudity|explicit|sexual|lingerie)\b/i.test(req.prompt);
  const parsedSeed = req.seed ?? Math.floor(Math.random() * 90000 + 1000);
  const t0 = performance.now();
  let imageUrl: string | null = null;
  let engine = "Cloud Free";

  // 1A. Local Ultra ComfyUI (:8188)
  if (req.localEngine?.comfyOnline) {
    const localRes = await generateLocalImage({
      prompt: req.prompt,
      seed: parsedSeed,
      width: req.width,
      height: req.height,
      characterId: req.characterId,
      negative: req.negativePrompt,
    });
    if (localRes.ok && localRes.imageUrl) {
      imageUrl = localRes.imageUrl;
      engine = "Local Ultra ComfyUI";
    }
  }

  // 1B. Local KoboldCpp SD / FLUX (:5001)
  if (!imageUrl && req.localEngine?.koboldOnline) {
    const koboldImg = await tryKoboldSdTxt2Img(req.prompt, req.width, req.height, parsedSeed, req.negativePrompt);
    if (koboldImg) {
      imageUrl = koboldImg;
      engine = "Local KoboldCpp SD";
    }
  }

  // 2. Cloudflare Flux Image Worker
  if (!imageUrl && !requiresAdultEngine) {
    const cf = await fetchWorkerImage(req.prompt, {
      baseUrl: req.imageWorkerUrl,
      seed: parsedSeed,
    });
    if (cf.ok) {
      imageUrl = cf.url;
      engine = "Cloudflare Flux";
    }
  }

  // 3. AI Horde Free Fallback
  if (!imageUrl) {
    const horde = await generateHordeImage({
      prompt: req.prompt,
      seed: parsedSeed,
      nsfw: requiresAdultEngine,
      width: req.width,
      height: req.height,
      steps: 25,
    });
    imageUrl = await remoteImageToStableDataUrl(horde.url).catch(() => horde.url);
    engine = "AI Horde Cloud Free";
  }

  const elapsedSec = Number(((performance.now() - t0) / 1000).toFixed(1));
  reportGenerationSpeed({ imgSec: elapsedSec, lastEngine: engine });

  return { imageUrl, engine, seed: parsedSeed, elapsedSec };
}
