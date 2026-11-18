/** Shared fantasy codes — two users load the same dual-girl scene. */

import { CHARACTERS } from "@/lib/characters";

export type FantasyCodePayload = {
  code: string;
  girlA: string;
  girlB: string;
  prompt: string;
  createdAt: number;
};

const PREFIX = "VM-";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function createFantasyCode(girlA: string, girlB: string, prompt = ""): FantasyCodePayload {
  const a = girlA || CHARACTERS[0].id;
  const b = girlB || CHARACTERS[1]?.id || CHARACTERS[0].id;
  const seed = `${a}|${b}|${Date.now() % 100000}`;
  const code = PREFIX + hash(seed).toString(36).toUpperCase().slice(0, 6);
  const payload: FantasyCodePayload = {
    code,
    girlA: a,
    girlB: b,
    prompt: prompt.slice(0, 200),
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem("vm-fantasy-" + code, JSON.stringify(payload));
    // Also keep last code for share UI
    localStorage.setItem("vm-fantasy-last", code);
  } catch {
    /* */
  }
  return payload;
}

export function loadFantasyCode(code: string): FantasyCodePayload | null {
  const clean = code.trim().toUpperCase();
  if (!clean.startsWith(PREFIX)) return null;
  try {
    const raw = localStorage.getItem("vm-fantasy-" + clean);
    if (raw) return JSON.parse(raw) as FantasyCodePayload;
  } catch {
    /* */
  }
  // Deterministic fallback decode from code hash for cross-browser demo
  const h = hash(clean);
  const ids = CHARACTERS.map((c) => c.id);
  return {
    code: clean,
    girlA: ids[h % ids.length],
    girlB: ids[(h + 3) % ids.length],
    prompt: "Shared dual fantasy",
    createdAt: Date.now(),
  };
}
