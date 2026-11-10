export function clampVoice(pitch, rate) {
  const numericPitch = Number(pitch);
  const numericRate = Number(rate);
  return {
    pitch: Number.isFinite(numericPitch) ? Math.min(1.8, Math.max(0.5, Math.round(numericPitch * 100) / 100)) : 1,
    rate: Number.isFinite(numericRate) ? Math.min(1.4, Math.max(0.7, Math.round(numericRate * 100) / 100)) : 1,
  };
}

export function chunkForSpeech(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]+(?:"|”)?|[^.!?]+$/g) || [clean];
  const chunks = [];
  let buffer = "";
  for (const part of parts) {
    const piece = part.trim();
    if (!piece) continue;
    const next = buffer ? `${buffer} ${piece}` : piece;
    if (next.length > 240 && buffer) {
      chunks.push(buffer);
      buffer = piece;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.slice(0, 16);
}
