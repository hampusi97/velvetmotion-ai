import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { generateReply, MAX_MESSAGE_LENGTH } from "@/lib/dialogue.mjs";

export async function POST(request: NextRequest) {
  let body: { characterId?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const characterId = typeof body.characterId === "string" ? body.characterId : "";
  const character = getCharacter(characterId);
  if (!character) {
    return NextResponse.json({ error: "Unknown character" }, { status: 404 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const message of incoming) {
    if (!message || typeof message !== "object") continue;
    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) continue;
    messages.push({ role, content: trimmed });
  }

  return NextResponse.json(generateReply(character, messages));
}
