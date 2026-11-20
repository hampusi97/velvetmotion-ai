/**
 * Image-to-Video Studio Engine (`lib/canvasVideoExporter.ts`)
 *
 * Routing priority:
 *  1. Desktop Local Ultra: ComfyUI (127.0.0.1:8188 FramePack / Wan 2.2 / LTX-2) or custom endpoint
 *  2. Cloud Free Instant Motion Engine: HTMLCanvasElement.captureStream() + MediaRecorder (.webm)
 */
import { assertCompliance } from "./complianceFilter";

export interface VideoMotionPreset {
  id: "slow-zoom-blink" | "neon-hair-sway" | "balcony-breeze" | "club-light-pulse";
  label: string;
  dx: number;
  dy: number;
  scaleEnd: number;
  tint: string;
  pulseMode: "blink" | "sway" | "breeze" | "club";
}

export const VIDEO_MOTION_PRESETS: VideoMotionPreset[] = [
  {
    id: "slow-zoom-blink",
    label: "Slow Zoom & Blink",
    dx: 0,
    dy: -10,
    scaleEnd: 1.12,
    tint: "rgba(255, 86, 120, 0.14)",
    pulseMode: "blink",
  },
  {
    id: "neon-hair-sway",
    label: "Neon Hair Sway",
    dx: 14,
    dy: -6,
    scaleEnd: 1.09,
    tint: "rgba(168, 85, 247, 0.22)",
    pulseMode: "sway",
  },
  {
    id: "balcony-breeze",
    label: "Balcony Breeze",
    dx: -16,
    dy: -4,
    scaleEnd: 1.1,
    tint: "rgba(251, 191, 36, 0.16)",
    pulseMode: "breeze",
  },
  {
    id: "club-light-pulse",
    label: "Club Light Pulse",
    dx: 8,
    dy: -14,
    scaleEnd: 1.14,
    tint: "rgba(255, 30, 142, 0.26)",
    pulseMode: "club",
  },
];

export const VIDEO_DURATIONS = [3, 5, 8] as const;
export const VIDEO_SPEEDS = [0.75, 1, 1.25] as const;

export interface StudioVideoRequest {
  imageUrl: string;
  motionId: VideoMotionPreset["id"];
  durationSec: 3 | 5 | 8;
  speed: 0.75 | 1 | 1.25;
  prompt?: string;
  comfyOnline?: boolean;
  videoBackendUrl?: string;
}

export interface StudioVideoResult {
  videoUrl: string;
  engine: string;
  /** False for the canvas pan/zoom effect; it does not synthesize new video frames. */
  isGenerative: boolean;
  warning?: string;
}

export async function renderCanvasMotionWebm(
  imageUrl: string,
  motion: VideoMotionPreset,
  durationSec: 3 | 5 | 8 = 5,
  speed: 0.75 | 1 | 1.25 = 1,
): Promise<string> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("In-browser video encoding is unavailable on this browser.");
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load source image for animation."));
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 810;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable.");

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_600_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      resolve(URL.createObjectURL(blob));
    };
  });

  recorder.start();
  const totalMs = Math.max(1500, Math.round((durationSec * 1000) / speed));
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function drawFrame(now: number) {
      const t = Math.min(1, (now - start) / totalMs);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;
      const sway = Math.sin(t * Math.PI * 2 * speed) * 8;
      const scale = 1 + (motion.scaleEnd - 1) * ease;
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const extraX = motion.pulseMode === "sway" || motion.pulseMode === "breeze" ? sway : 0;
      const offsetX = (canvas.width - drawW) / 2 + motion.dx * ease + extraX;
      const offsetY = (canvas.height - drawH) / 2 + motion.dy * ease;

      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Lighting sheen & vignette
      const grad = ctx!.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.38,
        canvas.width * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.68,
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      if (motion.pulseMode === "club") {
        const pulseAlpha = (0.5 + 0.5 * Math.sin(t * Math.PI * 6)) * 0.24;
        ctx!.fillStyle = `rgba(255, 86, 120, ${pulseAlpha.toFixed(3)})`;
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      } else if (motion.pulseMode === "blink") {
        // Gentle mid-clip shadow blink pulse
        const blinkWindow = Math.max(0, 1 - Math.abs(t - 0.52) * 14);
        if (blinkWindow > 0) {
          ctx!.fillStyle = `rgba(10, 10, 14, ${(blinkWindow * 0.25).toFixed(3)})`;
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx!.fillStyle = motion.tint;
        ctx!.globalAlpha = 0.25 + 0.25 * Math.sin(t * Math.PI);
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        ctx!.globalAlpha = 1;
      }

      if (t < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
        resolve();
      }
    }
    requestAnimationFrame(drawFrame);
  });

  return done;
}

export async function generateStudioVideoClip(
  req: StudioVideoRequest,
): Promise<StudioVideoResult> {
  if (req.prompt) {
    const compliance = assertCompliance(req.prompt);
    if (!compliance.ok) throw new Error(compliance.reason);
  }

  const motion = VIDEO_MOTION_PRESETS.find((m) => m.id === req.motionId) ?? VIDEO_MOTION_PRESETS[0];

  // 1. A real video requires a configured backend that implements this HTTP contract.
  // Reaching ComfyUI /system_stats alone does NOT mean a video workflow exists.
  const endpoint = req.videoBackendUrl?.trim();
  let backendError: string | undefined;
  if (endpoint) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: req.imageUrl,
          image: req.imageUrl,
          prompt: req.prompt || "",
          motion: motion.id,
          durationSec: req.durationSec,
          speed: req.speed,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Video service returned HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.startsWith("video/")) {
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Video service returned an empty file");
        return {
          videoUrl: URL.createObjectURL(blob),
          engine: "Configured AI video backend",
          isGenerative: true,
        };
      }
      const data = (await res.json()) as { videoUrl?: string; url?: string; video?: string; output?: string; error?: string };
      const url = data.videoUrl || data.url || data.video || data.output;
      if (url && /^(https?:\/\/|blob:|data:video\/)/i.test(url)) {
        return { videoUrl: url, engine: "Configured AI video backend", isGenerative: true };
      }
      backendError = data.error || "Video service returned no playable video URL";
    } catch (err) {
      backendError = err instanceof Error ? err.message : "Video service unavailable";
    } finally {
      clearTimeout(timer);
    }
  }

  // 2. Optional browser fallback: pan/zoom only, NOT generated character motion.
  const webmUrl = await renderCanvasMotionWebm(req.imageUrl, motion, req.durationSec, req.speed);
  return {
    videoUrl: webmUrl,
    engine: "Browser motion effect (animated still)",
    isGenerative: false,
    warning: backendError || (req.comfyOnline
      ? "ComfyUI is reachable, but no AI video workflow endpoint is configured."
      : "Configure a compatible image-to-video endpoint for genuine AI motion."),
  };
}
