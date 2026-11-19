/**
 * Zero-GPU motion clips rendered 100% in the browser (Canvas + MediaRecorder).
 * Used as the always-available "real video" path when no img2vid GPU endpoint is configured.
 * NOTE: this is a cinematic push-in / pan animation of a still, not AI-generated motion.
 */

export const MOTION_PRESETS = [
  { id: 'zoom-in', label: 'Slow Push-In', dx: 0, dy: -8, scaleEnd: 1.12 },
  { id: 'pan-right', label: 'Cinema Pan', dx: -18, dy: 0, scaleEnd: 1.1 },
  { id: 'drift-up', label: 'Vertical Reveal', dx: 0, dy: -22, scaleEnd: 1.14 },
] as const;

export type MotionPreset = (typeof MOTION_PRESETS)[number];

export function canRenderBrowserClip(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

/**
 * Generates a real downloadable .webm motion clip 100% in the browser via Canvas + MediaRecorder
 * whenever a local ComfyUI / Wan 2.2 GPU tunnel isn't connected.
 */
export async function renderBrowserWebmClip(
  imageUrl: string,
  motion: MotionPreset,
  durationMs = 3200
): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not load source image for animation'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 810;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };
  });

  recorder.start();
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function frame(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;
      const scale = 1 + (motion.scaleEnd - 1) * ease;
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const offsetX = (canvas.width - drawW) / 2 + motion.dx * ease;
      const offsetY = (canvas.height - drawH) / 2 + motion.dy * ease;

      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Subtle cinema vignette
      const grad = ctx!.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.25,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.65
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        recorder.stop();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });

  return done;
}
