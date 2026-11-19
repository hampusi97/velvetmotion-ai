#!/usr/bin/env node
/**
 * scripts/generate-portraits.mjs
 * Zero-dependency Node 20+ script to batch-generate all 12 flagship portraits
 * into /public/portraits/ using your live Cloudflare Worker.
 *
 * Usage:
 *   node scripts/generate-portraits.mjs
 *   IMAGE_WORKER_URL=https://velvetmotion-image.hampusi97.workers.dev node scripts/generate-portraits.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const WORKER_URL =
  process.env.IMAGE_WORKER_URL || 'https://velvetmotion-image.hampusi97.workers.dev';
const OUT_DIR = path.resolve(process.cwd(), 'public', 'portraits');

const PORTRAITS = [
  {
    slug: 'chloe-parker',
    prompt:
      '22-year-old woman with warm chestnut waves, soft hazel eyes, natural freckles, wearing an oversized cream off-shoulder knit sweater in a cozy lamp-lit bedroom, candid smartphone portrait, natural skin texture, shallow depth of field, vertical 2:3',
  },
  {
    slug: 'maya-solis',
    prompt:
      '24-year-old sun-kissed Latina woman with long dark wavy hair, glowing bronzed skin, bright playful smile, wearing a sleek pastel pink swimsuit beside a sunset infinity pool, golden-hour natural photography, crisp DSLR detail, vertical 2:3',
  },
  {
    slug: 'sloane-kensington',
    prompt:
      '28-year-old woman with sleek jet-black hair, piercing green eyes, sculpted cheekbones, wearing a tailored black silk blazer in a glass penthouse overlooking city lights at night, moody luxury editorial photography, vertical 2:3',
  },
  {
    slug: 'raven-vance',
    prompt:
      '25-year-old alt woman with short glossy black wolf-cut hair, subtle silver piercings, winged dark eyeliner, wearing a black mesh top and silver choker in a dimly lit room with purple neon and vinyl records, candid film photography, vertical 2:3',
  },
  {
    slug: 'sora-takahashi',
    prompt:
      '22-year-old East Asian woman with silky dark hair with soft bangs, warm brown eyes, wearing a cropped pastel hoodie with gaming headphones around her neck in a cozy pink-and-cyan RGB gaming room, crisp candid portrait, vertical 2:3',
  },
  {
    slug: 'dalia-moreau',
    prompt:
      '26-year-old Mediterranean woman with long dark espresso hair, warm olive skin, full lips, wearing an off-shoulder rose-pink top inside a car at golden hour, sunlit candid smartphone selfie, realistic skin texture, vertical 2:3',
  },
  {
    slug: 'lena-brooks',
    prompt:
      '23-year-old woman with honey-blonde hair in a loose high ponytail, bright blue-green eyes, athletic toned build, wearing a sage-green matching yoga set in a bright sunlit modern apartment, candid natural-light mirror selfie, vertical 2:3',
  },
  {
    slug: 'aria-velasco',
    prompt:
      '27-year-old woman with glossy dark brunette waves, warm amber eyes, subtle gold jewelry, wearing a fitted burgundy off-shoulder top behind a moody amber-lit cocktail lounge bar, cinematic shallow-DOF portrait, vertical 2:3',
  },
  {
    slug: 'nova-park',
    prompt:
      '23-year-old Korean-American woman with sleek silver-streaked black bob hair, sharp dark eyes, wearing a cropped matte-black techwear jacket in a rain-streaked neon-blue and magenta city apartment, cinematic night photography, vertical 2:3',
  },
  {
    slug: 'nadine-okoye',
    prompt:
      '29-year-old Black woman with radiant deep brown skin, glossy braided updo, warm expressive eyes, gold hoop earrings, wearing an emerald satin dress in a candlelit art gallery loft, editorial natural-light photography, vertical 2:3',
  },
  {
    slug: 'claire-bennett',
    prompt:
      '24-year-old woman with auburn wavy hair pinned loosely back, thin gold-rimmed glasses, warm green eyes, wearing a soft sage cardigan in a cozy lamp-lit indie bookshop, candid warm natural photography, vertical 2:3',
  },
  {
    slug: 'yumi-chen',
    prompt:
      '23-year-old East Asian woman with long silky midnight-blue tinted hair, bright expressive eyes, soft glam makeup, wearing a stylish sakura-pink satin jacket in a Tokyo-inspired neon studio, crisp vibrant photography, vertical 2:3',
  },
];

async function saveImageFromUrlOrDataUri(imageUrl, destPath) {
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1];
    await fs.writeFile(destPath, Buffer.from(base64, 'base64'));
    return;
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed downloading image (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

async function generateOne(item) {
  const dest = path.join(OUT_DIR, `${item.slug}.webp`);
  try {
    await fs.access(dest);
    console.log(`[skip] ${item.slug}.webp already exists`);
    return;
  } catch {
    // File does not exist yet
  }

  console.log(`[gen]  ${item.slug}.webp ...`);
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: item.prompt,
      nsfw: false,
      width: 768,
      height: 1024,
    }),
  });

  if (!res.ok) {
    throw new Error(`Worker HTTP ${res.status}: ${await res.text()}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    const url = data.imageUrl || data.url || data.image;
    if (!url) throw new Error('Worker JSON missing imageUrl');
    await saveImageFromUrlOrDataUri(url, dest);
  } else {
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
  }
  console.log(`[ok]   saved ${dest}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const item of PORTRAITS) {
    try {
      await generateOne(item);
      // Small delay to stay polite with free-tier rate limits
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[err]  ${item.slug}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log('\nDone! All generated portraits are in public/portraits/.');
}

main();