/**
 * Telegram bridge settings — pattern from Synthintel0/MyGirlGPT.
 * Full bot needs a worker with BOT_TOKEN; this stores config + builds webhook URL docs.
 */

export type TelegramBridgeConfig = {
  botToken: string;
  enabled: boolean;
  characterId: string;
  webhookSecret: string;
};

const KEY = "vm-telegram-bridge";

export function getTelegramConfig(): TelegramBridgeConfig {
  if (typeof window === "undefined") {
    return { botToken: "", enabled: false, characterId: "", webhookSecret: "" };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { botToken: "", enabled: false, characterId: "", webhookSecret: "" };
    return { botToken: "", enabled: false, characterId: "", webhookSecret: "", ...JSON.parse(raw) };
  } catch {
    return { botToken: "", enabled: false, characterId: "", webhookSecret: "" };
  }
}

export function saveTelegramConfig(partial: Partial<TelegramBridgeConfig>) {
  const next = { ...getTelegramConfig(), ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

/** Env template for a separate worker (Vercel cron / Railway). */
export const TELEGRAM_WORKER_ENV = `
BOT_TOKEN=
WEBHOOK_SECRET=
VELVET_API_URL=https://velvetmotionai.vercel.app/api/chat
DEFAULT_CHARACTER_ID=
`.trim();
