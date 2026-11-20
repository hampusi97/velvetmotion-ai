/**
 * Offline, character-scoped storage for user-supplied VRM avatars.
 * VRM 0.x/1.x files are GLB containers. Reject external resources because
 * a model file should never trigger hidden requests to arbitrary servers.
 * The viewer uses THREE.GLTFLoader (basic VRM preview), not the Cubism SDK.
 */
const DATABASE = "velvetmotion-vrm-avatars";
const STORE = "models";
export const MAX_VRM_BYTES = 80 * 1024 * 1024;

export function inspectVrmBytes(data: ArrayBuffer): { version: 0 | 1; size: number } {
  if (data.byteLength < 20 || data.byteLength > MAX_VRM_BYTES) throw new Error("VRM file must be at most 80 MB and contain a complete GLB header.");
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== data.byteLength) throw new Error("Invalid GLB/VRM header.");
  const jsonLength = view.getUint32(12, true);
  if (!jsonLength || jsonLength > 2_000_000 || 20 + jsonLength > data.byteLength ||
      view.getUint32(16, true) !== 0x4e4f534a) throw new Error("VRM metadata is missing or too large.");
  let json: unknown;
  try { json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(data, 20, jsonLength))); }
  catch { throw new Error("VRM metadata is not valid UTF-8 JSON."); }
  if (!json || typeof json !== "object") throw new Error("Invalid VRM metadata.");
  const meta = json as { extensionsUsed?: unknown; extensions?: Record<string, unknown>; images?: unknown; buffers?: unknown };
  const extensions = Array.isArray(meta.extensionsUsed) ? meta.extensionsUsed : [];
  const version = extensions.includes("VRMC_vrm") || meta.extensions?.VRMC_vrm ? 1
    : extensions.includes("VRM") || meta.extensions?.VRM ? 0 : null;
  if (version === null) throw new Error("This GLB file is not a VRM avatar (missing VRM metadata).");
  for (const field of [meta.images, meta.buffers]) {
    if (!Array.isArray(field)) continue;
    for (const item of field) {
      if (!item || typeof item !== "object") continue;
      const uri = (item as { uri?: unknown }).uri;
      if (uri !== undefined && (typeof uri !== "string" || !uri.startsWith("data:"))) {
        throw new Error("VRM avatars must embed all resources; external URLs are not allowed.");
      }
    }
  }
  return { version, size: data.byteLength };
}

function keyFor(characterId: string): string {
  if (!/^[\w-]{1,100}$/.test(characterId)) throw new Error("Invalid character ID.");
  return characterId;
}
function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE); };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error || new Error("Could not open VRM storage."));
  });
}
export async function saveVrmAvatar(characterId: string, file: File): Promise<{ version: 0 | 1; size: number }> {
  const id = keyFor(characterId);
  if (file.size > MAX_VRM_BYTES || !/\.vrm$/i.test(file.name)) throw new Error("Select a .vrm file smaller than 80 MB.");
  const data = await file.arrayBuffer();
  const result = inspectVrmBytes(data);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(new Blob([data], { type: "model/gltf-binary" }), id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error("Avatar storage was aborted."));
      tx.onerror = () => reject(tx.error || new Error("Avatar storage failed."));
    });
  } finally { db.close(); }
  return result;
}
export async function loadVrmAvatar(characterId: string): Promise<ArrayBuffer | null> {
  const id = keyFor(characterId);
  const db = await database();
  try {
    const stored = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not load avatar."));
    });
    if (!(stored instanceof Blob)) return null;
    const buffer = await stored.arrayBuffer();
    inspectVrmBytes(buffer);
    return buffer;
  } finally { db.close(); }
}
export async function removeVrmAvatar(characterId: string): Promise<void> {
  const id = keyFor(characterId);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not remove VRM."));
    });
  } finally { db.close(); }
}
