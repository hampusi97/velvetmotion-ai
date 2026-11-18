/**
 * VelvetMotion Procedural Intimacy & JOI Audio Engine
 * Uses Web Audio API to synthesize:
 *  1. Responsive low-frequency ambient breathing & heartbeats tied to Intensity Meter
 *  2. Procedural JOI Stroke Pacemaker metronome (adjustable BPM)
 *  3. Countdown chimes & climax cues
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseNode: AudioNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let lfoNode: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let heartbeatOsc: OscillatorNode | null = null;
let heartbeatGain: GainNode | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let isPlayingAudio = false;

// JOI Pacemaker state
let joiBeatTimer: ReturnType<typeof setInterval> | null = null;
let joiCurrentBpm = 80;
let joiBeatRunning = false;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function startIntimacyAudio(intensity = 50): boolean {
  if (typeof window === "undefined") return false;
  if (isPlayingAudio) {
    updateIntimacyAudioIntensity(intensity);
    return true;
  }

  try {
    const ctx = getAudioContext();

    // Master gain
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Brown/Pink Noise buffer for warm breathing sound
    const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter for breath frequency shaping (lowpass)
    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    const baseFreq = 200 + (intensity / 100) * 350;
    filterNode.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    filterNode.Q.setValueAtTime(3.5, ctx.currentTime);

    // LFO for breathing rhythm (inhale/exhale cycle)
    lfoNode = ctx.createOscillator();
    const lfoRate = 0.15 + (intensity / 100) * 0.35;
    lfoNode.frequency.setValueAtTime(lfoRate, ctx.currentTime);

    lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150 + (intensity / 100) * 200, ctx.currentTime);

    lfoNode.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);

    whiteNoise.connect(filterNode);
    filterNode.connect(masterGain);

    whiteNoise.start();
    lfoNode.start();
    noiseNode = whiteNoise;

    if (intensity >= 60) {
      startHeartbeat(ctx, intensity);
    }

    isPlayingAudio = true;
    return true;
  } catch {
    return false;
  }
}

function startHeartbeat(ctx: AudioContext, intensity: number) {
  try {
    heartbeatOsc = ctx.createOscillator();
    heartbeatOsc.type = "sine";
    const bpm = 60 + (intensity / 100) * 60;
    heartbeatOsc.frequency.setValueAtTime(55, ctx.currentTime);

    heartbeatGain = ctx.createGain();
    heartbeatGain.gain.setValueAtTime(0, ctx.currentTime);

    heartbeatOsc.connect(heartbeatGain);
    if (masterGain) heartbeatGain.connect(masterGain);
    heartbeatOsc.start();

    const intervalMs = (60 / bpm) * 1000;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (!isPlayingAudio || !ctx || ctx.state === "closed") {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        return;
      }
      try {
        const now = ctx.currentTime;
        heartbeatGain?.gain.setValueAtTime(0.25, now);
        heartbeatGain?.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        setTimeout(() => {
          if (!isPlayingAudio || !ctx || ctx.state === "closed") return;
          const now2 = ctx.currentTime;
          heartbeatGain?.gain.setValueAtTime(0.15, now2);
          heartbeatGain?.gain.exponentialRampToValueAtTime(0.001, now2 + 0.12);
        }, 180);
      } catch {
        /* */
      }
    }, intervalMs);
  } catch {
    /* */
  }
}

export function updateIntimacyAudioIntensity(intensity: number) {
  if (!isPlayingAudio || !audioCtx) return;
  try {
    const ctx = audioCtx;
    if (filterNode) {
      const targetFreq = 180 + (intensity / 100) * 400;
      filterNode.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.5);
    }
    if (lfoNode) {
      const targetRate = 0.12 + (intensity / 100) * 0.4;
      lfoNode.frequency.setTargetAtTime(targetRate, ctx.currentTime, 0.5);
    }
    if (masterGain) {
      const targetVol = 0.12 + (intensity / 100) * 0.15;
      masterGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.5);
    }
  } catch {
    /* */
  }
}

export function stopIntimacyAudio() {
  isPlayingAudio = false;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  try {
    if (noiseNode && "stop" in noiseNode) {
      (noiseNode as AudioBufferSourceNode).stop();
    }
    if (lfoNode && "stop" in lfoNode) {
      lfoNode.stop();
    }
    if (heartbeatOsc && "stop" in heartbeatOsc) {
      heartbeatOsc.stop();
    }
    if (!joiBeatRunning && audioCtx && audioCtx.state !== "closed") {
      void audioCtx.close();
      audioCtx = null;
    }
  } catch {
    /* */
  }
  masterGain = null;
  noiseNode = null;
  filterNode = null;
  lfoNode = null;
  lfoGain = null;
  heartbeatOsc = null;
  heartbeatGain = null;
}

export function isIntimacyAudioPlaying(): boolean {
  return isPlayingAudio;
}

/** Play a single warm rhythmic stroke beat pulse */
export function playStrokeBeat(accent = false) {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = accent ? "triangle" : "sine";
    osc.frequency.setValueAtTime(accent ? 160 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(accent ? 0.32 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    /* */
  }
}

/** Play countdown cue tone */
export function playCountdownChime(isFinal = false) {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(isFinal ? 880 : 520, now);
    if (isFinal) {
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);
    }

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.45 : 0.18));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.46 : 0.2));
  } catch {
    /* */
  }
}

/** Start procedural JOI pacemaker metronome at target BPM */
export function startJoiBeat(bpm: number, onTick?: (beatCount: number) => void) {
  if (typeof window === "undefined") return;
  stopJoiBeat();
  joiCurrentBpm = Math.min(200, Math.max(40, bpm));
  joiBeatRunning = true;

  let count = 0;
  const fire = () => {
    if (!joiBeatRunning) return;
    count += 1;
    playStrokeBeat(count % 4 === 1);
    onTick?.(count);
  };

  fire();
  const intervalMs = Math.round((60 / joiCurrentBpm) * 1000);
  joiBeatTimer = setInterval(fire, intervalMs);
}

export function stopJoiBeat() {
  joiBeatRunning = false;
  if (joiBeatTimer) {
    clearInterval(joiBeatTimer);
    joiBeatTimer = null;
  }
}

export function isJoiBeatRunning(): boolean {
  return joiBeatRunning;
}
