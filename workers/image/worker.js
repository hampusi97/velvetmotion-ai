/**
 * VelvetMotion AI — Cloudflare Image Worker (`workers/image/worker.js`)
 *
 * Supports BOTH:
 *  - GET  /generate?prompt=...&steps=8&seed=12345
 *  - POST /generate  with JSON body { prompt, steps, seed }
 *
 * Runs @cf/black-forest-labs/flux-1-schnell on Workers AI and returns binary image/jpeg
 * with full CORS headers for web + Tauri desktop apps.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/generate' && url.pathname !== '/generate/') {
      return new Response(
        JSON.stringify({
          service: 'VelvetMotion image worker',
          usage: 'GET or POST /generate with prompt, optional steps (4-8), optional seed',
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      );
    }

    let prompt = '';
    let stepsRaw = 8;
    let seedRaw;

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        prompt = String(body.prompt ?? '').trim();
        stepsRaw = Number(body.steps ?? 8);
        if (body.seed !== undefined && body.seed !== null) {
          seedRaw = Number(body.seed);
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    } else {
      prompt = (url.searchParams.get('prompt') ?? '').trim();
      stepsRaw = Number(url.searchParams.get('steps') ?? 8);
      const seedParam = url.searchParams.get('seed');
      if (seedParam !== null && seedParam !== '') {
        seedRaw = Number(seedParam);
      }
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing required prompt parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const steps = Math.min(8, Math.max(4, Number.isFinite(stepsRaw) ? Math.round(stepsRaw) : 8));
    const input = {
      prompt: prompt.slice(0, 1800),
      steps,
    };
    if (Number.isFinite(seedRaw)) {
      input.seed = Math.abs(Math.floor(seedRaw));
    }

    try {
      const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', input);

      let bytes;
      if (result && typeof result.image === 'string') {
        const binaryString = atob(result.image);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else if (result instanceof Uint8Array || result instanceof ArrayBuffer) {
        bytes = result instanceof Uint8Array ? result : new Uint8Array(result);
      } else {
        throw new Error('Unexpected AI image output format');
      }

      return new Response(bytes, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Image generation failed',
          detail: err instanceof Error ? err.message : String(err),
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      );
    }
  },
};
