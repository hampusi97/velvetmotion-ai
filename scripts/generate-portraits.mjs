#!/usr/bin/env node
/**
 * VelvetMotion AI — Safe Companion Portrait Generator (`scripts/generate-portraits.mjs`)
 *
 * Calls GET https://velvetmotion-image.hampusi97.workers.dev/generate?prompt=...&steps=8
 * Automatically retries with editorial-safe clothing phrasing if Cloudflare Workers AI
 * triggers error 8007, validates HTTP 200 + image/* Content-Type + > 5 KB size + magic bytes,
 * and writes both public/portraits/<slug>.jpg and public/portraits/<slug>.webp.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

function sanitizeForCloudflare8007(prompt) {
  return prompt
    .replace(/\bwhite\s+American\s+woman\b/gi, 'American woman')
    .replace(/\bsilk\s+slip\s+dress\b/gi, 'silk evening dress')
    .replace(/\bsatin\s+slip\b/gi, 'satin evening dress')
    .replace(/\bslip\s+dress\b/gi, 'evening dress')
    .replace(/\bcropped\s+white\s+ribbed\s+tank\s+top\b/gi, 'white ribbed top')
    .replace(/\bcropped\b/gi, 'fitted')
    .replace(/\bwhite\s+shirt\s+slipping\s+off\s+one\s+shoulder\b/gi, 'wearing a crisp white button shirt')
    .replace(/\bslipping\s+off\s+one\s+shoulder\b/gi, 'draped elegantly')
    .replace(/\beditorial\s+glamour\s+photography\b/gi, 'editorial portrait photography');
}

async function fetchPortraitBuffer(prompt, seed) {
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
    const err = new Error(`HTTP ${res.status} (${contentType}) -> ${preview}`);
    err.preview = preview;
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!isValidImageBuffer(buf)) {
    throw new Error(`Invalid/corrupt image binary returned (${buf.length} bytes)`);
  }
  return buf;
}

export async function generatePortrait(slug, prompt, seed) {
  let buf;
  try {
    buf = await fetchPortraitBuffer(prompt, seed);
  } catch (err) {
    const sanitized = sanitizeForCloudflare8007(prompt);
    if (sanitized !== prompt) {
      console.warn(`⚠️  Retrying ${slug} with Cloudflare-8007 editorial phrasing...`);
      buf = await fetchPortraitBuffer(sanitized, seed);
    } else {
      throw new Error(`Worker failed for ${slug}: ${err.message}`);
    }
  }

  const cleanSlug = slug.replace(/\.(jpg|jpeg|webp|png)$/i, '');
  const jpgFile = path.join(OUT_DIR, `${cleanSlug}.jpg`);
  const webpFile = path.join(OUT_DIR, `${cleanSlug}.webp`);
  fs.writeFileSync(jpgFile, buf);

  try {
    const ffmpegBin = fs.existsSync('/Users/lars/.local/bin/ffmpeg')
      ? '/Users/lars/.local/bin/ffmpeg'
      : 'ffmpeg';
    execFileSync(ffmpegBin, ['-y', '-i', jpgFile, webpFile], { stdio: 'ignore' });
  } catch {
    fs.writeFileSync(webpFile, buf);
  }

  console.log(`✅ Saved ${jpgFile} (${Math.round(buf.length / 1024)} KB) + ${webpFile}`);
  return webpFile;
}

// CLI usage: node scripts/generate-portraits.mjs <slug> "<prompt>" [seed]
if (process.argv[2] && process.argv[3]) {
  generatePortrait(process.argv[2], process.argv[3], process.argv[4]).catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
  });
}
