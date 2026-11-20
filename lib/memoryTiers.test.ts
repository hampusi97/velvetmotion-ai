import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMemory, exportMemoryBackup, importMemoryBackup } from "./memoryTiers";

test("normalizes malformed memory and removes duplicate notes", () => {
  const normalized = normalizeMemory({
    short: [{ role: "user", content: "hello" }, { role: "system", content: "unsafe" }, null],
    mid: ["  Likes tea ", "likes tea", 123],
    long: ["Remember this"],
    updatedAt: Number.POSITIVE_INFINITY,
  });
  assert.deepEqual(normalized.short, [{ role: "user", content: "hello" }]);
  assert.deepEqual(normalized.mid, ["Likes tea"]);
  assert.deepEqual(normalized.long, ["Remember this"]);
  assert.ok(Number.isFinite(normalized.updatedAt));
});
test("round trips portable memory backups", () => {
  const original = normalizeMemory({ short: [], mid: ["Tea"], long: ["Nickname"], updatedAt: 123 });
  assert.deepEqual(importMemoryBackup(exportMemoryBackup(original)), original);
});
test("rejects invalid backup formats", () => {
  assert.throws(() => importMemoryBackup('{"version":2,"memory":{}}'), /Unsupported/);
  assert.throws(() => importMemoryBackup("x".repeat(256001)), /256 KB/);
});
