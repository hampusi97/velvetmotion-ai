import { NextResponse } from "next/server";
import { CHARACTERS } from "@/lib/characters";
import { JOI_PRESETS, STORY_PACKS } from "@/lib/content";
import { SHORTS_SERIES } from "@/lib/shortsCatalog";
import { TRIBUTES } from "@/lib/tributes";
import { OWNER_PRIZES, PRIMARY_BTC_WALLET } from "@/lib/wallet";
import firebaseConfig from "../../../firebase-applet-config.json";

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
      directorPipeline: "active-5-stage",
      loungeRelay: "firestore-plus-cloud-relay",
    },
    firebase: {
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      authProviders: ["emailPassword", "google", "anonymous"],
      rulesPublished: true,
    },
    wallet: {
      primaryBtcWallet: PRIMARY_BTC_WALLET,
      recommendedDonationUsd: 5,
      ownerPrizesCount: OWNER_PRIZES.length,
      leaderboardActive: true,
    },
    security: {
      httpSecurityHeaders: true,
      ssrfProtection: true,
      adult21SafetyGuardrail: true,
      xssInputSanitization: true,
      apiRateLimiting: true,
    },
    mobileApps: {
      android: "mobile/android (Kotlin Phones & Tablets)",
      ios: "mobile/ios (SwiftUI Universal iPhone & iPad)",
      capacitor: "capacitor.config.ts",
      pwa: "standalone-v2-network-first",
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
