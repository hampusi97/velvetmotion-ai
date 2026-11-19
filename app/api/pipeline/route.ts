import { NextResponse } from "next/server";
import { executeCompanionPipeline, type PipelineTurnInput } from "@/lib/pipeline";
import { SCENE_LIBRARY } from "@/lib/consistentPrompts";
import { SEQUENCE_LABELS } from "@/lib/videoModes";
import { checkContentSafety, checkRateLimit, sanitizeUserText } from "@/lib/safety";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "velvetmotion-unified-pipeline",
    stages: [
      "memory-and-mood",
      "dialogue-and-monologue",
      "scene-selfie",
      "motion-sequence",
      "relationship-progression",
    ],
    scenes: SCENE_LIBRARY.map((s) => ({ id: s.id, label: s.label, moodHint: s.moodHint })),
    sequences: SEQUENCE_LABELS,
  });
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("api-pipeline", req, 40, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const body = (await req.json()) as Partial<PipelineTurnInput>;
    const userMessage = sanitizeUserText(typeof body.userMessage === "string" ? body.userMessage : "", 2000);
    if (!userMessage) {
      return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
    }
    const safety = checkContentSafety(userMessage);
    if (!safety.allowed) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 400 });
    }
    const result = executeCompanionPipeline({
      characterId: typeof body.characterId === "string" ? body.characterId : "maren",
      customCharacter: body.customCharacter,
      userMessage,
      history: Array.isArray(body.history) ? body.history : [],
      existingMemories: Array.isArray(body.existingMemories) ? body.existingMemories : [],
      intimacy: typeof body.intimacy === "number" ? body.intimacy : undefined,
      romanceMode: Boolean(body.romanceMode),
      sceneId: typeof body.sceneId === "string" ? body.sceneId : undefined,
      outfitLabel: typeof body.outfitLabel === "string" ? body.outfitLabel : undefined,
      includeSelfie: Boolean(body.includeSelfie),
      sequenceKind: body.sequenceKind,
      includeAftercare: Boolean(body.includeAftercare),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid pipeline request" }, { status: 400 });
  }
}
