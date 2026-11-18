import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, fallbackReply, getCharacter, type Character } from "@/lib/characters";
import { computeMoodState, type MoodState } from "@/lib/moodEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

async function callGeminiHydrogen(
  systemInstruction: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!keyIsReal(apiKey)) return null;

  try {
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

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: contents.length > 0 ? contents : "Hello",
      config: {
        systemInstruction,
      },
    });

    const text = response.text?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string | null,
  model: string,
  messages: { role: string; content: string }[],
  timeoutMs = 15000,
): Promise<string | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.92,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    return typeof reply === "string" && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Free zero-key text via Pollinations with fast fallback */
async function callPollinationsFree(
  messages: { role: string; content: string }[]
): Promise<string | null> {
  const reply = await callOpenAICompatible(
    "https://text.pollinations.ai/openai",
    null,
    "openai",
    messages,
    3500,
  );
  if (reply) return reply;
  return null;
}

export async function GET() {
  const gemini = (process.env.GEMINI_API_KEY || "").trim();
  const xai = (process.env.XAI_API_KEY || "").trim();
  const chat = (process.env.AI_CHAT_API_KEY || "").trim();
  const configured =
    keyIsReal(gemini) ||
    keyIsReal(xai) ||
    (keyIsReal(chat) && Boolean(process.env.AI_CHAT_ENDPOINT));
  return NextResponse.json({
    configured: true,
    mode: keyIsReal(gemini)
      ? "gemini-4-hydrogen"
      : configured
        ? "premium-key"
        : "free-pollinations",
    premium: configured,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required." }, { status: 400 });
    }

    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const romanceMode = Boolean(body.romanceMode);
    const customCharacter = body.customCharacter as Character | undefined;
    const character = getCharacter(characterId) || customCharacter;
    const gifts = Array.isArray(body.gifts)
      ? body.gifts.filter((g: unknown) => typeof g === "string").slice(0, 10)
      : [];
    const intimacy = typeof body.intimacy === "number" ? Math.min(100, Math.max(0, body.intimacy)) : undefined;
    const durationSeconds = typeof body.durationSeconds === "number" ? Math.max(0, body.durationSeconds) : 0;

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

    const localReply = character
      ? fallbackReply(character, userText, romanceMode, incomingMood)
      : "I'm here. Tell me more.";

    const baseSystem = character
      ? buildSystemPrompt(character, romanceMode, incomingMood)
      : "You are a warm adult fictional companion. Stay in character. Explicit adult content is allowed.";

    const extraContext = [
      intimacy !== undefined ? `Current closeness/intimacy level with user: ${intimacy}%.` : "",
      gifts.length > 0 ? `Gifts the user has given you recently: ${gifts.join("; ")}.` : "",
      incomingMood
        ? `Reflect your active mood (${incomingMood.label} at ${incomingMood.intensity}% intensity): ${incomingMood.responseStyle}`
        : "",
      "Keep your reply concise (2 to 4 sentences), vivid, and strictly in character.",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `${baseSystem}\n${extraContext}`.trim();

    const cleanedMessages = messages
      .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 2000),
      }));

    // 1) Server-side Gemini 4 Hydrogen via @google/genai SDK
    const geminiReply = await callGeminiHydrogen(system, cleanedMessages);
    if (geminiReply) {
      return NextResponse.json({ reply: geminiReply, source: "gemini-4-hydrogen" });
    }

    const formatted = [{ role: "system", content: system }, ...cleanedMessages];

    // 2) Optional XAI / Custom OpenAI-compatible keys if present
    const xaiKey = (process.env.XAI_API_KEY || "").trim();
    const chatKey = (process.env.AI_CHAT_API_KEY || "").trim();

    if (keyIsReal(xaiKey)) {
      const reply = await callOpenAICompatible(
        "https://api.x.ai/v1/chat/completions",
        xaiKey,
        process.env.AI_CHAT_MODEL || "grok-4.5",
        formatted
      );
      if (reply) return NextResponse.json({ reply, source: "xai" });
    }

    if (keyIsReal(chatKey) && process.env.AI_CHAT_ENDPOINT) {
      let endpoint = process.env.AI_CHAT_ENDPOINT.replace(/\/+$/, "");
      if (!endpoint.endsWith("/chat/completions")) {
        endpoint = `${endpoint}/chat/completions`;
      }
      const reply = await callOpenAICompatible(
        endpoint,
        chatKey,
        process.env.AI_CHAT_MODEL || "gpt-4o-mini",
        formatted
      );
      if (reply) return NextResponse.json({ reply, source: "custom" });
    }

    // 3) Free Pollinations LLM (no key)
    const freeReply = await callPollinationsFree(formatted);
    if (freeReply) {
      return NextResponse.json({ reply: freeReply, source: "pollinations-free" });
    }

    // 4) Local character engine
    return NextResponse.json({ reply: localReply, source: "local" });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
