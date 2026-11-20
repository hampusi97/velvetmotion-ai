/** Resize imported card portraits for localStorage without saving full-size PNG bytes. */
export async function compactCardPortrait(file: File): Promise<string> {
  if (typeof document === "undefined") throw new Error("Portrait conversion needs a browser.");
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
    } else {
      // Fallback for desktop WebKit versions without createImageBitmap.
      objectUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Unable to decode card portrait."));
        element.src = objectUrl!;
      });
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    if (!width || !height) throw new Error("Invalid PNG portrait.");
    const scale = Math.min(1, 512 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable for portrait conversion.");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const output = canvas.toDataURL("image/jpeg", 0.77);
    if (!output.startsWith("data:image/jpeg") || output.length > 800_000) {
      throw new Error("Portrait exceeds the local storage limit after compression.");
    }
    return output;
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Only display raster images from user-created/imported cards in public roster surfaces.
 * Untrusted SVG and external URLs do not bypass SafeImage's restrictions.
 */
export function safeCompanionAvatarUrl(candidate: string | undefined): string | null {
  if (!candidate) return null;
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(candidate) && candidate.length <= 2_000_000) return candidate;
  if (/^\/portraits\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(candidate)) return candidate;
  return null;
}

/** Turn an original built-in SVG illustration into a raster thumbnail the safe image system accepts. */
export async function rasterizeStarterIllustration(svgDataUrl: string): Promise<string> {
  if (!svgDataUrl.startsWith("data:image/svg+xml;charset=utf-8,") || typeof document === "undefined") {
    throw new Error("No built-in illustration available for conversion.");
  }
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare the built-in avatar."));
    img.src = svgDataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 315;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable for avatar conversion.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL("image/png");
  if (!safeCompanionAvatarUrl(data)) throw new Error("Could not safely encode the new avatar.");
  return data;
}
