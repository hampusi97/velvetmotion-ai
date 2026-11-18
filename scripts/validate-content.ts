import { JOI_PRESETS, STORY_PACKS } from "../lib/content";
import type { JoiPhase, StoryPack } from "../lib/content/types";

const openings: Record<string, string> = {
  office:
    "Photo from the office bathroom stall.\n\nHer makeup slightly ruined, thick cock inside her.\n\nCaption: “Boss is busy. Keep stroking under your desk.”",
  locked:
    "Day 19 locked.\n\nYou can hear her getting fucked through the wall.\n\nShe left the key on the table… just far enough that you can’t reach it while you’re stroking.",
  group:
    "Three of them.\n\nShe’s in the middle of the bed getting used from both ends while the third records.\n\nYou’re on the chair in the corner.\n\n“Stroke slow. You’re not allowed to cum until they finish with me.”",
  "reject-revenge":
    "She rejected you on Tinder.\n\nNow she’s on her knees, looking up at you with that same face from the screenshot.\n\n“I was stupid to swipe left… use me however you want.”\n\nWhat do you make her do?",
};

const descs: Record<string, string> = {
  office: "She fucks her boss and sends proof",
  locked: "Locked while she gets used",
  group: "Multiple men, you only watch",
  "reject-revenge": "The girl who rejected you now begs for it",
};

const classicOpening = "Get your cock out.\n\nSlow strokes only. I control everything.";
const joiOpenings: Record<string, string> = {
  classic: classicOpening,
  sph: "Look at that little thing.\n\nStroke it slowly.",
  cei: classicOpening,
  ruin: classicOpening,
  edge: classicOpening,
  cuck: "He’s already inside me.\n\nStroke while you listen to every wet sound.",
  findom: classicOpening,
  voice:
    "*soft, slow, spoken*\n\nMmm… that’s it… stroke it nice and slow for me.\n\nI want you listening to my voice while you touch that little thing.",
};

const banned: RegExp[] = [
  /\bbnwo\b/i,
  /\bbbc\b/i,
  /\bwhiteboy\b/i,
  /\bblacked\b/i,
  /black cock/i,
  /\bincest\b/i,
  /\bunderage\b/i,
  /\bteen(?:ager|age)?\b/i,
  /\bschoolgirl\b/i,
  /\bloli\b/i,
  /\bchild(?:ren)?\b/i,
  /\bminors?\b/i,
  /\byour brother\b/i,
  /\byour dad\b/i,
  /\byour sister\b/i,
  /\byour mom\b/i,
  /\bdaddy\b/i,
  /\brape\b/i,
  /\bbestiality\b/i,
];

function fail(message: string): never {
  throw new Error(message);
}

function walkText(label: string, text: string) {
  for (const pattern of banned) {
    if (pattern.test(text)) fail(`${label} matched ${pattern}`);
  }
}

function assertReachable(pack: StoryPack) {
  const byId = new Map(pack.scenes.map((scene) => [scene.id, scene]));
  const seen = new Set<string>();
  const stack = [pack.scenes[0]?.id];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const scene = byId.get(id);
    if (!scene) fail(`${pack.id} points at missing scene ${id}`);
    seen.add(id);
    if (scene.nextSceneId && scene.choices && scene.choices.length > 0) {
      fail(`${pack.id}/${scene.id} has both a linear next and choices`);
    }
    if (scene.nextSceneId) stack.push(scene.nextSceneId);
    for (const choice of scene.choices ?? []) stack.push(choice.nextSceneId);
  }
  for (const scene of pack.scenes) {
    if (!seen.has(scene.id)) fail(`${pack.id} scene ${scene.id} is unreachable`);
  }
}

