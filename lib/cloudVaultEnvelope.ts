/** Respect the existing Firestore vault limit without truncating serialized JSON. */
export function encodeCloudVaultEnvelope(
  payloadJson: string,
  updatedAtMs: number,
): string {
  if (!Number.isFinite(updatedAtMs) || updatedAtMs < 0)
    throw new Error("Invalid vault timestamp.");
  JSON.parse(payloadJson);
  const envelope = JSON.stringify({
    updatedAtMs: Math.floor(updatedAtMs),
    data: payloadJson,
  });
  if (new TextEncoder().encode(envelope).byteLength > 65_500) {
    throw new Error(
      "Cloud snapshot exceeds the vault document limit. Keep a local content backup.",
    );
  }
  return envelope;
}
