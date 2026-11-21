export interface CardInput {
  label: string;
  line: string;
  streak: number;
  companionName: string;
  portraitDataUrl?: string;
}

export async function renderMilestoneCard(input: CardInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0b0a09";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (input.portraitDataUrl) {
    const img = await loadImage(input.portraitDataUrl);
    if (img) {
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(0, canvas.height * 0.35, 0, canvas.height);
      grad.addColorStop(0, "rgba(11,10,9,0)");
      grad.addColorStop(1, "rgba(11,10,9,0.97)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height * 0.35, canvas.width, canvas.height * 0.65);
    }
  }

  ctx.fillStyle = "#d4a13a";
  ctx.font = "500 30px Georgia, serif";
  ctx.fillText(input.label.toUpperCase(), 72, canvas.height - 380);

  ctx.fillStyle = "#f6f1e8";
  ctx.font = "400 96px Georgia, serif";
  wrap(ctx, input.line, 72, canvas.height - 250, canvas.width - 144, 108);

  ctx.fillStyle = "#a89c8d";
  ctx.font = "400 32px Georgia, serif";
  ctx.fillText(`${input.streak} day streak · ${input.companionName}`, 72, canvas.height - 72);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function wrap(
  ctx: Pick<CanvasRenderingContext2D, "measureText" | "fillText">,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let offset = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y + offset);
}

/** Native share sheet with files, falling back to a download. */
export async function shareCard(blob: Blob, filename = "velvetmotion.png"): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
