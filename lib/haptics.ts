/**
 * Mobile PWA Haptics — safe navigator.vibrate patterns.
 * Gracefully no-ops on iOS Safari / desktop browsers without vibration API.
 */

function pulse(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported or blocked */
  }
}

export function hapticTick() {
  pulse(10);
}

export function hapticSwipe() {
  pulse(16);
}

export function hapticSuperLike() {
  pulse([18, 35, 32]);
}

export function hapticMatch() {
  pulse([22, 45, 22, 45, 60]);
}

export function hapticLevelUp() {
  pulse([20, 30, 35, 30, 50]);
}
