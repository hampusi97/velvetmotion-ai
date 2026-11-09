import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json();

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

    // Temporary placeholder reply
    const reply = `She looks at you with pure amusement mixed with contempt.\n\n“Keep stroking. That’s all you’re good for.”\n\nShe continues describing exactly what’s being done to her while you sit there like the beta you are.`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
