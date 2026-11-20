/**
 * Parse character metadata from PNG cards without trusting unbounded uploads.
 * Supports the uncompressed PNG tEXt and iTXt forms used by character cards.
 */
const MAX_CARD_BYTES = 12 * 1024 * 1024;
const MAX_METADATA_BYTES = 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });

function latin1(bytes: Uint8Array): string {
  let result = "";
  for (const b of bytes) result += String.fromCharCode(b);
  return result;
}

function validCrc(bytes: Uint8Array, expected: number): boolean {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return ((crc ^ 0xffffffff) >>> 0) === expected;
}

export function extractPngTextChunks(buffer: ArrayBuffer): Record<string, string> {
  const out: Record<string, string> = {};
  if (buffer.byteLength > MAX_CARD_BYTES || buffer.byteLength < 8) return out;
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) return out;
  const view = new DataView(buffer);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (length > bytes.length - dataStart - 4) break;
    const type = latin1(bytes.subarray(offset + 4, offset + 8));
    if (length <= MAX_METADATA_BYTES && (type === "tEXt" || type === "iTXt")) {
      if (validCrc(bytes.subarray(offset + 4, dataEnd), view.getUint32(dataEnd))) {
        const data = bytes.subarray(dataStart, dataEnd);
        const separator = data.indexOf(0);
        if (separator > 0) {
          const key = latin1(data.subarray(0, separator));
          if (key === "chara" || key === "ccv3" || key === "Chara") {
            if (type === "tEXt") {
              out[key] = latin1(data.subarray(separator + 1));
            } else if (separator + 3 < data.length && data[separator + 1] === 0 && data[separator + 2] === 0) {
              // iTXt: keyword NUL, compression flag, method, language NUL,
              // translated keyword NUL, UTF-8 text.
              const languageEnd = data.indexOf(0, separator + 3);
              const translatedEnd = languageEnd < 0 ? -1 : data.indexOf(0, languageEnd + 1);
              if (translatedEnd >= 0) {
                try { out[key] = decoder.decode(data.subarray(translatedEnd + 1)); } catch { /* malformed UTF-8 */ }
              }
            }
          }
        }
      }
    }
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  return out;
}

export function parseCharacterFromPngBuffer(buffer: ArrayBuffer): unknown | null {
  const chunks = extractPngTextChunks(buffer);
  for (const raw of [chunks.ccv3, chunks.chara, chunks.Chara]) {
    if (!raw || raw.length > MAX_METADATA_BYTES) continue;
    try {
      const binary = atob(raw.replace(/\\s/g, ""));
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      return JSON.parse(decoder.decode(bytes));
    } catch { /* try next supported chunk */ }
  }
  return null;
}

export async function parseCharacterCardFile(file: File): Promise<unknown | null> {
  if (file.size > MAX_CARD_BYTES) return null;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") {
    return parseCharacterFromPngBuffer(await file.arrayBuffer());
  }
  if (name.endsWith(".json") || file.type === "application/json") {
    if (file.size > MAX_METADATA_BYTES) return null;
    try { return JSON.parse(await file.text()); } catch { return null; }
  }
  return null;
}
