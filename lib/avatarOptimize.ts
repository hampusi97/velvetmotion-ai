/** Resize imported PNG-card portraits before saving them to browser localStorage.
 * The original card metadata is parsed from the full file before this is called.
 */
export async function compactCardPortrait(file: File): Promise<string> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("Your browser cannot prepare this portrait. Try a recent browser or smaller PNG.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("Invalid PNG portrait.");
    const ratio = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.77);
    if (!url.startsWith("data:image/") || url.length > 800_000) {
      throw new Error("Portrait is too large for local card storage.");
    }
    return url;
  } finally {
    bitmap.close();
  }
}
