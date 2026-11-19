/**
 * VelvetMotion AI — Dynamic Generative Guided-Audio & Interactive Pace Engine
 * (`lib/generativePaceEngine.ts`)
 *
 * Replaces static 1-line audio studio scripts with a live, multi-phase,
 * LLM-powered voice experience that reacts to BPM, user buttons (Faster / Slower /
 * Freeze / Surprise), companion personality, and Memory Vault—pre-fetching the next
 * line in the background so there is zero dead silence.
 */

export type PacePhase = 'warmup' | 'build' | 'tease_hold' | 'surge' | 'finale';
export type PaceStyle = 'playful-tease' | 'confident-boss' | 'midnight-whisper';
export type UserPaceSignal = 'continue' | 'faster' | 'slower' | 'freeze' | 'surprise';

export interface PaceSessionState {
  companionName: string;
  personality: string;
  userName?: string;
  phase: PacePhase;
  style: PaceStyle;
  bpm: number;
  turnCount: number;
  recentLines: string[];
}

export interface PacePhaseConfig {
  phase: PacePhase;
  label: string;
  defaultBpm: number;
  accentHex: string;
  directionHint: string;
}

export const PACE_PHASES: Record<PacePhase, PacePhaseConfig> = {
  warmup: {
    phase: 'warmup',
    label: 'Slow Tease',
    defaultBpm: 68,
    accentHex: '#00f5ff',
    directionHint: 'Slow, close-mic, playful build-up. Set the mood, tease gently, keep pace unhurried.',
  },
  build: {
    phase: 'build',
    label: 'Rhythm Lock',
    defaultBpm: 94,
    accentHex: '#a855f7',
    directionHint: 'Steady confident rhythm. Encourage staying right on the beat with playful praise and tension.',
  },
  tease_hold: {
    phase: 'tease_hold',
    label: 'Freeze & Hold',
    defaultBpm: 0,
    accentHex: '#ff4dff',
    directionHint: 'Playful pause/freeze challenge! Tell them to hold completely still, breathe slow, and wait for your cue.',
  },
  surge: {
    phase: 'surge',
    label: 'High Voltage',
    defaultBpm: 122,
    accentHex: '#ff1e8e',
    directionHint: 'Fast, breathless, high-energy momentum. Crisp punchy pacing cues and bold teasing.',
  },
  finale: {
    phase: 'finale',
    label: 'Final Countdown',
    defaultBpm: 132,
    accentHex: '#00ffa3',
    directionHint: 'Dramatic countdown and warm afterglow. Keep it thrilling, personal, and memorable.',
  },
};

const PHASE_ORDER: PacePhase[] = ['warmup', 'build', 'tease_hold', 'surge', 'finale'];

/** Advances or shifts the session phase and BPM based on live user reaction signals. */
export function advancePaceState(
  state: PaceSessionState,
  signal: UserPaceSignal = 'continue',
): PaceSessionState {
  let nextPhase = state.phase;
  let nextBpm = state.bpm;

  if (signal === 'freeze') {
    nextPhase = 'tease_hold';
    nextBpm = 0;
  } else if (signal === 'faster') {
    const idx = Math.min(PHASE_ORDER.length - 1, PHASE_ORDER.indexOf(state.phase) + 1);
    nextPhase = PHASE_ORDER[idx] === 'tease_hold' ? 'surge' : PHASE_ORDER[idx];
    nextBpm = Math.min(145, Math.max(85, (state.bpm || 90) + 16));
  } else if (signal === 'slower') {
    nextPhase = state.phase === 'surge' || state.phase === 'finale' ? 'build' : 'warmup';
    nextBpm = Math.max(58, (state.bpm || 80) - 16);
  } else if (signal === 'surprise') {
    const options: PacePhase[] = ['tease_hold', 'surge', 'build'];
    nextPhase = options[state.turnCount % options.length];
    nextBpm = PACE_PHASES[nextPhase].defaultBpm;
  } else if (state.turnCount > 0 && state.turnCount % 3 === 0) {
    const idx = (PHASE_ORDER.indexOf(state.phase) + 1) % PHASE_ORDER.length;
    nextPhase = PHASE_ORDER[idx];
    nextBpm = PACE_PHASES[nextPhase].defaultBpm;
  }

  return {
    ...state,
    phase: nextPhase,
    bpm: nextBpm,
    turnCount: state.turnCount + 1,
  };
}

