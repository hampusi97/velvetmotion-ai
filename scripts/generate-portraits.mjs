#!/usr/bin/env node
/**
 * VelvetMotion AI — Safe Companion Portrait Generator (`scripts/generate-portraits.mjs`)
 *
 * Calls GET https://velvetmotion-image.hampusi97.workers.dev/generate?prompt=...&steps=8
 * Validates HTTP 200, image/* Content-Type, > 5 KB size, and real JPEG/PNG/WebP magic bytes
 * BEFORE writing to public/portraits/ so corrupt 25-byte text files can NEVER be saved.
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKER_BASE = (
  process.env.NEXT_PUBLIC_IMAGE_WORKER_URL || 'https://velvetmotion-image.hampusi97.workers.dev'
)
  .replace(/\/generate\/?$/, '')
  .replace(/\/$/, '');

const OUT_DIR = path.join(process.cwd(), 'public', 'portraits');
fs.mkdirSync(OUT_DIR, { recursive: true });

function isValidImageBuffer(buf) {
  if (buf.length < 5000) return false;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return isJpg || isPng || isWebp;
}

export async function generatePortrait(slug, prompt, seed) {
  const params = new URLSearchParams({
    prompt: prompt.slice(0, 1500),
    steps: '8',
  });
  if (seed !== undefined) params.set('seed', String(seed));

  const url = `${WORKER_BASE}/generate?${params.toString()}`;
  const res = await fetch(url, { method: 'GET' });
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok || !contentType.startsWith('image/')) {
    const preview = (await res.text()).slice(0, 160);
    throw new Error(`Worker failed for ${slug}: HTTP ${res.status} (${contentType}) -> ${preview}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!isValidImageBuffer(buf)) {
    throw new Error(`Invalid/corrupt image binary returned for ${slug} (${buf.length} bytes)`);
  }

  const outFile = path.join(OUT_DIR, `${slug}.jpg`);
  fs.writeFileSync(outFile, buf);
  console.log(`✅ Saved ${outFile} (${Math.round(buf.length / 1024)} KB)`);
  return outFile;
}

// CLI usage: node scripts/generate-portraits.mjs <slug> "<prompt>" [seed]
if (process.argv[2] && process.argv[3]) {
  generatePortrait(process.argv[2], process.argv[3], process.argv[4]).catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
  });
}
