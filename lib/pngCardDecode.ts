/**
 * Extract SillyTavern / Chub character JSON from PNG tEXt chunks.
 * Keywords: "chara" (V1/V2) or "ccv3" (V3). Value is base64 JSON.
 */

function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function decodeLatin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** Parse PNG tEXt / iTXt / zTXt (zTXt only if uncompressed path fails gracefully). */
export function extractPngTextChunks(buffer: ArrayBuffer): Record<string, string> {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  const out: Record<string, string> = {};

  // PNG signature
  if (u8.length < 8) return out;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) return out;

  let offset = 8;
  while (offset + 12 <= u8.length) {
    const length = readUint32BE(view, offset);
    const type =
      String.fromCharCode(u8[offset + 4]) +
      String.fromCharCode(u8[offset + 5]) +
      String.fromCharCode(u8[offset + 6]) +
      String.fromCharCode(u8[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > u8.length) break;

    if (type === "tEXt") {
      const data = u8.subarray(dataStart, dataEnd);
      let nullIdx = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0) {
          nullIdx = i;
          break;
        }
      }
      if (nullIdx > 0) {
        const key = decodeLatin1(data.subarray(0, nullIdx));
        const value = decodeLatin1(data.subarray(nullIdx + 1));
        out[key] = value;
      }
    } else if (type === "iTXt") {
      // keyword\0 compression\0 lang\0 translated\0 text
      const data = u8.subarray(dataStart, dataEnd);
      let p = 0;
      const nextNull = () => {
        while (p < data.length && data[p] !== 0) p++;
        const s = decodeLatin1(data.subarray(0, p)); // wrong — need slice from start
        return s;
      };
      // simpler scan
      let nulls: number[] = [];
      for (let i = 0; i < data.length; i++) if (data[i] === 0) nulls.push(i);
      if (nulls.length >= 1) {
        const key = decodeLatin1(data.subarray(0, nulls[0]));
        // compression flag at nulls[0]+1, method +1
        // skip lang and translated
        let idx = nulls[0] + 3;
        // find end of lang
        while (idx < data.length && data[idx] !== 0) idx++;
        idx++; // skip null
        while (idx < data.length && data[idx] !== 0) idx++;
        idx++;
        const value = decodeLatin1(data.subarray(idx));
        if (key && value) out[key] = value;
      }
      void nextNull;
    }

    if (type === "IEND") break;
    offset = dataEnd + 4; // skip CRC
  }
  return out;
}

export function parseCharacterFromPngBuffer(buffer: ArrayBuffer): unknown | null {
  const chunks = extractPngTextChunks(buffer);
  const raw = chunks.ccv3 || chunks.chara || chunks.Chara || null;
  if (!raw) return null;
  try {
    const jsonStr =
      typeof atob === "function"
        ? atob(raw.replace(/\s/g, ""))
        : Buffer.from(raw, "base64").toString("utf8");
    // handle UTF-8 in base64
    const bytes = Uint8Array.from(jsonStr, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(atob(raw));
    } catch {
      return null;
    }
  }
}

export async function parseCharacterCardFile(file: File): Promise<unknown | null> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json") || file.type === "application/json") {
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (name.endsWith(".png") || file.type === "image/png") {
    const buf = await file.arrayBuffer();
    return parseCharacterFromPngBuffer(buf);
  }
  // try as text json anyway
  try {
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}
