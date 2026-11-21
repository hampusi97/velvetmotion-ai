/**
 * Hosted image providers that DO serve adult content.
 * Used ahead of AI Horde, which is a queue and frequently times out.
 */
import { fetchWithRetry } from "./netRetry";
import { remoteImageToStableDataUrl } from "./imageStore";

const POLLINATIONS = "https://image.pollinations.ai/prompt";
const MAX_PROMPT = 1500;

export interface HostedImageRequest {
  prompt: string;
  negativePrompt?: string;
  seed: number;
  width: number;
  height: number;
  nsfw: boolean;
  signal?: AbortSignal;
}

function trim(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  return clean.length > MAX_PROMPT ? clean.slice(0, MAX_PROMPT) : clean;
}

/** Free, keyless, adult-tolerant. Rate limited per IP — retries absorb the 429s. */
export async function generatePollinationsImage(req: HostedImageRequest): Promise<string> {
  const params = new URLSearchParams({
    width: String(req.width),
    height: String(req.height),
    seed: String(req.seed),
    model: "flux",
    nologo: "true",
    referrer: "velvetmotion",
  });
  if (req.nsfw) params.set("nsfw", "true");

  const res = await fetchWithRetry(
    `${POLLINATIONS}/${encodeURIComponent(trim(req.prompt))}?${params}`,
    { method: "GET" },
    { label: "Pollinations image", timeoutMs: 90_000, attempts: 3, signal: req.signal },
  );

  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error("Pollinations returned a non-image response");

  const blob = await res.blob();
  if (blob.size < 2_000) throw new Error("Pollinations returned an empty image");
  return await blobToDataUrl(blob);
}

/**
 * User-supplied POST endpoint.
 * Request: { prompt, negative_prompt, width, height, seed, nsfw }
 * Response: image/* body, or JSON with { url | image | imageUrl | b64_json }
 */
export async function generateConfiguredImage(
  endpoint: string,
  req: HostedImageRequest,
): Promise<string> {
  const res = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trim(req.prompt),
        negative_prompt: req.negativePrompt,
        width: req.width,
        height: req.height,
        seed: req.seed,
        nsfw: req.nsfw,
      }),
    },
    { label: "Configured image endpoint", timeoutMs: 90_000, attempts: 2, signal: req.signal },
  );

  const type = res.headers.get("content-type") || "";
  if (type.startsWith("image/")) return await blobToDataUrl(await res.blob());

  const data = (await res.json()) as {
    url?: string;
    image?: string;
    imageUrl?: string;
    b64_json?: string;
    output?: string;
  };
  if (data.b64_json) return `data:image/png;base64,${data.b64_json}`;
  const remote = data.url || data.imageUrl || data.image || data.output;
  if (!remote) throw new Error("Configured endpoint returned no image");
  if (remote.startsWith("data:")) return remote;
  return await remoteImageToStableDataUrl(remote).catch(() => remote);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    const buf = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type || "image/jpeg"};base64,${buf.toString("base64")}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read generated image"));
    reader.readAsDataURL(blob);
  });
}
