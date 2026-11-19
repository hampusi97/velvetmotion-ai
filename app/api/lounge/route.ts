import { NextResponse } from "next/server";
import { checkContentSafety, checkRateLimit, sanitizeUserText } from "@/lib/safety";

export const dynamic = "force-dynamic";

export interface ServerLoungeMessage {
  id: string;
  roomId: string;
  from: string;
  text: string;
  at: number;
  shareCode?: string;
}

const MAX_ROOM_MESSAGES = 80;

const ROOM_BUFFERS: Record<string, ServerLoungeMessage[]> = {
  public: [
    {
      id: "seed-public-1",
      roomId: "public",
      from: "Maren_VIP",
      text: "Welcome to the VelvetMotion Live Lounge — drop a hi or match with a stranger!",
      at: Date.now() - 180_000,
    },
    {
      id: "seed-public-2",
      roomId: "public",
      from: "VelvetHost",
      text: "Tip: you can share custom companion codes in #share or switch to #nsfw anytime.",
      at: Date.now() - 90_000,
    },
  ],
  nsfw: [
    {
      id: "seed-nsfw-1",
      roomId: "nsfw",
      from: "Sable_AfterDark",
      text: "Late-night 18+ lounge is live. What fantasy scenario or companion are you running tonight?",
      at: Date.now() - 120_000,
    },
  ],
  share: [
    {
      id: "seed-share-1",
      roomId: "share",
      from: "CreatorHub",
      text: "Click 'Share my girl code' above to post your custom companion export code here.",
      at: Date.now() - 150_000,
    },
  ],
};

function sanitizeRoomId(raw: string | null | undefined): string {
  const cleaned = (raw || "public").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || "public";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = sanitizeRoomId(searchParams.get("room"));
  const messages = ROOM_BUFFERS[roomId] || [];

  return NextResponse.json({
    ok: true,
    roomId,
    projectId: "ivory-sunset-mxq1s",
    firestoreDatabaseId: "ai-studio-velvetmotionai-ff7c1796-da62-4f1a-b308-bc8bdc06e9aa",
    messages,
  });
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("api-lounge", req, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Lounge rate limit exceeded. Wait a few seconds." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const body = await req.json();
    const roomId = sanitizeRoomId(body.roomId);
    const from = sanitizeUserText(typeof body.from === "string" ? body.from : "Anon", 60) || "Anon";
    const text = sanitizeUserText(typeof body.text === "string" ? body.text : "", 1000);
    const shareCode =
      typeof body.shareCode === "string" && body.shareCode.trim().length > 0
        ? sanitizeUserText(body.shareCode, 4000)
        : undefined;

    if (!from || !text) {
      return NextResponse.json({ error: "Both 'from' and 'text' are required." }, { status: 400 });
    }
    const safety = checkContentSafety(`${from} ${text}`);
    if (!safety.allowed) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 400 });
    }

    const msg: ServerLoungeMessage = {
      id: `lounge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      from,
      text,
      at: typeof body.at === "number" && Number.isFinite(body.at) ? Math.floor(body.at) : Date.now(),
      ...(shareCode ? { shareCode } : {}),
    };

    const existing = ROOM_BUFFERS[roomId] || [];
    ROOM_BUFFERS[roomId] = [...existing, msg].slice(-MAX_ROOM_MESSAGES);

    return NextResponse.json({
      ok: true,
      roomId,
      message: msg,
      messages: ROOM_BUFFERS[roomId],
    });
  } catch {
    return NextResponse.json({ error: "Invalid lounge message payload" }, { status: 400 });
  }
}
