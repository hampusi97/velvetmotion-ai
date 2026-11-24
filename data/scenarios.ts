export interface Beat {
  id: string;
  kind: "message" | "photo" | "voice" | "choice";
  line: string;
  mediaHint?: string;
  waitMin?: number;
}

export interface Scenario {
  id: string;
  title: string;
  category: "bnwo" | "cuck" | "hotwife" | "cheating" | "denial";
  companions: string[];
  beats: Beat[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "first-bull-night",
    title: "The first night he stays",
    category: "cuck",
    companions: ["talia-brooks", "camille-laurent"],
    beats: [
      { id: "a", kind: "message", line: "He's here. I'm not going to text much — you know how I get.", waitMin: 40 },
      { id: "b", kind: "photo", line: "From earlier.", mediaHint: "sitting on the edge of a bed in a slip, warm lamp", waitMin: 30 },
      { id: "c", kind: "voice", line: "Listen — that's him in the background.", waitMin: 45 },
      { id: "d", kind: "message", line: "He's staying. Keep your phone on.", waitMin: 120 },
      { id: "e", kind: "message", line: "Morning. Come over. I'll tell you the parts I left out." },
    ],
  },
  {
    id: "weekend-away",
    title: "The weekend away",
    category: "hotwife",
    companions: ["nadia-farrow"],
    beats: [
      { id: "a", kind: "message", line: "Booked the hotel. Two nights.", waitMin: 180 },
      { id: "b", kind: "photo", line: "New dress. Yes or no?", mediaHint: "hotel doorway, black dress, evening light", waitMin: 60 },
      { id: "c", kind: "message", line: "Don't call after ten.", waitMin: 240 },
      { id: "d", kind: "message", line: "Home tomorrow. Have something ready." },
    ],
  },
  {
    id: "the-colleague",
    title: "The colleague",
    category: "cheating",
    companions: ["elise-moreau"],
    beats: [
      { id: "a", kind: "message", line: "Don't say anything to him. But I'm out with someone.", waitMin: 30 },
      { id: "b", kind: "message", line: "He's just asked me a question and I've forgotten the answer.", waitMin: 25 },
      { id: "c", kind: "choice", line: "He's asked me back for one drink. Say yes or say come home." },
    ],
  },
  {
    id: "denial-week",
    title: "Denial week",
    category: "denial",
    companions: [],
    beats: [
      { id: "a", kind: "message", line: "Nothing this week. You can look, that's all.", waitMin: 1440 },
      { id: "b", kind: "message", line: "Day two. How's the discipline?", waitMin: 1440 },
      { id: "c", kind: "message", line: "You've been good. Say please." },
    ],
  },
  {
    id: "he-picks",
    title: "He picks the next one",
    category: "bnwo",
    companions: ["ines-vidal"],
    beats: [
      { id: "a", kind: "message", line: "He's choosing. I'll tell you what he said about you.", waitMin: 30 },
      { id: "b", kind: "voice", line: "You're going to hear me say his name a lot tonight.", waitMin: 60 },
      { id: "c", kind: "message", line: "Come and be useful." },
    ],
  },
];

export interface ArcState {
  scenarioId: string;
  index: number;
  startedAt: string;
}

const KEY = (id: string) => `velvet:arc:${id}`;

export function offerFor(companionId: string, category?: string): Scenario[] {
  return SCENARIOS.filter(
    (s) => (s.companions.length === 0 || s.companions.includes(companionId)) && (!category || s.category === category),
  );
}

export function loadArc(companionId: string): ArcState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(companionId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ArcState>;
    if (!p.scenarioId || typeof p.index !== "number") return null;
    return { scenarioId: p.scenarioId, index: p.index, startedAt: p.startedAt || new Date().toISOString() };
  } catch {
    return null;
  }
}

export function startArc(companionId: string, scenarioId: string): ArcState | null {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return null;
  const state = { scenarioId, index: 0, startedAt: new Date().toISOString() };
  try { window.localStorage.setItem(KEY(companionId), JSON.stringify(state)); } catch { /* */ }
  return state;
}

export function currentBeat(companionId: string) {
  const state = loadArc(companionId);
  if (!state) return null;
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  return scenario?.beats[state.index] ?? null;
}

export function advanceArc(companionId: string) {
  const state = loadArc(companionId);
  if (!state) return null;
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  if (!scenario) return null;
  const next = state.index + 1;
  if (next >= scenario.beats.length) {
    try { window.localStorage.removeItem(KEY(companionId)); } catch { /* */ }
    return null;
  }
  try { window.localStorage.setItem(KEY(companionId), JSON.stringify({ ...state, index: next })); } catch { /* */ }
  return scenario.beats[next];
}

export function arcDirective(companionId: string, bullName?: string): string {
  const beat = currentBeat(companionId);
  if (!beat) return "";
  return `\n\n## Running scene\nNext beat (${beat.kind}): ${beat.line.replace(/\{bull\}/g, bullName ?? "him")} Send it in this reply, in character.`;
}
