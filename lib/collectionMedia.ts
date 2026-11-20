import { loadGalleryDB, saveGalleryDB } from "./db";
import { blobToDataUrl, remoteImageToStableDataUrl } from "./imageStore";
import { addToGallery, getGallery, type GalleryItem } from "./storage";

export function collectionMediaFile({ url, type }: Pick<GalleryItem, "url" | "type">) {
  const mime = url.match(/^data:(image|video)\/([\w+-]+)/i);
  const path = url.split(/[?#]/, 1)[0];
  const extension = (mime?.[2] || path.match(/\.(mp4|webm|mov|ogv|avif|gif|jpg|jpeg|png|svg|webp)$/i)?.[1])?.toLowerCase();
  const isVideo = mime ? mime[1].toLowerCase() === "video" : extension
    ? ["mp4", "webm", "mov", "ogv"].includes(extension) : type === "video";
  const filenameExtension = extension === "jpeg" ? "jpg" : extension === "svg+xml" ? "svg" :
    extension === "quicktime" ? "mov" : extension === "ogg" ? "ogv" : extension;
  return { isVideo, extension: filenameExtension ?? (isVideo ? "webm" : "png") };
}

/** Save playable video bytes in IndexedDB so clips survive a reload and can be backed up. */
export async function saveCollectionClip(clip: Pick<GalleryItem, "url" | "characterId" | "characterName" | "prompt">) {
  const response = await fetch(clip.url);
  if (!response.ok) throw new Error(`The video could not be retrieved (HTTP ${response.status}).`);
  const file = await response.blob();
  if (!file.size || !file.type.startsWith("video/")) {
    throw new Error("The provider did not return a video file that can be saved.");
  }
  await saveGalleryDB({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    characterId: clip.characterId,
    characterName: clip.characterName,
    prompt: clip.prompt,
    url: await blobToDataUrl(file),
    mood: "video",
    createdAt: Date.now(),
  });
  window.dispatchEvent(new Event("vm:vault-updated"));
}

/** Save an image that can be opened again after the original render URL expires. */
export async function saveCollectionPhoto(photo: Omit<GalleryItem, "id" | "createdAt">) {
  const url = photo.url.startsWith("data:image/") ? photo.url
    : await remoteImageToStableDataUrl(photo.url, AbortSignal.timeout(15_000));
  if (!url.startsWith("data:image/")) throw new Error("The model did not return a photo that can be saved.");
  const saved = addToGallery({ ...photo, url });
  if (!saved) throw new Error("Collection storage is unavailable.");
  try {
    await saveGalleryDB({
      id: saved.id,
      characterId: saved.characterId,
      characterName: saved.characterName,
      prompt: saved.prompt,
      url: saved.url,
      mood: saved.type,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    if (!getGallery().some((item) => item.id === saved.id)) throw error;
  }
  window.dispatchEvent(new Event("vm:vault-updated"));
  return saved.url;
}

export async function loadCollectionItems(): Promise<GalleryItem[]> {
  const rows = await loadGalleryDB().catch(() => []);
  const items = new Map(getGallery().map((item) => [item.id, item]));
  for (const row of rows) {
    if (!row.characterName || items.has(row.id)) continue;
    items.set(row.id, {
      id: row.id,
      characterId: row.characterId || "",
      characterName: row.characterName,
      type: row.mood,
      url: row.url,
      prompt: row.prompt,
      createdAt: row.createdAt,
    });
  }
  return [...items.values()];
}
