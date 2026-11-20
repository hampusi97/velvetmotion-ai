/**
 * Client preference for local inference *request budgets*. This does not load a
 * model, detect GPU VRAM, or grant the website access to native RAM. The local
 * model server must be running independently.
 */
export type LocalComputeMode = "efficient" | "balanced" | "expressive";

export const LOCAL_COMPUTE_MODES: Record<
  LocalComputeMode,
  { title: string; detail: string; maxTokens: number; timeoutMs: number }
> = {
  efficient: {
    title: "Efficient",
    detail: "Short replies and lower waiting time for lighter local models.",
    maxTokens: 160,
    timeoutMs: 15000,
  },
  balanced: {
    title: "Balanced",
    detail: "Good default for local chat quality and response speed.",
    maxTokens: 260,
    timeoutMs: 25000,
  },
  expressive: {
    title: "Expressive",
    detail: "Longer replies and more inference time for faster machines.",
    maxTokens: 380,
    timeoutMs: 45000,
  },
};

const KEY = "vm-local-compute-mode";

export function getLocalComputeMode(): LocalComputeMode {
  if (typeof window === "undefined") return "balanced";
  try {
    const value = localStorage.getItem(KEY);
    if (value === "efficient" || value === "balanced" || value === "expressive") return value;
  } catch {
    // Private browsing / denied browser storage: keep defaults.
  }
  return "balanced";
}

export function saveLocalComputeMode(mode: LocalComputeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new CustomEvent("vm:local-compute-mode", { detail: mode }));
  } catch {
    // In-memory UI still works in restrictive browser modes.
  }
}

export function localComputeBudget() {
  return LOCAL_COMPUTE_MODES[getLocalComputeMode()];
}
