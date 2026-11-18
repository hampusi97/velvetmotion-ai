import { NextResponse } from "next/server";
import { CHARACTERS } from "@/lib/characters";
import { JOI_PRESETS, STORY_PACKS } from "@/lib/content";
import { SHORTS_SERIES } from "@/lib/shortsCatalog";
import { TRIBUTES } from "@/lib/tributes";

export const dynamic = "force-dynamic";

function hasKey(val: string | undefined): boolean {
  const trimmed = (val || "").trim();
  return trimmed.length > 15 && !/dummy|your_|changeme|placeholder/i.test(trimmed);
}

export async function GET() {
  const geminiConfigured = hasKey(process.env.GEMINI_API_KEY);
  const ollamaConfigured = Boolean((process.env.OLLAMA_URL || "").trim());
  const customImageConfigured = Boolean((process.env.AI_IMAGE_ENDPOINT || "").trim());
  const customVideoConfigured = Boolean((process.env.AI_VIDEO_ENDPOINT || "").trim());
  const telegramConfigured = Boolean((process.env.TELEGRAM_BOT_TOKEN || "").trim());

  return NextResponse.json({
    ok: true,
    service: "velvetmotion-ai",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
    engines: {
      chat: ollamaConfigured
        ? "ollama"
        : geminiConfigured
          ? "gemini"
          : "local-mood-engine",
      image: customImageConfigured ? "custom-endpoint" : "pollinations-flux",
      video: customVideoConfigured ? "external-mp4-worker" : "pollinations-4frame-sequence",
      music: geminiConfigured ? "lyria-3-with-wav-fallback" : "velvet-synth-wav",
      voice: geminiConfigured ? "gemini-live-with-webspeech-fallback" : "webspeech-tts",
      telegramBridge: telegramConfigured ? "configured" : "client-or-worker",
    },
    catalog: {
      companions: CHARACTERS.length,
      storyPacks: STORY_PACKS.length,
      joiScenarios: JOI_PRESETS.length,
      shortsSeries: SHORTS_SERIES.length,
      tributeChallenges: TRIBUTES.length,
    },
  });
}
