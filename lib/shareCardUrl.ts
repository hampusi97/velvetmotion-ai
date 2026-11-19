/**
 * Serverless Shareable Character Links (`/#import=<compressed>`)
 * Compresses fictional adult (18+) companion JSON into a URL-safe hash string
 * and validates strictly via complianceFilter before saving.
 */

import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";

export interface SharedCharacterPayload {
  v: 1;
  id?: string;
  name: string;
  age: number;
  tagline: string;
  category: string;
  initialMessage: string;
  personality: string;
  background: string;
  figure: string;
  kink: string;
  tags: string[];
  voiceId?: string;
  avatar?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function encodeSharedCharacterUrl(c: Character, origin = "https://velvetmotion-ai.hampusi97.workers.dev"): Promise<string> {
  const payload: SharedCharacterPayload = {
    v: 1,
    name: c.name,
    age: Math.max(18, c.age || 23),
    tagline: c.tagline,
    category: c.category,
    initialMessage: c.initialMessage,
    personality: c.personality,
    background: c.background,
    figure: c.figure || c.visualDna || c.tagline,
    kink: c.kink,
    tags: (c.tags || []).slice(0, 6),
    voiceId: c.voiceId || "af_heart",
    avatar: c.avatar.startsWith("/") ? c.avatar : "/portraits/chloe-parker.webp",
  };
  const rawBytes = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await gzipBytes(rawBytes);
  const encoded = compressed ? `z.${toBase64Url(compressed)}` : `p.${toBase64Url(rawBytes)}`;
  return `${origin.replace(/\/$/, "")}/#import=${encoded}`;
}

export async function decodeSharedCharacterHash(
  hashOrParam: string,
): Promise<{ ok: true; character: Character } | { ok: false; error: string }> {
  try {
    const clean = hashOrParam.replace(/^#?import=/, "").trim();
    if (!clean) return { ok: false, error: "Empty share link" };

    let jsonStr = "";
    if (clean.startsWith("z.")) {
      const gz = fromBase64Url(clean.slice(2));
      const unzipped = await gunzipBytes(gz);
      if (!unzipped) return { ok: false, error: "Unsupported compressed share link in this browser" };
      jsonStr = new TextDecoder().decode(unzipped);
    } else if (clean.startsWith("p.")) {
      jsonStr = new TextDecoder().decode(fromBase64Url(clean.slice(2)));
    } else {
      jsonStr = new TextDecoder().decode(fromBase64Url(clean));
    }

    const p = JSON.parse(jsonStr) as Partial<SharedCharacterPayload>;
    const name = String(p.name || "").trim();
    if (!name) return { ok: false, error: "Shared link is missing companion name" };

    const age = Math.max(18, Number(p.age || 23));
    const check = validateCharacterCompliance({
      name,
      age,
      tagline: p.tagline,
      personality: p.personality,
      backstory: p.background,
      kink: p.kink,
      figure: p.figure,
    });
    if (!check.ok) return { ok: false, error: check.reason };

    const character: Character = {
      id: `shared-${Date.now().toString(36)}`,
      name,
      age,
      tagline: String(p.tagline || "Shared Neon Companion").slice(0, 140),
      category: String(p.category || "Shared"),
      avatar: String(p.avatar || "/portraits/chloe-parker.webp"),
      voiceIntro: `Hey… I'm ${name}.`,
      initialMessage: String(p.initialMessage || `Hey! Glad someone shared my card with you.`),
      tags: Array.isArray(p.tags) ? p.tags.map(String).slice(0, 6) : ["Shared"],
      intimacy: 60,
      voice: { label: String(p.voiceId || "af_heart"), pitch: 1, rate: 0.96, style: String(p.personality || "") },
      voiceId: String(p.voiceId || "af_heart"),
      visualDna: String(p.figure || p.tagline || ""),
      personality: String(p.personality || "Warm and spontaneous"),
      traits: Array.isArray(p.tags) && p.tags.length ? p.tags.map(String).slice(0, 3) : ["Shared", "Playful"],
      background: String(p.background || "Imported from shared VelvetMotion link."),
      figure: String(p.figure || p.tagline || ""),
      kink: String(p.kink || "Roleplay"),
      reply: `*${name} smiles brightly.* “We're already connected—tell me what to do first.”`,
    };
    return { ok: true, character };
  } catch {
    return { ok: false, error: "Invalid or corrupted share link" };
  }
}
