/**
 * Dual-Engine Picture Generation Pipeline (`lib/mediaGenerator.ts`)
 *
 * Routing priority:
 *  1. Desktop Local Ultra: ComfyUI (127.0.0.1:8188) or KoboldCpp SD/FLUX (127.0.0.1:5001)
 *  2. Cloud Free: Cloudflare Image Worker (velvetmotion-image.hampusi97.workers.dev)
 *  3. Cloud Free Fallback: AI Horde (aihorde.net)
 */
import { assertCompliance } from "./complianceFilter";
import { generateLocalImage, tryComfyDirect } from "./comfyClient";
import { getMediaSettings } from "./mediaSettings";
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
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
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: string[] };
    const b64 = data.images?.[0];
    if (!b64) return null;
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
  const settings = getMediaSettings();
  const failures: string[] = [];
  let imageUrl: string | null = null;
  let engine = "Cloud Free";

  // An auto-discovered ComfyUI on :8188 works without a second manual settings
  // entry. A custom configured backend is used only when "prefer local" is on.
  const localRequest = {
    prompt: req.prompt,
    seed: parsedSeed,
    width: req.width,
    height: req.height,
    characterId: req.characterId,
    negative: req.negativePrompt,
  };
  if (req.localEngine?.comfyOnline || (settings.preferLocal && settings.localImageBase)) {
    try {
      const localRes = settings.preferLocal && settings.localImageBase
        ? await generateLocalImage(localRequest)
        : await tryComfyDirect("http://127.0.0.1:8188", localRequest);
      if (localRes.ok && localRes.imageUrl) {
        imageUrl = localRes.imageUrl;
        engine = localRes.note;
      } else {
        failures.push("Local image model: " + localRes.note);
      }
    } catch (error) {
      failures.push("Local image model: " + (error instanceof Error ? error.message : "unavailable"));
    }
  }

  // Some KoboldCpp instances support text-only inference, not SD. Test the
  // actual image route rather than assuming a listening port is sufficient.
  if (!imageUrl && req.localEngine?.koboldOnline) {
    const koboldImg = await tryKoboldSdTxt2Img(req.prompt, req.width, req.height, parsedSeed, req.negativePrompt);
    if (koboldImg) {
      imageUrl = koboldImg;
      engine = "Local KoboldCpp SD";
    } else {
      failures.push("KoboldCpp: image endpoint unavailable");
    }
  }

  // The general Cloudflare model is not used for adult media. It may also hit
  // rate limits; preserve the reason instead of silently claiming success.
  if (!imageUrl && !requiresAdultEngine) {
    const cf = await fetchWorkerImage(req.prompt, {
      baseUrl: req.imageWorkerUrl,
      seed: parsedSeed,
    });
    if (cf.ok) {
      imageUrl = cf.url;
      engine = "Cloudflare Flux";
    } else {
      failures.push("Cloudflare image model: " + (cf.reason === "quota" ? "quota exhausted" : cf.reason));
    }
  }

  // Only report success when a provider returned an actual image.
  if (!imageUrl) {
    try {
      const horde = await generateHordeImage({
        prompt: req.prompt,
        seed: parsedSeed,
        nsfw: requiresAdultEngine,
        width: req.width,
        height: req.height,
        steps: 20,
      });
      if (!/^https:\/\/|^data:image\//i.test(horde.url)) {
        throw new Error("Provider returned an invalid image URL");
      }
      imageUrl = await remoteImageToStableDataUrl(horde.url).catch(() => horde.url);
      engine = horde.note;
    } catch (error) {
      failures.push("AI Horde: " + (error instanceof Error ? error.message : "unavailable"));
    }
  }

  if (!imageUrl) {
    throw new Error(
      "No image was generated. " + failures.join("; ").slice(0, 500) +
      ". Check your model connection or try again when the cloud provider is available.",
    );
  }

  const elapsedSec = Number(((performance.now() - t0) / 1000).toFixed(1));
  reportGenerationSpeed({ imgSec: elapsedSec, lastEngine: engine });

  return { imageUrl, engine, seed: parsedSeed, elapsedSec };
}
