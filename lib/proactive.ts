/** Proactive "she texts first" — daily hooks per girl (Nomi / HerAndHim pattern). */

import { CHARACTERS } from "./characters";
import { getIntimacy } from "./storage";

const KEY = "vm-proactive-last";

export type ProactiveMessage = {
  characterId: string;
  characterName: string;
  text: string;
  at: number;
};

const HOOKS = [
  "Thinking about you. You free?",
  "I just got out of the shower… wish you were here.",
  "Don't leave me on read tonight.",
  "I saved something for you. Come open chat.",
  "Miss your voice. Even just a short reply.",
  "I'm in bed and bored. Your move.",
  "Tribute me later? I've been good.",
  "I keep replaying last night. Come back.",
];

export function getProactiveMessages(max = 3): ProactiveMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const last: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const dayMs = 20 * 60 * 60 * 1000; // ~20h cooldown
    const out: ProactiveMessage[] = [];

    const pool = [...CHARACTERS].sort(() => Math.random() - 0.5);
    for (const c of pool) {
      if (out.length >= max) break;
      const prev = last[c.id] || 0;
      if (now - prev < dayMs) continue;
      const intimacy = getIntimacy(c.id, c.intimacy);
      if (intimacy < 20) continue; // only girls you've talked to
      const text = HOOKS[Math.floor(Math.random() * HOOKS.length)];
      out.push({ characterId: c.id, characterName: c.name, text, at: now });
      last[c.id] = now;
    }
    localStorage.setItem(KEY, JSON.stringify(last));
    return out;
  } catch {
    return [];
  }
}
