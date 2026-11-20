import { loadGalleryDB, saveGalleryDB } from "./db";
import { blobToDataUrl } from "./imageStore";
import { getGallery, type GalleryItem } from "./storage";

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
}

export async function loadCollectionItems(): Promise<GalleryItem[]> {
  const clips = await loadGalleryDB().catch(() => []);
  const items = new Map(getGallery().map((item) => [item.id, item]));
  for (const clip of clips) {
    if (clip.mood !== "video" || !clip.characterName) continue;
    items.set(clip.id, {
      id: clip.id,
      characterId: clip.characterId || "",
      characterName: clip.characterName,
      type: "video",
      url: clip.url,
      prompt: clip.prompt,
      createdAt: clip.createdAt,
    });
  }
  return [...items.values()];
}
