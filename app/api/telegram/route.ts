import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Telegram bridge stub.
 * - POST { action: "send", chatId, text, botToken } to send a message
 * - POST Telegram webhook updates (configure setWebhook to this URL)
 *
 * Bot token should come from client Advanced Settings or env TELEGRAM_BOT_TOKEN.
 * Never log tokens.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Outbound send
    if (body.action === "send") {
      const token = (body.botToken || process.env.TELEGRAM_BOT_TOKEN || "").trim();
      const chatId = body.chatId;
      const text = String(body.text || "").slice(0, 4000);
      if (!token || !chatId || !text) {
        return NextResponse.json({ error: "botToken, chatId, text required" }, { status: 400 });
      }
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: data.ok === true, result: data.result || null });
    }

    // Inbound webhook — acknowledge and return hint for future relay to chat
    if (body.message?.text) {
      const from = body.message.chat?.id;
      const text = body.message.text;
      return NextResponse.json({
        ok: true,
        received: { chatId: from, text: String(text).slice(0, 500) },
        note: "Wire this to your character chat queue to reply as the girl.",
      });
    }

    return NextResponse.json({ ok: true, hint: "Use action:send or Telegram webhook payload" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "telegram-bridge",
    status: "ready",
    usage: "POST { action:'send', botToken, chatId, text } or configure Telegram webhook",
  });
}
