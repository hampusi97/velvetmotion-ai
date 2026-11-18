/**
 * Pure state machine and progression logic for the 3D Velvet Penthouse Suite.
 * Decoupled from Three.js / DOM so it can be unit-tested via node:test.
 */

export type SuitePhase = "title" | "playing" | "paused" | "victory";

export type LightingPresetId = "boudoir" | "candlelight" | "cyber-neon" | "afterglow";

export type HotspotId = "bed" | "champagne" | "companion" | "balcony";

export interface HotspotDefinition {
  id: HotspotId;
  label: string;
  subtitle: string;
  position: [number, number, number];
  intimacyBoost: number;
  dialogue: string;
}

export const SUITE_HOTSPOTS: HotspotDefinition[] = [
  {
    id: "bed",
    label: "Velvet Four-Poster Bed",
    subtitle: "Silk sheets & warm canopy light (+25% closeness)",
    position: [-3.2, 0.9, -2.2],
    intimacyBoost: 25,
    dialogue:
      "She leans back against the tufted velvet headboard and pats the silk sheets beside her. “Come lie down with me… the city can wait.”",
  },
  {
    id: "champagne",
    label: "Champagne & Candlelight Lounge",
    subtitle: "Pour vintage rosé & share a toast (+20% closeness)",
    position: [2.8, 0.8, -1.5],
    intimacyBoost: 20,
    dialogue:
      "Two crystal flutes clink softly in the candlelight. She holds your gaze over the rim of her glass: “To a night with zero inhibitions.”",
  },
  {
    id: "companion",
    label: "Intimate Companion Stage",
    subtitle: "Step closer for a private pose & whisper (+30% closeness)",
    position: [0, 1.3, -0.4],
    intimacyBoost: 30,
    dialogue:
      "She turns slowly under the warm rose spotlight, tracing her fingertips along your jawline. “You have my undivided attention tonight.”",
  },
  {
    id: "balcony",
    label: "Skyline Panorama Window",
    subtitle: "Look out over the midnight neon horizon (+25% closeness)",
    position: [0, 1.6, -5.2],
    intimacyBoost: 25,
    dialogue:
      "Pressed against the floor-to-ceiling glass above the glowing skyline, her breath fogs the window as she whispers in your ear.",
  },
];

export const LIGHTING_PRESETS: Record<
  LightingPresetId,
  {
    id: LightingPresetId;
    name: string;
    fogHex: number;
    keyHex: number;
    fillHex: number;
    groundHex: number;
    exposure: number;
  }
> = {
  boudoir: {
    id: "boudoir",
    name: "Velvet Rose",
    fogHex: 0x0c0512,
    keyHex: 0xff8da8,
    fillHex: 0xd946ef,
    groundHex: 0x16091e,
    exposure: 1.15,
  },
  candlelight: {
    id: "candlelight",
    name: "Golden Candlelight",
    fogHex: 0x120906,
    keyHex: 0xffb36b,
    fillHex: 0xf43f5e,
    groundHex: 0x1f0d09,
    exposure: 1.22,
  },
  "cyber-neon": {
    id: "cyber-neon",
    name: "Midnight Neon",
    fogHex: 0x060716,
    keyHex: 0xf472b6,
    fillHex: 0x38bdf8,
    groundHex: 0x0b0c24,
    exposure: 1.18,
  },
  afterglow: {
    id: "afterglow",
    name: "Crimson Afterglow",
    fogHex: 0x14040a,
    keyHex: 0xfb7185,
    fillHex: 0xa855f7,
    groundHex: 0x1c0611,
    exposure: 1.12,
  },
};

export interface SuiteState {
  phase: SuitePhase;
  companionId: string;
  intimacy: number;
  visitedHotspots: HotspotId[];
  activeHotspot: HotspotId | null;
  lastNarrative: string;
  lighting: LightingPresetId;
  playerPos: { x: number; z: number };
  cameraYaw: number;
  poseIndex: number;
  interactionsCount: number;
}

