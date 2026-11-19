/**
 * Local GPU video generation.
 * Uses the visitor's GPU when they run ComfyUI / Wan / KoboldCpp locally
 * (or via Cloudflare Tunnel) and set the endpoint.
 * Falls back to free image-sequence video otherwise.
 */

const STORAGE_KEY = "velvet-local-video-endpoint";

export function getLocalVideoEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setLocalVideoEndpoint(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export async function probeLocalVideo(): Promise<{ ok: boolean; note: string }> {
  const endpoint = getLocalVideoEndpoint();
  if (!endpoint) return { ok: false, note: "No local endpoint set" };
  try {
    const r = await fetch(`${endpoint}/system_stats`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) return { ok: true, note: "ComfyUI reachable" };
    const r2 = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(3000) });
    if (r2.ok) return { ok: true, note: "Local video backend reachable" };
    return { ok: false, note: `Endpoint returned ${r.status}` };
  } catch {
    return { ok: false, note: "Local endpoint unreachable" };
  }
}

/**
 * Queue a simple text-to-video or image-to-video prompt on the local backend.
 * Expects a ComfyUI-style or custom REST endpoint that accepts { prompt, image? }.
 * Returns a video URL or null on failure.
 */
export async function generateLocalVideo(opts: {
  prompt: string;
  imageUrl?: string;
  duration?: number;
}): Promise<{ url: string; note: string } | null> {
  const endpoint = getLocalVideoEndpoint();
  if (!endpoint) return null;

  try {
    const body = {
      prompt: opts.prompt.slice(0, 1000),
      duration: opts.duration ?? 5,
      ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    };
    const r = await fetch(`${endpoint}/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { url?: string; video?: string };
    const url = data.url || data.video;
    if (!url) return null;
    return { url, note: "Local GPU" };
  } catch {
    return null;
  }
}

export async function resolveVideo(opts: {
  prompt: string;
  frames: string[];
  imageUrl?: string;
}): Promise<{ type: "video" | "sequence"; url?: string; frames: string[]; note: string }> {
  const local = await generateLocalVideo({ prompt: opts.prompt, imageUrl: opts.imageUrl });
  if (local) return { type: "video", url: local.url, frames: opts.frames, note: local.note };
  return { type: "sequence", frames: opts.frames, note: "Free sequence (no local GPU)" };
}
