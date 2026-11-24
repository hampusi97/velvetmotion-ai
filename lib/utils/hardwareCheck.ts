export interface HardwareReadiness {
  gpu: boolean;
  memory: boolean;
  audio: boolean;
}

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

type WindowWithWebkitAudio = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

export const checkHardwareReadiness = async (): Promise<HardwareReadiness> => {
  const readiness: HardwareReadiness = { gpu: false, memory: false, audio: false };

  if (typeof window === "undefined" || typeof document === "undefined") {
    return readiness;
  }

  try {
    // 1. GPU Check
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    readiness.gpu = Boolean(gl);

    // 2. Memory Check
    const nav = navigator as NavigatorWithMemory;
    if (typeof nav.deviceMemory === "number") {
      readiness.memory = nav.deviceMemory >= 8;
    }

    // 3. Audio Check
    const win = window as WindowWithWebkitAudio;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (typeof AudioCtx === "function") {
      const ctx = new AudioCtx();
      readiness.audio = ctx.state !== "closed";
      void ctx.close?.().catch(() => {});
    }
  } catch (e) {
    console.error("Hardware probe failed", e);
  }

  return readiness;
};
