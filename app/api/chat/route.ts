import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, fallbackReply, getCharacter } from "@/lib/characters";

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, characterId, romanceMode } = await req.json();

    if (typeof characterId === "string" && characterId) {
      const character = getCharacter(characterId);
      if (!character) {
        return NextResponse.json({ error: "Unknown character" }, { status: 404 });
      }

      const list = Array.isArray(messages) ? messages : [];
      const lastUser = [...list].reverse().find((message) => message?.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
      const prompt = buildSystemPrompt(character, Boolean(romanceMode));

      // Live model call stays behind the same system prompt. Until a key is
      // configured, reply in the character's own voice from the roster data.
      /*
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: [
            { role: "system", content: prompt },
            ...list,
          ],
          temperature: 0.95,
          max_tokens: 900,
        }),
      });

      const data = await response.json();
      const reply = data.choices[0].message.content;
      */

      const reply = fallbackReply(character, userText, Boolean(romanceMode));
      return NextResponse.json({ reply, systemPrompt: prompt });
    }

    // ======================================================
    // REPLACE THIS WITH YOUR REAL UNCENSORED LLM CALL
    // Examples: xAI Grok, Together AI, Fireworks, OpenRouter, etc.
    // ======================================================

    /*
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.95,
        max_tokens: 900,
      }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;
    */

    void systemPrompt;
    void messages;

    // Temporary placeholder reply
    const reply = `She looks at you with pure amusement mixed with contempt.\n\n“Keep stroking. That’s all you’re good for.”\n\nShe continues describing exactly what’s being done to her while you sit there like the beta you are.`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
