import { NextResponse } from "next/server";
import {
  INITIAL_SUGGESTIONS,
  type FeatureSuggestion,
  type SuggestionCategory,
} from "@/lib/suggestions";
import { checkContentSafety, checkRateLimit, sanitizeUserText } from "@/lib/safety";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES: SuggestionCategory[] = [
  "Mobile & Tablet",
  "AI & Video",
  "Frontend",
  "Backend",
  "Companions",
];

let suggestionStore: FeatureSuggestion[] = [...INITIAL_SUGGESTIONS];

export async function GET() {
  const sorted = [...suggestionStore].sort((a, b) => b.votes - a.votes);
  return NextResponse.json({
    ok: true,
    count: sorted.length,
    suggestions: sorted,
  });
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("api-suggestions", req, 25, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "submit";

    if (action === "upvote") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const idx = suggestionStore.findIndex((s) => s.id === id);
      if (idx < 0) {
        return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
      }
      suggestionStore[idx] = {
        ...suggestionStore[idx],
        votes: suggestionStore[idx].votes + 1,
      };
      return NextResponse.json({
        ok: true,
        suggestion: suggestionStore[idx],
        suggestions: [...suggestionStore].sort((a, b) => b.votes - a.votes),
      });
    }

    const title = sanitizeUserText(typeof body.title === "string" ? body.title : "", 120);
    const detail = sanitizeUserText(typeof body.detail === "string" ? body.detail : "", 400);
    const author = sanitizeUserText(typeof body.author === "string" ? body.author : "Community", 40) || "Community";
    const category: SuggestionCategory = ALLOWED_CATEGORIES.includes(body.category)
      ? body.category
      : "Frontend";

    if (title.length < 4) {
      return NextResponse.json(
        { error: "Suggestion title must be at least 4 characters." },
        { status: 400 },
      );
    }

    const safety = checkContentSafety(`${title} ${detail} ${author}`);
    if (!safety.allowed) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 400 });
    }

    const created: FeatureSuggestion = {
      id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      detail: detail || "Community feature request submitted live.",
      category,
      status: "Planned",
      votes: 1,
      author,
      createdAt: Date.now(),
    };

    suggestionStore = [created, ...suggestionStore].slice(0, 60);
    return NextResponse.json({
      ok: true,
      suggestion: created,
      suggestions: [...suggestionStore].sort((a, b) => b.votes - a.votes),
    });
  } catch {
    return NextResponse.json({ error: "Invalid suggestion request" }, { status: 400 });
  }
}