const packIds = new Set<string>();
for (const pack of STORY_PACKS) {
  if (packIds.has(pack.id)) fail(`duplicate pack ${pack.id}`);
  packIds.add(pack.id);
  if (!pack.title || !pack.tag || !pack.desc || !pack.summary) fail(`missing fields ${pack.id}`);
  if (pack.character.age < 18) fail(`${pack.id} character under 18`);
  if (pack.scenes.length < 5) fail(`${pack.id} needs more scenes`);
  if (!pack.scenes.some((scene) => (scene.choices?.length ?? 0) > 0)) {
    fail(`${pack.id} has no branch`);
  }
  const listed = pack.chapters.flatMap((chapter) => chapter.sceneIds);
  if (new Set(listed).size !== listed.length) fail(`${pack.id} repeats a scene in chapters`);
  if (listed.length !== pack.scenes.length) fail(`${pack.id} chapters do not cover scenes`);
  for (const id of listed) {
    if (!pack.scenes.some((scene) => scene.id === id)) fail(`${pack.id} chapter missing ${id}`);
  }
  walkText(pack.id, `${pack.title}\n${pack.desc}\n${pack.summary}\n${pack.character.summary}`);
  for (const scene of pack.scenes) {
    if (!scene.text.trim()) fail(`${pack.id}/${scene.id} empty`);
    walkText(`${pack.id}/${scene.id}`, `${scene.title}\n${scene.text}`);
  }
  assertReachable(pack);
  if (openings[pack.id] && !pack.scenes[0]?.text.startsWith(openings[pack.id])) {
    fail(`${pack.id} dropped its original opening`);
  }
  if (descs[pack.id] && pack.desc !== descs[pack.id]) fail(`${pack.id} changed its original desc`);
}

for (const id of Object.keys(openings)) {
  if (!packIds.has(id)) fail(`missing historical pack ${id}`);
}

const phaseOrder: Record<JoiPhase, number> = {
  "warm-up": 0,
  build: 1,
  edge: 2,
  finish: 3,
};

const joiIds = new Set<string>();
for (const scenario of JOI_PRESETS) {
  if (joiIds.has(scenario.id)) fail(`duplicate joi ${scenario.id}`);
  joiIds.add(scenario.id);
  if (!scenario.label || !scenario.summary) fail(`missing joi fields ${scenario.id}`);
  if (scenario.persona.age < 18) fail(`${scenario.id} persona under 18`);
  if (scenario.steps.length < 8) fail(`${scenario.id} needs more steps`);
  const seenPhases = new Set<JoiPhase>();
  let previous = -1;
  const stepIds = new Set<string>();
  for (const step of scenario.steps) {
    if (stepIds.has(step.id)) fail(`${scenario.id} duplicate step ${step.id}`);
    stepIds.add(step.id);
    if (!step.instruction.trim()) fail(`${scenario.id}/${step.id} empty`);
    if (step.suggestedSeconds < 15) fail(`${scenario.id}/${step.id} timer too short`);
    const order = phaseOrder[step.phase];
    if (order < previous) fail(`${scenario.id} phases out of order`);
    previous = order;
    seenPhases.add(step.phase);
    walkText(`${scenario.id}/${step.id}`, step.instruction);
  }
  for (const phase of Object.keys(phaseOrder) as JoiPhase[]) {
    if (!seenPhases.has(phase)) fail(`${scenario.id} missing phase ${phase}`);
  }
  walkText(scenario.id, `${scenario.label}\n${scenario.summary}\n${scenario.persona.summary}`);
  const opening = joiOpenings[scenario.id];
  if (opening && !scenario.steps[0]?.instruction.startsWith(opening)) {
    fail(`${scenario.id} dropped its original opening`);
  }
}

for (const id of Object.keys(joiOpenings)) {
  if (!joiIds.has(id)) fail(`missing historical joi ${id}`);
}

if (STORY_PACKS.length < 10) fail("expected at least 10 story packs");
if (JOI_PRESETS.length < 14) fail("expected at least 14 JOI scenarios");

console.log(
  `ok: ${STORY_PACKS.length} story packs, ${JOI_PRESETS.length} JOI scenarios`,
);
