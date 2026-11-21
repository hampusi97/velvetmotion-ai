import test from "node:test";
import assert from "node:assert/strict";
import { encodeCloudVaultEnvelope } from "./cloudVaultEnvelope";

test("cloud envelope preserves complete escaped and multilingual JSON", () => {
  const source = JSON.stringify({
    memory: 'A quote: "Hej". 🌌',
    content: [1, 2],
  });
  const envelope = JSON.parse(encodeCloudVaultEnvelope(source, 12.9));
  assert.equal(envelope.updatedAtMs, 12);
  assert.equal(envelope.data, source);
  assert.deepEqual(JSON.parse(envelope.data), JSON.parse(source));
});
test("oversized and multi-byte payloads fail rather than silently truncating JSON", () => {
  assert.throws(
    () =>
      encodeCloudVaultEnvelope(
        JSON.stringify({ content: "x".repeat(65_500) }),
        1,
      ),
    /document limit/,
  );
  assert.throws(
    () =>
      encodeCloudVaultEnvelope(
        JSON.stringify({ content: "🌌".repeat(20_000) }),
        1,
      ),
    /document limit/,
  );
  assert.doesNotThrow(() =>
    encodeCloudVaultEnvelope(
      JSON.stringify({ content: "x".repeat(60_000) }),
      1,
    ),
  );
});
test("invalid JSON and timestamps are rejected", () => {
  assert.throws(() => encodeCloudVaultEnvelope("{bad", 1));
  for (const timestamp of [NaN, Infinity, -1])
    assert.throws(() => encodeCloudVaultEnvelope("{}", timestamp));
});
