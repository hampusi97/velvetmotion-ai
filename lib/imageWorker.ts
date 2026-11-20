/**
 * Client for the Cloudflare Workers AI image worker (workers/image/worker.js).
 * The worker answers GET /generate?prompt=…&steps=… with a binary JPEG, or a JSON error.
 */
import { blobToDataUrl, toStableDataUrl } from "./imageStore";

export type WorkerImageResult =
  | { ok: true; url: string; originalUrl?: string }
  | { ok: false; reason: "quota" | "http" | "network" | "empty"; detail: string };

export function imageWorkerBase(override?: string): string {
  const raw =
    override ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_IMAGE_WORKER_URL : "") ||
    "https://velvetmotion-image.hampusi97.workers.dev";
  return raw.replace(/\/generate\/?$/, "").replace(/\/$/, "");
}

export function isQuotaError(text: string): boolean {
  return /4006|neurons|daily free allocation|quota/i.test(text);
}

export async function fetchWorkerImage(
  prompt: string,
  opts: { steps?: number; seed?: number; baseUrl?: string; timeoutMs?: number; includeOriginal?: boolean } = {},
): Promise<WorkerImageResult> {
  const safeSteps = Math.min(8, Math.max(4, Math.round(opts.steps ?? 8)));
  const randomSeed = opts.seed ?? Math.floor(Math.random() * 2_000_000_000) + 1;
  const params = new URLSearchParams({
    prompt: prompt.slice(0, 1500),
    steps: String(safeSteps),
    seed: String(randomSeed),
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    const res = await fetch(`${imageWorkerBase(opts.baseUrl)}/generate?${params.toString()}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: isQuotaError(text) ? "quota" : "http", detail: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      return { ok: false, reason: "empty", detail: `unexpected content-type ${type}` };
    }
    const blob = await res.blob();
    const url = await toStableDataUrl(blob);
    return opts.includeOriginal ? { ok: true, url, originalUrl: await blobToDataUrl(blob) } : { ok: true, url };
  } catch (e) {
    return { ok: false, reason: "network", detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}
