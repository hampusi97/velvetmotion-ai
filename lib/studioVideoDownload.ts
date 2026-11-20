/** Safe, explicit Studio clip export. Never trust remote video links to honor the HTML download attribute. */
export const MAX_STUDIO_VIDEO_DOWNLOAD = 250 * 1024 * 1024;

export function validateStudioVideoUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid video URL."); }
  const scheme = url.protocol.toLowerCase();
  if (url.username || url.password) throw new Error("Video download URLs cannot contain credentials.");
  if (scheme === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Insecure remote video downloads are blocked. Use HTTPS or a local inference server.");
  }
  if (scheme === "data:") {
    if (!/^data:video\/(?:mp4|webm);base64,/i.test(value)) throw new Error("Only MP4/WebM data URLs are supported.");
    if (value.length > MAX_STUDIO_VIDEO_DOWNLOAD * 1.4) throw new Error("Video file exceeds the download limit.");
  } else if (!["https:", "http:", "blob:"].includes(scheme)) {
    throw new Error("Unsupported video download URL scheme.");
  }
  return url;
}

export async function fetchStudioVideoBlob(
  sourceUrl: string, fetcher: typeof fetch = fetch,
): Promise<Blob> {
  validateStudioVideoUrl(sourceUrl);
  const response = await fetcher(sourceUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Video download HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_STUDIO_VIDEO_DOWNLOAD) {
    throw new Error("Clip exceeds the 250 MB browser download limit. Save it from the model server.");
  }
  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (contentType && !["video/mp4", "video/webm", "application/octet-stream"].includes(contentType)) {
    throw new Error(`The video provider returned ${contentType} instead of a playable clip.`);
  }
  const blob = await response.blob();
  if (!blob.size || blob.size > MAX_STUDIO_VIDEO_DOWNLOAD) {
    throw new Error("The clip was empty or exceeded the 250 MB browser download limit.");
  }
  return blob;
}

export function saveStudioVideoBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") throw new Error("Video downloads require a browser.");
  if (!/^velvetmotion-[\w-]+\.(?:mp4|webm)$/.test(filename)) {
    throw new Error("Invalid video download filename.");
  }
  const local = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = local;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    // Some browsers start file downloads after the click event completes.
    setTimeout(() => URL.revokeObjectURL(local), 30_000);
  }
}
