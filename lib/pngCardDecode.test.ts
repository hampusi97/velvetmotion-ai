import test from "node:test";
import assert from "node:assert/strict";
import { extractPngTextChunks, parseCharacterFromPngBuffer } from "./pngCardDecode";

function chunk(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(12 + payload.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, payload.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, 8 + payload.length)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  view.setUint32(8 + payload.length, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
function png(...chunks: Uint8Array[]): ArrayBuffer {
  const signature = Uint8Array.from([137,80,78,71,13,10,26,10]);
  const size = 8 + chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(size);
  result.set(signature);
  let offset = 8;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return result.buffer;
}
test("reads valid V3 tEXt card", () => {
  const payload = new TextEncoder().encode("ccv3\\0" + btoa(JSON.stringify({ spec: "chara_card_v3", data: { name: "Ada" } })));
  assert.deepEqual(parseCharacterFromPngBuffer(png(chunk("tEXt", payload))), { spec: "chara_card_v3", data: { name: "Ada" } });
});
test("reads uncompressed iTXt character metadata", () => {
  const value = btoa(JSON.stringify({ data: { name: "Ada" } }));
  const payload = new TextEncoder().encode("chara\\0\\0\\0\\0\\0" + value);
  assert.deepEqual(parseCharacterFromPngBuffer(png(chunk("iTXt", payload))), { data: { name: "Ada" } });
});
test("rejects corrupted CRC and oversized files", () => {
  const c = chunk("tEXt", new TextEncoder().encode("chara\\0" + btoa("{}")));
  c[c.length - 1] ^= 1;
  assert.equal(parseCharacterFromPngBuffer(png(c)), null);
  assert.deepEqual(extractPngTextChunks(new ArrayBuffer(12 * 1024 * 1024 + 1)), {});
});
