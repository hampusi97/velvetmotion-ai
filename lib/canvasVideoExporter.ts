/**
 * Image-to-Video Studio Engine (`lib/canvasVideoExporter.ts`)
 *
 * Routing priority:
 *  1. Desktop Local Ultra: ComfyUI (127.0.0.1:8188 FramePack / Wan 2.2 / LTX-2) or custom endpoint
 *  2. Cloud Free Instant Motion Engine: HTMLCanvasElement.captureStream() + MediaRecorder (.webm)
 */
import { blobToDataUrl } from "./imageStore";
import { assertCompliance } from "./complianceFilter";
import { getMediaSettings, localComfyVideoHealthUrl } from "./mediaSettings";
import { generateComfyVideo } from "./comfyVideo";

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

export const VIDEO_RESOLUTIONS = [480, 720, 1080] as const;
export const VIDEO_DURATIONS = [3, 5, 8] as const;
export const VIDEO_SPEEDS = [0.75, 1, 1.25] as const;

export interface StudioVideoRequest {
  imageUrl: string;
  motionId: VideoMotionPreset["id"];
  durationSec: 3 | 5 | 8;
  speed: 0.75 | 1 | 1.25;
  prompt?: string;
  /** Upload source classification. Also enforce this server-side in production. */
  sourceType?: "fictional" | "real-person" | "unspecified";
  adultMode?: boolean;
  comfyOnline?: boolean;
  videoBackendUrl?: string;
  mode?: "ai" | "animated-still";
  resolution?: (typeof VIDEO_RESOLUTIONS)[number];
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}

export interface StudioVideoResult {
  videoUrl: string;
  engine: string;
  /** False for the canvas pan/zoom effect; it does not synthesize new video frames. */
  isGenerative: boolean;
  videoFormat: "mp4" | "webm" | "unknown";
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

type VideoBackendResponse = {
  videoUrl?: string;
  url?: string;
  video?: string;
  output?: string | { url?: string; videoUrl?: string };
  result?: { url?: string; videoUrl?: string };
  statusUrl?: string;
  status_url?: string;
  state?: string;
  status?: string;
  error?: string;
};

function videoUrlFromResponse(data: VideoBackendResponse, endpoint: string): string | null {
  const url = data.videoUrl || data.url || data.video ||
    (typeof data.output === "string" ? data.output : data.output?.videoUrl || data.output?.url) ||
    data.result?.videoUrl || data.result?.url;
  // A blob: URL created in a remote server process is not usable by a browser.
  if (typeof url !== "string") return null;
  if (/^(https?:\/\/|data:video\/)/i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) {
    const resolved = new URL(url, endpoint);
    if (resolved.origin === new URL(endpoint).origin) return resolved.toString();
  }
  return null;
}

/** Accept async video jobs only from the same origin as the configured API. */
function safeVideoStatusUrl(value: string, endpoint: string): string {
  const url = new URL(value, endpoint);
  const configured = new URL(endpoint);
  if (url.origin !== configured.origin || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("Video job polling URL must use the configured provider's origin.");
  }
  return url.toString();
}

async function pollVideoJob(initial: VideoBackendResponse, endpoint: string, signal: AbortSignal): Promise<string> {
  const statusUrl = initial.statusUrl || initial.status_url;
  if (!statusUrl) throw new Error("Video provider returned a job without a statusUrl. Configure an endpoint returning a completed video or a pollable job.");
  const url = safeVideoStatusUrl(statusUrl, endpoint);
  for (let attempt = 0; attempt < 40; attempt++) {
    if (signal.aborted) throw new Error("Video generation timed out.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Video job status HTTP ${response.status}`);
    const current = (await response.json()) as VideoBackendResponse;
    const finished = videoUrlFromResponse(current, endpoint);
    if (finished) return finished;
    const status = (current.state || current.status || "").toLowerCase();
    if (["failed", "error", "cancelled", "canceled"].includes(status) || current.error) {
      throw new Error(current.error || "Video job failed at the provider.");
    }
  }
  throw new Error("Video job did not finish within the polling window.");
}

export async function generateStudioVideoClip(
  req: StudioVideoRequest,
): Promise<StudioVideoResult> {
  if (req.adultMode && req.sourceType !== "fictional") {
    throw new Error("Adult video mode requires original fictional adult artwork. Real photographs are limited to nonsexual animation.");
  }
  if (req.prompt) {
    const compliance = assertCompliance(req.prompt);
    if (!compliance.ok) throw new Error(compliance.reason);
  }

  const motion = VIDEO_MOTION_PRESETS.find((m) => m.id === req.motionId) ?? VIDEO_MOTION_PRESETS[0];

  // 1. A real video requires a configured backend that implements this HTTP contract.
  // Reaching ComfyUI /system_stats alone does NOT mean a video workflow exists.
  const endpoint = req.videoBackendUrl?.trim();
  let backendError: string | undefined;
  const settings = getMediaSettings();
  if (!endpoint && req.mode !== "animated-still" && settings.comfyVideoEnabled) {
    try {
      if (!settings.comfyVideoWorkflowJson || !settings.comfyVideoImageNodeId) {
        throw new Error("Import a ComfyUI API-format video workflow and select its LoadImage node in Advanced Media.");
      }
      const generated = await generateComfyVideo({
        baseUrl: settings.comfyVideoBase || "http://127.0.0.1:8188",
        workflowJson: settings.comfyVideoWorkflowJson,
        imageNodeId: settings.comfyVideoImageNodeId,
        promptNodeId: settings.comfyVideoPromptNodeId || undefined,
        prompt: req.prompt || "",
        sourceImageUrl: req.imageUrl,
        onStatus: req.onProgress,
        signal: req.signal,
      });
      return { videoUrl: generated.videoUrl, videoFormat: generated.videoFormat, isGenerative: true,
        engine: "ComfyUI video model (local)" };
    } catch (error) {
      req.signal?.throwIfAborted();
      backendError = error instanceof Error ? error.message : "ComfyUI video workflow did not generate a video.";
    }
  }
  if (endpoint && req.mode !== "animated-still") {
    const timeoutMinutes = localComfyVideoHealthUrl(endpoint) ? 30 : 5;
    const timeout = AbortSignal.timeout(timeoutMinutes * 60_000);
    const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    try {
      const backend = new URL(endpoint);
      if (!["https:", "http:"].includes(backend.protocol) || backend.username || backend.password) {
        throw new Error("The video endpoint must be an HTTP or HTTPS URL without embedded credentials.");
      }
      const sameOriginImage = typeof window !== "undefined" &&
        new URL(req.imageUrl, window.location.href).origin === window.location.origin;
      const localBridge = ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname);
      const image = sameOriginImage || /^(?:blob:|\/)/.test(req.imageUrl) || (localBridge && /^https?:/i.test(req.imageUrl))
        ? await blobToDataUrl(await fetch(req.imageUrl, { signal }).then((response) => {
          if (!response.ok) throw new Error("Could not read the selected source image.");
          return response.blob();
        }))
        : req.imageUrl;
      let response = await fetch(backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: image,
          image,
          prompt: req.prompt || "",
          motion: motion.id,
          duration: req.durationSec,
          durationSec: req.durationSec,
          speed: req.speed,
          resolution: req.resolution,
          adultMode: Boolean(req.adultMode && req.sourceType === "fictional"),
          sourceType: req.sourceType || "unspecified",
        }),
        signal,
        redirect: "error",
      });

