/**
 * Character Card Spec V2 Import / Export (JSON + PNG tEXt `chara` metadata chunk)
 * https://github.com/malfoyslastname/character-card-spec-v2
 * Strictly fictional consenting adults (18+) enforced via complianceFilter.
 */

import type { Character } from "./charactersTypes";
import { validateCharacterCompliance } from "./complianceFilter";
import { parseCharacterFromPngBuffer } from "./pngCardDecode";

export interface CharacterCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example?: string;
    tags: string[];
    creator_notes?: string;
    extensions?: {
      velvetmotion?: {
        age?: number;
        voiceId?: string;
        visualDna?: string;
        kink?: string;
        category?: string;
      };
    };
  };
}

export function exportCharacterToCardV2(c: Character): CharacterCardV2 {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: c.name,
      description: c.tagline,
      personality: c.personality,
      scenario: c.background,
      first_mes: c.initialMessage,
      tags: c.tags || [],
      creator_notes: `VelvetMotion AI fictional 18+ companion (${c.category}).`,
      extensions: {
        velvetmotion: {
          age: Math.max(18, c.age || 23),
          voiceId: c.voiceId || "af_heart",
          visualDna: c.visualDna || c.figure,
          kink: c.kink,
          category: c.category,
        },
      },
    },
  };
}

export function parseCardV2Json(rawText: string, avatarDataUrl?: string): { ok: true; character: Character } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText) as Partial<CharacterCardV2> & Record<string, unknown>;
    const d = (parsed.data || parsed) as Record<string, unknown>;
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Character card is missing a name." };

    const ext = (d.extensions as Record<string, unknown> | undefined)?.velvetmotion as Record<string, unknown> | undefined;
    const age = ext?.age === undefined || ext.age === null ? 23 : Number(ext.age);
    if (!Number.isFinite(age) || !Number.isInteger(age) || age < 18 || age > 120) {
      return { ok: false, error: "Character cards must declare a valid adult age of at least 18. Underage ages cannot be converted into adult companions." };
    }
    const description = String(d.description || `${name} · Imported V2 companion`).trim();
    const personality = String(d.personality || "Warm, confident, expressive").trim();
    const scenario = String(d.scenario || "Private evening conversation").trim();
    const greeting = String(d.first_mes || `Hey, I'm ${name}. Tell me what's on your mind.`).trim();
    const visualDna = String(ext?.visualDna || `${description}, photoreal adult portrait`);
    const kink = String(ext?.kink || "Roleplay & slow burn");

    const guard = validateCharacterCompliance({
      name,
      age,
      tagline: description,
      personality,
      backstory: scenario,
      kink,
      figure: visualDna,
    });
    if (!guard.ok) return { ok: false, error: guard.reason };

    const slug = `cardv2-${Date.now().toString(36)}`;
    const character: Character = {
      id: slug,
      name,
      age,
      tagline: description.slice(0, 140),
      category: String(ext?.category || "Imported"),
      avatar: avatarDataUrl || "/portraits/chloe-parker.webp",
      voiceIntro: `Hey... I'm ${name}.`,
      initialMessage: greeting,
      tags: Array.isArray(d.tags) ? d.tags.map(String).slice(0, 8) : ["Imported", "V2"],
      intimacy: 55,
      voice: { label: String(ext?.voiceId || "af_heart"), pitch: 1, rate: 0.96, style: personality },
      voiceId: String(ext?.voiceId || "af_heart"),
      visualDna,
      personality,
      traits: Array.isArray(d.tags) && d.tags.length ? d.tags.map(String).slice(0, 3) : ["Expressive", "Candid"],
      background: scenario,
      figure: visualDna,
      kink,
      reply: `${name} smiles warmly. “Tell me where we should start.”`,
    };
    return { ok: true, character };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid JSON character card" };
  }
}

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function encodeBase64Utf8(json: string): string {
  const bytes = encodeUtf8(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}


/** Extract `chara` JSON string from a SillyTavern / Character Card V2 PNG buffer. */
export function extractCharaFromPngBuffer(buffer: ArrayBuffer): string | null {
  const card = parseCharacterFromPngBuffer(buffer);
  return card ? JSON.stringify(card) : null;
}

/** Inject a `chara` tEXt chunk into an existing PNG image buffer before IEND. */
export function embedCharaIntoPngBuffer(pngBuffer: ArrayBuffer, card: CharacterCardV2): Blob {
  const bytes = new Uint8Array(pngBuffer);
  const payload = encodeUtf8(`chara\0${encodeBase64Utf8(JSON.stringify(card))}`);
  const chunkLen = payload.length;
  const chunk = new Uint8Array(12 + chunkLen);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, chunkLen);
  chunk[4] = 0x74; // t
  chunk[5] = 0x45; // E
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t
  chunk.set(payload, 8);
  const crcVal = crc32(chunk.slice(4, 8 + chunkLen));
  dv.setUint32(8 + chunkLen, crcVal);

  // Locate IEND chunk near end
  let insertAt = bytes.length - 12;
  if (insertAt < 8) insertAt = bytes.length;
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.slice(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(bytes.slice(insertAt), insertAt + chunk.length);
  return new Blob([out], { type: "image/png" });
}
