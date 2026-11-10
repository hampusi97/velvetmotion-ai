import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Messages are required." }, { status: 400 });
    }
    return NextResponse.json({ error: "Live AI is not connected. The chat uses local character replies." }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
