/**
 * Local AUTOMATIC1111 / Forge Stable Diffusion WebUI HTTP adapter.
 * Uses documented /sdapi/v1 endpoints; no WebUI Python code is imported.
 * Models and inference server are installed and started by the user.
 */
export type A1111Checkpoint = { title: string; modelName: string };
export type A1111Request = {
  baseUrl: string;
  prompt: string;
  negativePrompt?: string;
  checkpoint?: string;
  seed?: number;
  width?: number;
  height?: number;
  /** User-supplied fictional artwork. Passing this selects img2img, not txt2img. */
  initImage?: string;
  denoisingStrength?: number;
  timeoutMs?: number;
};
export type A1111Result = { ok: boolean; imageUrl?: string; note: string };

export function normalizeWebUiBase(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash) throw new Error("Use an HTTP(S) image WebUI base URL without credentials or query parameters.");
  url.pathname = url.pathname.replace(/\/(?:sdapi\/v1(?:\/(?:txt2img|img2img|sd-models))?)?\/*$/, "");
  return url.toString().replace(/\/+$/, "");
}
export function parseA1111Checkpoints(value: unknown): A1111Checkpoint[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: A1111Checkpoint[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const model = item as { title?: unknown; model_name?: unknown };
    if (typeof model.title !== "string" || !model.title.trim()) continue;
    const title = model.title.trim().slice(0, 240);
    if (seen.has(title) || result.length >= 150) continue;
    seen.add(title);
    result.push({ title, modelName: typeof model.model_name === "string" ? model.model_name : title });
  }
  return result;
}
export async function discoverA1111Checkpoints(baseUrl: string): Promise<{
  online: boolean; checkpoints: A1111Checkpoint[]; error?: string;
}> {
  try {
    const base = normalizeWebUiBase(baseUrl);
    const response = await fetch(`${base}/sdapi/v1/sd-models`, {
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { online: false, checkpoints: [], error: `WebUI HTTP ${response.status}` };
    return { online: true, checkpoints: parseA1111Checkpoints(await response.json()) };
  } catch (error) {
    return { online: false, checkpoints: [], error: error instanceof Error ? error.message : "WebUI unavailable" };
  }
}
const MAX_IMAGE_BASE64 = 14_000_000;
export function normalizeA1111InputImage(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length > MAX_IMAGE_BASE64) throw new Error("Source image exceeds 10 MB.");
  const image = trimmed.replace(/^data:image\/(?:png|jpeg|jpg|webp);base64,/i, "");
  // Do not forward HTTP links or arbitrary schemes as init_images data.
  if (!image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length % 4 === 1) {
    throw new Error("Choose a PNG, JPEG or WebP image encoded as base64.");
  }
  return image;
}

export async function generateA1111Image(request: A1111Request): Promise<A1111Result> {
  let base: string;
  try { base = normalizeWebUiBase(request.baseUrl); }
  catch (error) {
    return { ok: false, note: error instanceof Error ? error.message : "Invalid image WebUI URL" };
  }
  if (!request.prompt.trim()) return { ok: false, note: "Enter an image prompt." };
  const reference = request.initImage;
  let source: string | undefined;
  try { source = reference ? normalizeA1111InputImage(reference) : undefined; }
  catch (error) { return { ok: false, note: error instanceof Error ? error.message : "Invalid source image" }; }

  const width = Math.min(2048, Math.max(64, Math.round(request.width || 768)));
  const height = Math.min(2048, Math.max(64, Math.round(request.height || 1024)));
  const endpoint = source ? "img2img" : "txt2img";
  const body: Record<string, unknown> = {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || "",
    seed: Number.isFinite(request.seed) ? Math.floor(request.seed!) : -1,
    width, height, steps: 22, cfg_scale: 6,
    ...(request.checkpoint ? {
      // Per-request override: never change the default checkpoint for other clients.
      override_settings: { sd_model_checkpoint: request.checkpoint },
      override_settings_restore_afterwards: true,
    } : {}),
    ...(source ? {
      init_images: [source],
      denoising_strength: Math.min(0.95, Math.max(0.05, request.denoisingStrength ?? 0.55)),
      resize_mode: 0,
    } : {}),
  };
  try {
    const response = await fetch(`${base}/sdapi/v1/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(request.timeoutMs ?? 180000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, note: `A1111 ${endpoint} HTTP ${response.status}: ${text.slice(0, 250)}` };
    }
    const payload: unknown = await response.json();
    const images = (payload as { images?: unknown } | null)?.images;
    const rawImage = Array.isArray(images) ? images[0] : undefined;
    if (typeof rawImage !== "string" || !rawImage || rawImage.length > MAX_IMAGE_BASE64) {
      return { ok: false, note: "A1111 returned no valid image bytes." };
    }
    const imageUrl = rawImage.startsWith("data:image/")
      ? rawImage : `data:image/png;base64,${normalizeA1111InputImage(rawImage)}`;
    return { ok: true, imageUrl, note: source ? "Local A1111/Forge img2img" : "Local A1111/Forge txt2img" };
  } catch (error) {
    return { ok: false, note: `A1111 ${endpoint} failed: ${error instanceof Error ? error.message : "connection error"}` };
  }
}
