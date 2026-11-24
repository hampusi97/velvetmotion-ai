/** Feature flags. Default all on. Set NEXT_PUBLIC_FLAG_* to "false" to disable. */
function flag(name: string, fallback = true): boolean {
  if (typeof process === "undefined") return fallback;
  const v = process.env[`NEXT_PUBLIC_FLAG_${name}`];
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return fallback;
}

export const FLAGS = {
  unpromptedPhotos: flag("UNPROMPTED"),
  nudify: flag("NUDIFY"),
  verification: flag("VERIFY"),
  tributeLog: flag("TRIBUTE"),
  loops: flag("LOOPS"),
  tools: flag("TOOLS"),
} as const;
