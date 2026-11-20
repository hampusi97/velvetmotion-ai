import { assertCompliance } from "./complianceFilter";
import type { JoiPhase, JoiScenario } from "./content/types";

const SESSION_PHASES: { phase: JoiPhase; title: string; weight: number }[] = [
  { phase: "warm-up", title: "Warm-up", weight: 1 },
  { phase: "build", title: "Build", weight: 2 },
  { phase: "finish", title: "Wind-down", weight: 1 },
];

export function buildGuidedSession(
  raw: string,
  persona: JoiScenario["persona"],
  tone: string,
  minutes: 2 | 4 | 6,
): JoiScenario {
  const text = raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, "");
  let lines: unknown;
  try {
    lines = JSON.parse(text);
  } catch {
    throw new Error("The model returned an unreadable draft. Try generating it again.");
  }
  if (!Array.isArray(lines) || lines.length !== SESSION_PHASES.length ||
      lines.some((line) => typeof line !== "string" || !line.trim() || line.length > 400)) {
    throw new Error("The model did not return three usable cues. Try generating it again.");
  }
  const cues = lines as string[];
  for (const cue of cues) {
    const check = assertCompliance(cue);
    if (!check.ok) throw new Error(check.reason);
  }
  return {
    id: "generated-session",
    label: `A session with ${persona.name}`,
    persona,
    tone,
    summary: `${minutes}-minute generated session`,
    accent: "rose",
    steps: SESSION_PHASES.map(({ phase, title, weight }, index) => ({
      id: phase,
      phase,
      title,
      instruction: cues[index].trim(),
      suggestedSeconds: (minutes * 60 * weight) / 4,
    })),
  };
}
