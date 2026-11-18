/**
 * Image-to-video adapter.
 * Default: Pollinations video URL (may require key / rate limits).
 * Optional: user-pasted img2vid endpoint from Advanced settings.
 * Fallback: labeled multi-frame sequence (honest “not real MP4”).
 */

import { getMediaSettings } from "./mediaSettings";

export type VideoClipResult = {
  /** True MP4/WebM URL when available */
  videoUrl: string | null;
  /** Always available still frames */
  frames: string[];
  /** Honest label for UI */
  mode: "mp4" | "sequence";
  note: string;
};

/** Build a Pollinations-style video GET URL from a still + motion prompt. */
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
  // gen.pollinations.ai/video/{prompt}?...
  return `https://gen.pollinations.ai/video/${prompt}?${params.toString()}`;
}

/** Call custom img2vid if configured; otherwise build Pollinations URL or null. */
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

  // Attempt Pollinations video URL (browser may stream MP4 when key/quota ok)
  const videoUrl = buildPollinationsVideoUrl(imageUrl, motionPrompt);
  return {
    videoUrl,
    frames,
    mode: "mp4",
    note:
      "Attempting live video URL (Pollinations wan). If it fails to play, sequence frames still work.",
  };
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
