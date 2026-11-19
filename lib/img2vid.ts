/**
 * Image-to-video adapter.
 * 1. Custom local/remote img2vid endpoint (ComfyUI Wan 2.2 / FramePack / LTX-Video).
 * 2. Zero-GPU browser WebM motion clip via Canvas + MediaRecorder (works 100% free & offline).
 * 3. Honest multi-frame sequence fallback if MediaRecorder is unavailable.
 */

import { getMediaSettings } from "./mediaSettings";
import { canRenderBrowserClip, MOTION_PRESETS, renderBrowserWebmClip } from "./browserClip";
import { fetchWorkerImage } from "./imageWorker";

/** Generate verified frame sequence using the image worker (stops cleanly on quota). */
export async function generateFreeFrames(
  baseImageUrl: string,
  motionPrompt: string,
  count = 4,
): Promise<string[]> {
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const prompt = `${motionPrompt}, frame ${i + 1} of sequence, slight natural movement, photorealistic`;
    const res = await fetchWorkerImage(prompt, { steps: 6, seed: (Date.now() % 100000) + i });
    if (!res.ok) break;
    frames.push(res.url);
  }
  return frames.length > 0 ? frames : baseImageUrl ? [baseImageUrl] : [];
}

export type VideoClipResult = {
  /** True MP4/WebM URL when available */
  videoUrl: string | null;
  /** Always available still frames */
  frames: string[];
  /** Honest label for UI */
  mode: "mp4" | "webm" | "sequence";
  note: string;
};

/** Build a Pollinations-style video GET URL when the user supplies an explicit Pollinations key. */
export function buildPollinationsVideoUrl(
  imageUrl: string,
  motionPrompt: string,
  opts?: { duration?: number; seed?: number },
): string {
  const settings = getMediaSettings();
  const duration = opts?.duration ?? 3;
  const seed = opts?.seed ?? 42;
  const prompt = encodeURIComponent(
    `${motionPrompt}, smooth motion, photorealistic, adult content allowed`,
  );
  const params = new URLSearchParams({
    model: "wan",
    duration: String(duration),
    seed: String(seed),
    image: imageUrl,
  });
  if (settings.pollinationsKey) params.set("key", settings.pollinationsKey);
  return `https://gen.pollinations.ai/video/${prompt}?${params.toString()}`;
}

/** Call custom img2vid if configured; otherwise render a browser WebM motion clip or return sequence frames. */
export async function requestImg2Vid(
  imageUrl: string,
  motionPrompt: string,
  frames: string[],
): Promise<VideoClipResult> {
  const settings = getMediaSettings();

  if (settings.img2vidUrl) {
    try {
      const res = await fetch(settings.img2vidUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUrl,
          prompt: motionPrompt,
          duration: 3,
        }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          video?: string;
          output?: string;
        };
        const url = data.url || data.video || data.output || null;
        if (url) {
          return {
            videoUrl: url,
            frames,
            mode: "mp4",
            note: "Real clip from your img2vid endpoint",
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  // Zero-GPU WebM motion clip in the browser (reliable, free, never returns 401/502)
  const sourceStill = imageUrl || frames[0] || "";
  if (sourceStill && canRenderBrowserClip()) {
    try {
      const preset = /pan|side|walk|turn/i.test(motionPrompt)
        ? MOTION_PRESETS[1]
        : /up|reveal|rise|body/i.test(motionPrompt)
          ? MOTION_PRESETS[2]
          : MOTION_PRESETS[0];
      const webmUrl = await renderBrowserWebmClip(sourceStill, preset, 3000);
      if (webmUrl) {
        return {
          videoUrl: webmUrl,
          frames,
          mode: "webm",
          note: "Live WebM motion clip rendered locally (free, no GPU server needed)",
        };
      }
    } catch {
      /* fall through to sequence */
    }
  }

  return sequenceOnlyResult(frames);
}

export function sequenceOnlyResult(frames: string[]): VideoClipResult {
  return {
    videoUrl: null,
    frames,
    mode: "sequence",
    note: "Frame sequence (not a real MP4) — set Advanced → img2vid for true clips",
  };
}

export const MOTION_PROMPTS: Record<string, string> = {
  sex: "intimate sex motion, body movement, passionate, cinematic",
  joi: "woman gesturing and speaking JOI, hand motion, eye contact, seductive",
  sph: "dominant teasing gesture, pointing, amused expression, slight head movement",
  bnwo: "powerful walk toward camera, dominant posture, luxury room",
  default: "subtle body motion, breathing, hair movement, cinematic",
};
