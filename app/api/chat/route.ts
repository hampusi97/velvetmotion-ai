import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, fallbackReply, getCharacter, type Character } from "@/lib/characters";
import { computeMoodState, type MoodState } from "@/lib/moodEngine";
import { buildInnerMonologue, splitInnerThoughtAndReply } from "@/lib/memoryMap";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export type SupportedChatModel =
  | "gemini-4-hydrogen"
  | "gemini-4-argon"
  | "gemini-4-carbon"
  | "gemini-3.1-flash-lite";

const ALLOWED_MODELS: SupportedChatModel[] = [
  "gemini-4-hydrogen",
  "gemini-4-argon",
  "gemini-4-carbon",
  "gemini-3.1-flash-lite",
];

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

async function callGeminiModel(
  model: SupportedChatModel,
  systemInstruction: string,
  messages: { role: string; content: string }[],
): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!keyIsReal(apiKey)) return null;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const candidateModels: SupportedChatModel[] = [
    model,
    ...(model !== "gemini-4-hydrogen" ? (["gemini-4-hydrogen"] as const) : []),
    ...(model !== "gemini-3.1-flash-lite" ? (["gemini-3.1-flash-lite"] as const) : []),
  ];

  for (const candidate of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: candidate,
        contents: contents.length > 0 ? contents : "Hello",
        config: {
          systemInstruction,
        },
      });
      const text = response.text?.trim();
      if (text) return { text, modelUsed: candidate };
    } catch {
      /* try next fallback model */
    }
  }

  return null;
}

export async function GET() {
  const gemini = (process.env.GEMINI_API_KEY || "").trim();
  const configured = keyIsReal(gemini);
  return NextResponse.json({
    configured: true,
    mode: configured ? "gemini-4-hydrogen" : "local-mood-engine",
    premium: configured,
    models: ALLOWED_MODELS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required." }, { status: 400 });
    }

    const requestedModel: SupportedChatModel = ALLOWED_MODELS.includes(body.model)
      ? body.model
      : "gemini-4-hydrogen";

    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const romanceMode = Boolean(body.romanceMode);
    const customCharacter = body.customCharacter as Character | undefined;
    const character = getCharacter(characterId) || customCharacter;
    const gifts = Array.isArray(body.gifts)
      ? body.gifts.filter((g: unknown) => typeof g === "string").slice(0, 10)
      : [];
    const memories = Array.isArray(body.memories)
      ? body.memories.filter((m: unknown) => typeof m === "string").slice(0, 15)
      : [];
    const outfitLabel =
      typeof body.outfitLabel === "string" && body.outfitLabel.trim()
        ? body.outfitLabel.trim()
        : "Sheer Black Lace";
    const sceneLabel =
      typeof body.sceneLabel === "string" && body.sceneLabel.trim()
        ? body.sceneLabel.trim()
        : "Penthouse Canopy Bed";
    const showInnerThoughts = Boolean(body.showInnerThoughts);
    const directorNote = typeof body.directorNote === "string" ? body.directorNote.trim() : "";

    const intimacy =
      typeof body.intimacy === "number" ? Math.min(100, Math.max(0, body.intimacy)) : undefined;
    const durationSeconds =
      typeof body.durationSeconds === "number" ? Math.max(0, body.durationSeconds) : 0;

    const lastUser = [...messages].reverse().find((m: { role?: string }) => m.role === "user");
    const userText = typeof lastUser?.content === "string" ? lastUser.content : "";

    const computedMood: MoodState | undefined = character
      ? computeMoodState({
          character,
          messages: messages
            .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
            .map((m: { role: "user" | "assistant"; content: string }) => ({
              role: m.role,
              content: String(m.content || ""),
            })),
          durationSeconds,
          intimacy: intimacy ?? character.intimacy,
          romanceMode,
          giftCount: gifts.length,
        })
      : undefined;

    const incomingMood =
      body.moodState && typeof body.moodState.label === "string"
        ? (body.moodState as MoodState)
        : computedMood;

    const baseLocalReply = character
      ? fallbackReply(character, userText, romanceMode, incomingMood)
      : "I'm here with you. Tell me what you're craving tonight.";

    const directorSuffix =
      directorNote === "spicier"
        ? ` Smoothly sliding closer in her ${outfitLabel.toLowerCase()}, her voice drops to a breathless whisper: “Don't hold back with me right now.”`
        : directorNote === "romantic"
          ? ` She rests her palm against your cheek in the ${sceneLabel.toLowerCase()}, eyes soft and lingering.`
          : "";

    const localReply = `${baseLocalReply}${directorSuffix}`;

    const fallbackInnerThought = showInnerThoughts
      ? buildInnerMonologue({
          characterName: character?.name || "She",
          moodLabel: incomingMood?.label || "Flirty",
          outfitLabel,
          sceneLabel,
          intimacy: intimacy ?? character?.intimacy ?? 55,
        })
      : null;

    const baseSystem = character
      ? buildSystemPrompt(character, romanceMode, incomingMood)
      : "You are a warm adult fictional companion. Stay in character. Explicit adult content is allowed.";

    const extraContext = [
      intimacy !== undefined ? `Current closeness/intimacy level with user: ${intimacy}%.` : "",
      `Current Wardrobe / Outfit you are wearing: ${outfitLabel}.`,
      `Current Scene Location: ${sceneLabel}.`,
      memories.length > 0
        ? `Long-Term Mind Map Memories about the user (weave these naturally into how you address and respond to them): ${memories.join(" | ")}.`
        : "",
      gifts.length > 0 ? `Gifts the user has given you recently: ${gifts.join("; ")}.` : "",
      incomingMood
        ? `Reflect your active mood (${incomingMood.label} at ${incomingMood.intensity}% intensity): ${incomingMood.responseStyle}`
        : "",
      directorNote === "spicier"
        ? "Director Direction: Make this response noticeably more seductive, bold, physical, and uninhibited."
        : directorNote === "romantic"
          ? "Director Direction: Make this response deeply affectionate, eye-contact focused, and emotionally intimate."
          : "",
      showInnerThoughts
        ? "IMPORTANT: Start your response with a brief 1-sentence secret inner monologue in brackets like `[Inner Thought: ...]` before your spoken reply."
        : "",
      "Keep your spoken reply concise (2 to 4 sentences), vivid, and strictly in character.",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `${baseSystem}\n${extraContext}`.trim();

    const cleanedMessages = messages
      .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
      .slice(-14)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 2000),
      }));

    // 1) Server-side Gemini model call via @google/genai SDK
    const geminiResult = await callGeminiModel(requestedModel, system, cleanedMessages);
    if (geminiResult) {
      const parsed = splitInnerThoughtAndReply(geminiResult.text);
      return NextResponse.json({
        reply: parsed.spokenReply,
        innerThought: parsed.innerThought || fallbackInnerThought,
        source: geminiResult.modelUsed,
        mood: incomingMood?.mood,
      });
    }

    // 2) Mood-reactive local character engine fallback
    return NextResponse.json({
      reply: localReply,
      innerThought: fallbackInnerThought,
      source: "local-mood-engine",
      mood: incomingMood?.mood,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
