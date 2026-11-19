/**
 * Local GPU client for images, video, JOI, and voice.
 * Uses the visitor's machine when a local endpoint is set.
 * Falls back to free cloud / browser otherwise.
 */

const ENDPOINT_KEY = "velvet-local-endpoint";

export function getLocalEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ENDPOINT_KEY) || null;
  } catch {
    return null;
  }
}

export function setLocalEndpoint(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (url) localStorage.setItem(ENDPOINT_KEY, url.replace(/\/$/, ""));
    else localStorage.removeItem(ENDPOINT_KEY);
  } catch {}
}

async function probe(path: string): Promise<boolean> {
  const base = getLocalEndpoint();
  if (!base) return false;
  try {
    const r = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function localAvailable(): Promise<{ images: boolean; video: boolean; voice: boolean }> {
  const base = getLocalEndpoint();
  if (!base) return { images: false, video: false, voice: false };
  const [images, video, voice] = await Promise.all([
    probe("/system_stats").catch(() => false) || probe("/health").catch(() => false),
    probe("/generate-video").catch(() => false),
    probe("/tts").catch(() => false) || probe("/speech").catch(() => false),
  ]);
  return { images: !!images, video: !!video, voice: !!voice };
}

export async function localImage(prompt: string, opts?: { width?: number; height?: number; seed?: number }): Promise<{ url: string; note: string } | null> {
  const base = getLocalEndpoint();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.slice(0, 1200),
        width: opts?.width ?? 768,
        height: opts?.height ?? 1152,
        seed: opts?.seed,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { url?: string; image?: string };
    const url = data.url || data.image;
    return url ? { url, note: "Local GPU" } : null;
  } catch {
    return null;
  }
}

export async function localVideo(prompt: string, opts?: { imageUrl?: string; duration?: number }): Promise<{ url: string; note: string } | null> {
  const base = getLocalEndpoint();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.slice(0, 1000),
        duration: opts?.duration ?? 5,
        ...(opts?.imageUrl ? { image: opts.imageUrl } : {}),
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { url?: string; video?: string };
    const url = data.url || data.video;
    return url ? { url, note: "Local GPU" } : null;
  } catch {
    return null;
  }
}

export async function localVoice(text: string): Promise<{ url: string; note: string } | null> {
  const base = getLocalEndpoint();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 500) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { url?: string; audio?: string };
    const url = data.url || data.audio;
    return url ? { url, note: "Local GPU TTS" } : null;
  } catch {
    return null;
  }
}

export async function resolveMedia(opts: {
  type: "image" | "video" | "voice";
  prompt: string;
  frames?: string[];
  imageUrl?: string;
  text?: string;
  cloudFallback: () => Promise<{ url: string; note: string } | null>;
}): Promise<{ url?: string; frames?: string[]; note: string; source: "local" | "cloud" | "sequence" }> {
  if (opts.type === "image") {
    const local = await localImage(opts.prompt);
    if (local) return { url: local.url, note: local.note, source: "local" };
  }
  if (opts.type === "video") {
    const local = await localVideo(opts.prompt, { imageUrl: opts.imageUrl });
    if (local) return { url: local.url, frames: opts.frames, note: local.note, source: "local" };
    if (opts.frames?.length) return { frames: opts.frames, note: "Free sequence", source: "sequence" };
  }
  if (opts.type === "voice" && opts.text) {
    const local = await localVoice(opts.text);
    if (local) return { url: local.url, note: local.note, source: "local" };
  }
  const cloud = await opts.cloudFallback();
  if (cloud) return { url: cloud.url, note: cloud.note, source: "cloud" };
  return { note: "No backend", source: "cloud" };
}
