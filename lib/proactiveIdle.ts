/**
 * Lite "live mode": when the user is idle, she may text first.
 * Uses Notification API / SW when permission granted (PWA-friendly).
 */

import type { Character } from "./charactersTypes";
import { getIntimacy } from "./storage";
import { showProactiveNotification, ensureNotificationPermission } from "./pwaProactive";

export type ProactivePing = {
  characterId: string;
  characterName: string;
  text: string;
  at: number;
};

const QUEUE_KEY = "vm-proactive-queue";
const LAST_KEY = "vm-proactive-last";
const IDLE_MS = 45_000;
const COOLDOWN_MS = 12 * 60_000;

const TEMPLATES = [
  (n: string) => `Hey… it's ${n}. You went quiet. Still thinking about me?`,
  (n: string) => `${n} here. I almost sent a photo. Should I?`,
  (n: string) => `Miss you already. Come back when you can — ${n}.`,
  (n: string) => `*${n} types, deletes, types again.* “You free?”`,
  (n: string) => `I kept the light on. ${n} is waiting.`,
  (n: string) => `Don't leave me on read forever… ${n} 💕`,
  (n: string) => `Random thought: I want your hands on me later. — ${n}`,
];

export function loadProactiveQueue(): ProactivePing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveProactiveQueue(list: ProactivePing[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* */
  }
}

export function dismissProactive(at: number) {
  const next = loadProactiveQueue().filter((p) => p.at !== at);
  saveProactiveQueue(next);
  return next;
}

export function canFireProactive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = parseInt(localStorage.getItem(LAST_KEY) || "0", 10);
    return Date.now() - last > COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markProactiveFired() {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* */
  }
}

export function buildProactivePing(character: Character): ProactivePing {
  const intimacy = getIntimacy(character.id, character.intimacy);
  const text = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)](
    character.name.split(" ")[0],
  );
  const spicy =
    intimacy >= 55
      ? ` ${Math.random() > 0.5 ? "I might be undressed already." : "Tribute me later if you miss me."}`
      : "";
  return {
    characterId: character.id,
    characterName: character.name,
    text: text + spicy,
    at: Date.now(),
  };
}

function notifyPing(ping: ProactivePing) {
  showProactiveNotification(ping.characterName, ping.text, `vm-${ping.characterId}`);
  try {
    navigator.serviceWorker?.controller?.postMessage({
      type: "show-notification",
      title: ping.characterName,
      body: ping.text,
      characterId: ping.characterId,
    });
  } catch {
    /* */
  }
}

export function startProactiveWatcher(
  getCharacter: () => Character | null,
  onPing: (ping: ProactivePing) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idle = true;

  void ensureNotificationPermission();

  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!idle || !canFireProactive()) {
        arm();
        return;
      }
      const c = getCharacter();
      if (!c) {
        arm();
        return;
      }
      const ping = buildProactivePing(c);
      const q = [ping, ...loadProactiveQueue()].slice(0, 20);
      saveProactiveQueue(q);
      markProactiveFired();
      notifyPing(ping);
      onPing(ping);
      arm();
    }, IDLE_MS);
  };

  const bump = () => {
    idle = false;
    setTimeout(() => {
      idle = true;
    }, 2000);
    arm();
  };

  window.addEventListener("pointerdown", bump);
  window.addEventListener("keydown", bump);
  arm();

  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener("pointerdown", bump);
    window.removeEventListener("keydown", bump);
  };
}

export const PROACTIVE_IDLE_MS = IDLE_MS;