      let statusUrl: URL | undefined;
      while (response.status === 202) {
        const location = response.headers.get("location");
        const job = location ? null : (await response.json().catch(() => null)) as { statusUrl?: string } | null;
        const next = location || job?.statusUrl;
        if (next) statusUrl = new URL(next, response.url || backend);
        if (!statusUrl || statusUrl.origin !== backend.origin || statusUrl.username || statusUrl.password) {
          throw new Error("The video service must return a same-origin job status URL.");
        }
        const retryAfter = Number(response.headers.get("retry-after")) || 3;
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            clearTimeout(timer);
            reject(signal.reason);
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }, Math.min(15, Math.max(1, retryAfter)) * 1000);
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) onAbort();
        });
        response = await fetch(statusUrl, { signal, redirect: "error", cache: "no-store" });
      }

      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: unknown } | null;
        const detail = typeof failure?.error === "string" ? `: ${failure.error.slice(0, 300)}` : "";
        throw new Error(`Video service returned HTTP ${response.status}${detail}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.startsWith("video/")) {
        const blob = await response.blob();
        if (!blob.size) throw new Error("Video service returned an empty file");
        return {
          videoUrl: URL.createObjectURL(blob),
          engine: "Configured AI video backend",
          isGenerative: true,
          videoFormat: contentType.includes("webm") ? "webm" : contentType.includes("mp4") ? "mp4" : "unknown",
        };
      }
      const data = (await response.json()) as VideoBackendResponse;
      const url = videoUrlFromResponse(data, endpoint) ||
        ((data.statusUrl || data.status_url) ? await pollVideoJob(data, endpoint, signal) : null);
      if (url) {
        return {
          videoUrl: url,
          engine: "Configured AI video backend",
          isGenerative: true,
          videoFormat: /\.webm(?:$|[?#])/i.test(url) ? "webm" : /\.mp4(?:$|[?#])/i.test(url) ? "mp4" : "unknown",
        };
      }
      backendError = data.error || "Video provider returned neither playable video nor a statusUrl for polling.";
    } catch (err) {
      req.signal?.throwIfAborted();
      backendError = timeout.aborted ? `The video job timed out after ${timeoutMinutes} minutes.` : err instanceof Error ? err.message : "Video service unavailable";
    }
  }
  if (req.mode === "ai") {
    throw new Error(backendError || "Configure an image-to-video workflow in Advanced Media before generating an AI clip.");
  }

  // 2. Optional browser fallback: pan/zoom only, NOT generated character motion.
  const webmUrl = await renderCanvasMotionWebm(req.imageUrl, motion, req.durationSec, req.speed);
  return {
    videoUrl: webmUrl,
    engine: "Browser motion effect (animated still)",
    isGenerative: false,
    videoFormat: "webm",
    warning: req.mode === "animated-still" ? undefined : backendError || (req.comfyOnline
      ? "ComfyUI is reachable, but no AI video workflow endpoint is configured."
      : "Configure a compatible image-to-video endpoint for genuine AI motion."),
  };
}
