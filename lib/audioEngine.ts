/**
 * VelvetMotion Procedural Intimacy Audio Engine
 * Uses Web Audio API to synthesize responsive low-frequency ambient breathing,
 * sensual whispers, and heartbeats that react in real-time to Intensity Meter levels.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseNode: AudioNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let lfoNode: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let heartbeatOsc: OscillatorNode | null = null;
let heartbeatGain: GainNode | null = null;
let isPlayingAudio = false;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise approximation
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
    const lfoRate = 0.15 + (intensity / 100) * 0.35; // slower when calm, faster/pant-like when intense
    lfoNode.frequency.setValueAtTime(lfoRate, ctx.currentTime);

    lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150 + (intensity / 100) * 200, ctx.currentTime);

    // Connect LFO to filter frequency for breathing sweep
    lfoNode.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);

    whiteNoise.connect(filterNode);
    filterNode.connect(masterGain);

    whiteNoise.start();
    lfoNode.start();
    noiseNode = whiteNoise;

    // Subtle sensual heartbeat thump at high intensity (>60)
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
    const bpm = 60 + (intensity / 100) * 60; // 60 to 120 bpm
    heartbeatOsc.frequency.setValueAtTime(55, ctx.currentTime); // Low sub-bass thud

    heartbeatGain = ctx.createGain();
    heartbeatGain.gain.setValueAtTime(0, ctx.currentTime);

    heartbeatOsc.connect(heartbeatGain);
    if (masterGain) heartbeatGain.connect(masterGain);
    heartbeatOsc.start();

    // Pulse heartbeat rhythm
    const intervalMs = (60 / bpm) * 1000;
    const beatTimer = setInterval(() => {
      if (!isPlayingAudio || !ctx) {
        clearInterval(beatTimer);
        return;
      }
      try {
        const now = ctx.currentTime;
        heartbeatGain?.gain.setValueAtTime(0.25, now);
        heartbeatGain?.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        setTimeout(() => {
          if (!isPlayingAudio || !ctx) return;
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
    if (audioCtx && audioCtx.state !== "closed") {
      void audioCtx.close();
    }
  } catch {
    /* */
  }
  audioCtx = null;
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
