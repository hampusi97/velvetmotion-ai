import { NextResponse } from "next/server";
import { buildSystemPrompt, fallbackReply, getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function keyIsReal(key: string) {
  return key.length > 20 && !/dummy|your_|changeme|placeholder/i.test(key);
}

export async function GET() {
  const xai = (process.env.XAI_API_KEY || "").trim();
  const chat = (process.env.AI_CHAT_API_KEY || "").trim();
  const configured =
    keyIsReal(xai) || (keyIsReal(chat) && Boolean(process.env.AI_CHAT_ENDPOINT));
  return NextResponse.json({ configured, mode: configured ? "external-ai" : "local" });
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
    const userText =
      typeof lastUser?.content === "string" ? lastUser.content : "";

    // Local fallback always available
    const localReply = character
      ? fallbackReply(character, userText, romanceMode)
      : "I'm here. Tell me more.";

    const xaiKey = (process.env.XAI_API_KEY || "").trim();
    const chatKey = (process.env.AI_CHAT_API_KEY || "").trim();
    let endpoint = "";
    let apiKey = "";
    let model = process.env.AI_CHAT_MODEL || "";

    if (keyIsReal(xaiKey)) {
      endpoint = "https://api.x.ai/v1/chat/completions";
      apiKey = xaiKey;
      model = model || "grok-4.5";
    } else if (keyIsReal(chatKey) && process.env.AI_CHAT_ENDPOINT) {
      endpoint = process.env.AI_CHAT_ENDPOINT.replace(/\/+$/, "");
      if (!endpoint.endsWith("/chat/completions")) {
        endpoint = `${endpoint}/chat/completions`;
      }
      apiKey = chatKey;
      model = model || "gpt-4o-mini";
    }

    if (endpoint && apiKey && character) {
      try {
        const system = buildSystemPrompt(character, romanceMode);
        const formatted = [
          { role: "system", content: system },
          ...messages
            .filter((m: { role?: string; content?: string }) => m.role === "user" || m.role === "assistant")
            .slice(-12)
            .map((m: { role: string; content: string }) => ({
              role: m.role,
              content: String(m.content || "").slice(0, 2000),
            })),
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const aiRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: formatted,
            temperature: 0.9,
            max_tokens: 400,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (aiRes.ok) {
          const data = await aiRes.json();
          const reply = data.choices?.[0]?.message?.content;
          if (typeof reply === "string" && reply.trim()) {
            return NextResponse.json({ reply: reply.trim(), source: "external-ai" });
          }
        }
      } catch {
        // fall through to local
      }
    }

    return NextResponse.json({ reply: localReply, source: "local" });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
