import { NextResponse } from "next/server";
import { buildSystemPrompt, fallbackReply, getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function keyIsReal(key: string) {
  return key.length > 20 && !/dummy|your_|changeme|placeholder/i.test(key);
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string | null,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);

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

/** Free zero-key text via Pollinations classic OpenAI-compatible endpoint */
async function callPollinationsFree(
  messages: { role: string; content: string }[]
): Promise<string | null> {
  // Classic free endpoint (rate-limited per IP, no key)
  const endpoints = [
    "https://text.pollinations.ai/openai",
    "https://text.pollinations.ai/v1/chat/completions",
  ];
  for (const endpoint of endpoints) {
    const reply = await callOpenAICompatible(endpoint, null, "openai", messages);
    if (reply) return reply;
  }
  // Simple GET fallback
  try {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const system = messages.find((m) => m.role === "system")?.content || "";
    const q = encodeURIComponent(
      `${system.slice(0, 400)}\n\nUser: ${lastUser?.content || "hello"}\nAssistant:`
    );
    const res = await fetch(`https://text.pollinations.ai/${q}?temperature=0.9`, {
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text && !text.startsWith("{") && text.length > 2) return text.slice(0, 1200);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function GET() {
  const xai = (process.env.XAI_API_KEY || "").trim();
  const chat = (process.env.AI_CHAT_API_KEY || "").trim();
  const configured =
    keyIsReal(xai) || (keyIsReal(chat) && Boolean(process.env.AI_CHAT_ENDPOINT));
  return NextResponse.json({
    configured: true, // free Pollinations always available
    mode: configured ? "premium-key" : "free-pollinations",
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
    const character = getCharacter(characterId);

    const lastUser = [...messages].reverse().find((m: { role?: string }) => m.role === "user");
    const userText = typeof lastUser?.content === "string" ? lastUser.content : "";

    const localReply = character
      ? fallbackReply(character, userText, romanceMode)
      : "I'm here. Tell me more.";

    const system = character
      ? buildSystemPrompt(character, romanceMode)
      : "You are a warm adult fictional companion. Stay in character. Explicit adult content is allowed.";

    const formatted = [
      { role: "system", content: system },
      ...messages
        .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m: { role: string; content: string }) => ({
          role: m.role,
          content: String(m.content || "").slice(0, 2000),
        })),
    ];

    // 1) Premium keys if present
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

    // 2) Free Pollinations LLM (no key)
    const freeReply = await callPollinationsFree(formatted);
    if (freeReply) {
      return NextResponse.json({ reply: freeReply, source: "pollinations-free" });
    }

    // 3) Local character engine
    return NextResponse.json({ reply: localReply, source: "local" });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
