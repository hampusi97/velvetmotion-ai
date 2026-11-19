/**
 * Durable image helpers. AI Horde result links expire and blob: URLs die on reload, so every
 * generated image is converted to a small JPEG data URL before it is stored in chats/gallery.
 */

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof document === "undefined") {
    const buf = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type || "image/jpeg"};base64,${buf.toString("base64")}`;
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Downscale to <= maxW wide JPEG so chats/gallery stay inside the ~5MB localStorage quota. */
export async function toStableDataUrl(blob: Blob, maxW = 640, quality = 0.82): Promise<string> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return blobToDataUrl(blob);
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxW / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return blobToDataUrl(blob);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return blobToDataUrl(blob);
  }
}

export async function remoteImageToStableDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  return toStableDataUrl(await res.blob());
}