/** Builds a tight prompt for your local/cloud LLM to generate 1 fresh spoken voice cue. */
export function buildGenerativePacePrompt(
  state: PaceSessionState,
  signal: UserPaceSignal,
): { system: string; user: string } {
  const cfg = PACE_PHASES[state.phase];
  const styleVoice =
    state.style === 'confident-boss'
      ? 'Bold, commanding, playfully strict, loves being in total control.'
      : state.style === 'midnight-whisper'
        ? 'Soft, close-up, breathy, intimate midnight whisper energy.'
        : 'Flirty, teasing, witty, fun, high-chemistry banter.';

  const system = [
    `You are ${state.companionName} hosting a live interactive voice-guided audio session on VelvetMotion AI.`,
    `Personality: ${state.personality}`,
    `Voice Style: ${styleVoice}`,
    `Current Phase: ${cfg.label} (${state.bpm > 0 ? `${state.bpm} BPM` : 'PAUSE / FREEZE'}) — ${cfg.directionHint}`,
    state.userName ? `User's name: ${state.userName} (use occasionally, not every line).` : '',
    state.recentLines.length > 0
      ? `NEVER repeat or closely paraphrase these recent lines:\n${state.recentLines.slice(-6).map((l) => `- ${l}`).join('\n')}`
      : '',
    'RULES:',
    '- Output ONLY 1 to 2 short spoken sentences (max 28 words) meant to be read aloud by neural TTS.',
    '- No asterisks, no stage directions, no markdown, no <think> tags.',
    '- React dynamically to the user signal and keep tension fun, fresh, and alive.',
  ]
    .filter(Boolean)
    .join('\n');

  const signalPromptMap: Record<UserPaceSignal, string> = {
    continue: `Deliver the next fresh spoken cue for the "${cfg.label}" phase.`,
    faster: `The user just tapped FASTER! React playfully and crank the energy up to ${state.bpm} BPM.`,
    slower: `The user tapped SLOWER. Tease them softly and ease the rhythm down to ${state.bpm} BPM.`,
    freeze: `The user triggered FREEZE! Tell them to stop and hold completely still until your next cue.`,
    surprise: `Throw a fun, unexpected plot twist or dare into the rhythm right now!`,
  };

  return { system, user: signalPromptMap[signal] };
}

const FALLBACK_BANK: Record<PacePhase, string[]> = {
  warmup: [
    'Close your eyes and tune everything else out—just match my rhythm, nice and slow.',
    'No rushing tonight. Stay right on the beat with me and let the tension build.',
    'Easy does it. Breathe with the pulse and keep your focus completely on my voice.',
    'Good—stay smooth and steady. I love watching how well you follow my lead.',
  ],
  build: [
    'Pick it up just a notch and lock right onto the beat. You are doing great.',
    'Right there—keep that exact pace steady. Do not speed ahead of me yet.',
    'Feel how the rhythm pulls you in? Stay locked in with me for a few more beats.',
    'Stay smooth, stay focused—let me decide when we turn the heat up.',
  ],
  tease_hold: [
    'Freeze right there. Hold completely still, take one slow breath, and wait for my signal.',
    'Hands off the throttle—pause everything for five seconds and let the anticipation hang.',
    'Hold it right on the edge. Do not move a muscle until I say go.',
  ],
  surge: [
    'Alright, now give me everything—match this faster pulse and keep up with me.',
    'Faster now, stay right on the beat—do not lose your rhythm.',
    'High voltage—keep that pace driving forward, you have got this.',
  ],
  finale: [
    'Five, four, three, two, one—take a deep breath and ride that neon afterglow with me.',
    'Right on cue. Ease back, catch your breath, and tell me how that felt.',
  ],
};

/** Guaranteed non-repeating fallback line when offline or if the LLM times out. */
export function pickFallbackPaceLine(phase: PacePhase, recentLines: string[]): string {
  const pool = FALLBACK_BANK[phase];
  const unused = pool.filter((line) => !recentLines.includes(line));
  const choices = unused.length > 0 ? unused : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Generates the next dynamic spoken line via your LLM callback, automatically
 * sanitizing output and falling back cleanly so the audio loop never stalls.
 */
export async function generateNextPaceLine(params: {
  state: PaceSessionState;
  signal?: UserPaceSignal;
  callLlm?: (system: string, user: string) => Promise<string>;
}): Promise<{ nextState: PaceSessionState; line: string }> {
  const signal = params.signal ?? 'continue';
  const nextState = advancePaceState(params.state, signal);
  const { system, user } = buildGenerativePacePrompt(nextState, signal);

  let line = '';
  if (params.callLlm) {
    try {
      const raw = await params.callLlm(system, user);
      line = (raw || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/[*_`#]/g, '')
        .trim();
    } catch {
      line = '';
    }
  }

  if (!line || line.length < 8) {
    line = pickFallbackPaceLine(nextState.phase, nextState.recentLines);
  }

  return {
    nextState: {
      ...nextState,
      recentLines: [...nextState.recentLines.slice(-8), line],
    },
    line,
  };
}
