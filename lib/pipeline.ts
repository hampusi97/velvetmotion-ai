/**
 * VelvetMotion Multi-Stage Companion Pipeline Orchestrator
 *
 * Connects:
 *  Stage 1 -> Memory Extraction & Mood Engine (`lib/memoryMap.ts`, `lib/moodEngine.ts`)
 *  Stage 2 -> Companion Dialogue & Inner Monologue (`lib/characters.ts`, `lib/memoryMap.ts`)
 *  Stage 3 -> Face-Consistent Scene Selfie & 4-Frame Motion Sequence (`lib/consistentPrompts.ts`, `lib/media.ts`, `lib/videoModes.ts`)
 *  Stage 4 -> Relationship Stage & Aftercare / Delayed Lingerie Drop (`lib/relationship.ts`, `lib/chatExtras.ts`)
 */

import { CHARACTERS, buildSystemPrompt, fallbackReply, getCharacter, type Character } from "./characters";
import { computeMoodState, type MoodState } from "./moodEngine";
import {
  buildInnerMonologue,
  extractMemoriesFromMessage,
  type MemoryNode,
} from "./memoryMap";
import { SCENE_LIBRARY } from "./consistentPrompts";
import { parseSceneRequest } from "./sceneRequest";
import { characterMediaUrl, type MediaMood } from "./media";
import { buildSequence, type SequenceKind } from "./videoModes";
import { stageFromIntimacy, nextStage } from "./relationship";
import { aftercareMessage } from "./chatExtras";

export interface PipelineTurnInput {
  characterId: string;
  customCharacter?: Character;
  userMessage: string;
  history?: { role: "user" | "assistant"; content: string }[];
  existingMemories?: MemoryNode[];
  intimacy?: number;
  romanceMode?: boolean;
  sceneId?: string;
  outfitLabel?: string;
  includeSelfie?: boolean;
  sequenceKind?: SequenceKind;
  includeAftercare?: boolean;
}

export interface PipelineTurnOutput {
  ok: boolean;
  character: Pick<Character, "id" | "name" | "category" | "age">;
  stages: string[];
  mood: MoodState;
  relationship: {
    intimacy: number;
    currentStage: string;
    nextStage: string | null;
  };
  memories: MemoryNode[];
  systemPrompt: string;
  reply: string;
  innerThought: string;
  sceneSelfie?: {
    sceneId: string;
    label: string;
    mood: MediaMood;
    url: string;
  };
  sequence?: {
    kind: SequenceKind;
    frames: string[];
  };
  aftercare?: string;
}

export function executeCompanionPipeline(input: PipelineTurnInput): PipelineTurnOutput {
  const character =
    getCharacter(input.characterId) || input.customCharacter || CHARACTERS[0];
  const intimacy = Math.min(100, Math.max(0, input.intimacy ?? character.intimacy));
  const romanceMode = Boolean(input.romanceMode);
  const history = [
    ...(input.history || []),
    { role: "user" as const, content: input.userMessage },
  ];

  const stages: string[] = [];

  // Stage 1: Memory Extraction & Mood Engine
  const memories = extractMemoriesFromMessage(
    input.userMessage,
    input.existingMemories || [],
  );
  const mood = computeMoodState({
    character,
    messages: history,
    durationSeconds: history.length * 25,
    intimacy,
    romanceMode,
  });
  stages.push("memory-and-mood");

  // Stage 2: Scene & System Prompt + Dialogue + Inner Monologue
  const matchedScene =
    SCENE_LIBRARY.find((s) => s.id === input.sceneId) || SCENE_LIBRARY[0];
  const outfitLabel = input.outfitLabel || "Sheer Black Lace";
  const systemPrompt = buildSystemPrompt(
    character,
    romanceMode,
    mood,
    memories.map((m) => m.text).join(" | "),
  );
  const reply = fallbackReply(character, input.userMessage, romanceMode, mood);
  const innerThought = buildInnerMonologue({
    characterName: character.name,
    moodLabel: mood.label,
    outfitLabel,
    sceneLabel: matchedScene.label,
    intimacy,
  });
  stages.push("dialogue-and-monologue");

  // Stage 3: Face-Consistent Scene Selfie & Motion Sequence
  const autoSceneReq = parseSceneRequest(input.userMessage);
  let sceneSelfie: PipelineTurnOutput["sceneSelfie"];
  if (input.includeSelfie || input.sceneId || autoSceneReq) {
    const selfieMood =
      autoSceneReq?.mood ||
      (matchedScene.moodHint as MediaMood) ||
      mood.portraitMood ||
      "lingerie";
    const extraScene = autoSceneReq ? autoSceneReq.extra : matchedScene.scene;
    sceneSelfie = {
      sceneId: input.sceneId || (autoSceneReq ? `auto-${autoSceneReq.mood}` : matchedScene.id),
      label: autoSceneReq ? autoSceneReq.label : matchedScene.label,
      mood: selfieMood,
      url: characterMediaUrl(character, selfieMood, extraScene),
    };
    stages.push("scene-selfie");
  }

  let sequence: PipelineTurnOutput["sequence"];
  if (input.sequenceKind) {
    sequence = {
      kind: input.sequenceKind,
      frames: buildSequence(character, input.sequenceKind),
    };
    stages.push("motion-sequence");
  }

  // Stage 4: Relationship Stage & Optional Aftercare
  const nextIntimacy = Math.min(100, intimacy + 3);
  const stage = stageFromIntimacy(nextIntimacy);
  const upcoming = nextStage(nextIntimacy);
  const aftercare = input.includeAftercare ? aftercareMessage(character).content : undefined;
  stages.push("relationship-progression");

  return {
    ok: true,
    character: {
      id: character.id,
      name: character.name,
      category: character.category,
      age: character.age,
    },
    stages,
    mood,
    relationship: {
      intimacy: nextIntimacy,
      currentStage: stage.label,
      nextStage: upcoming ? upcoming.label : null,
    },
    memories,
    systemPrompt,
    reply,
    innerThought,
    sceneSelfie,
    sequence,
    aftercare,
  };
}