export function createInitialSuiteState(companionId: string, initialIntimacy = 35): SuiteState {
  return {
    phase: "title",
    companionId,
    intimacy: Math.max(0, Math.min(95, initialIntimacy)),
    visitedHotspots: [],
    activeHotspot: null,
    lastNarrative: "Explore the 3D Penthouse Suite or click any glowing hotspot to draw her closer.",
    lighting: "boudoir",
    playerPos: { x: 0, z: 3.6 },
    cameraYaw: 0,
    poseIndex: 0,
    interactionsCount: 0,
  };
}

export function startSuiteSession(state: SuiteState): SuiteState {
  return {
    ...state,
    phase: "playing",
    lastNarrative:
      "Welcome to the Velvet Penthouse Suite. Walk with WASD/Arrows or click any hotspot to build intimacy.",
  };
}

export function togglePauseSuite(state: SuiteState): SuiteState {
  if (state.phase === "playing") {
    return { ...state, phase: "paused" };
  }
  if (state.phase === "paused") {
    return { ...state, phase: "playing" };
  }
  return state;
}

export function resetSuiteSession(state: SuiteState, initialIntimacy = 35): SuiteState {
  return {
    ...createInitialSuiteState(state.companionId, initialIntimacy),
    phase: "playing",
    lighting: state.lighting,
  };
}

export function cycleLightingPreset(
  state: SuiteState,
  presetId?: LightingPresetId,
): SuiteState {
  const order: LightingPresetId[] = ["boudoir", "candlelight", "cyber-neon", "afterglow"];
  const nextLighting =
    presetId && presetId in LIGHTING_PRESETS
      ? presetId
      : order[(order.indexOf(state.lighting) + 1) % order.length];
  return {
    ...state,
    lighting: nextLighting,
    lastNarrative: `Penthouse lighting shifted to ${LIGHTING_PRESETS[nextLighting].name}.`,
  };
}

export function triggerHotspotInteraction(
  state: SuiteState,
  hotspotId: HotspotId,
): SuiteState {
  if (state.phase !== "playing") return state;
  const hotspot = SUITE_HOTSPOTS.find((h) => h.id === hotspotId);
  if (!hotspot) return state;

  const alreadyVisited = state.visitedHotspots.includes(hotspotId);
  const visitedHotspots = alreadyVisited
    ? state.visitedHotspots
    : [...state.visitedHotspots, hotspotId];

  const boost = alreadyVisited ? Math.ceil(hotspot.intimacyBoost * 0.5) : hotspot.intimacyBoost;
  const nextIntimacy = Math.min(100, state.intimacy + boost);
  const allVisited = visitedHotspots.length === SUITE_HOTSPOTS.length;
  const reachedClimax = nextIntimacy >= 100 && (allVisited || state.interactionsCount >= 2);

  return {
    ...state,
    phase: reachedClimax ? "victory" : "playing",
    intimacy: nextIntimacy,
    visitedHotspots,
    activeHotspot: hotspotId,
    lastNarrative: hotspot.dialogue,
    poseIndex: (state.poseIndex + 1) % 4,
    interactionsCount: state.interactionsCount + 1,
    playerPos: {
      x: hotspot.position[0] * 0.55,
      z: Math.min(4.2, Math.max(-3.6, hotspot.position[2] + 1.9)),
    },
  };
}

export function stepPlayerMovement(
  state: SuiteState,
  input: { forward: number; strafe: number; turn: number },
  dt: number,
): SuiteState {
  if (state.phase !== "playing") return state;
  const clampedDt = Math.min(0.1, Math.max(0, dt));
  const moveSpeed = 3.2;
  const turnSpeed = 1.8;

  const nextYaw = state.cameraYaw + input.turn * turnSpeed * clampedDt;
  const sin = Math.sin(nextYaw);
  const cos = Math.cos(nextYaw);

  const dx = (input.strafe * cos - input.forward * sin) * moveSpeed * clampedDt;
  const dz = (-input.forward * cos - input.strafe * sin) * moveSpeed * clampedDt;

  const nextX = Math.max(-4.5, Math.min(4.5, state.playerPos.x + dx));
  const nextZ = Math.max(-3.8, Math.min(4.8, state.playerPos.z + dz));

  return {
    ...state,
    cameraYaw: nextYaw,
    playerPos: { x: nextX, z: nextZ },
  };
}
