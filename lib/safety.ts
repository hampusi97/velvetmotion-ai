/**
 * VelvetMotion AI — Security, SSRF Protection, Rate Limiting & 21+ Content Safety Guardrail
 *
 * - Zero-tolerance server-side block against underage/CSAM, non-consensual violence, and self-harm.
 * - SSRF validation blocking cloud metadata endpoints (169.254.169.254, metadata.google.internal, etc.)
 *   and non-HTTP(S) protocols on user-supplied proxy URLs (ComfyUI, Forge, Ollama).
 * - XSS/control-character sanitization for Lounge, chat, and leaderboard inputs.
 * - Lightweight sliding-window API rate limiter to prevent spam and abuse in production.
 */

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  category?: "minor-safety" | "non-consensual" | "self-harm-or-violence";
}

export interface UrlValidationResult {
  ok: boolean;
  url?: string;
  reason?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

const MINOR_SAFETY_PATTERNS: RegExp[] = [
  /\b(underage|preteen|pre-teen|toddler|infant|minor\s+(girl|boy|sex|nude|porn)|child\s*(porn|sex|nude|abuse|exploitation)|csam|lolicon|shotacon|\bloli\b|\bshota\b)\b/i,
  /\b(1[0-7]|[1-9])\s*[-]?\s*(year|yr|y\.?o\.?)\s*[-]?\s*old\b/i,
  /\b(elementary|middle\s*school|high\s*school\s+kid|school\s*child|young\s+kid|little\s+girl|little\s+boy)\b/i,
];

const NON_CONSENSUAL_PATTERNS: RegExp[] = [
  /\b(rape|raping|non-?consensual|drugged\s+unconscious|forced\s+sex|sexual\s+assault|bestiality|zoophilia|necrophilia)\b/i,
];

const SEVERE_HARM_PATTERNS: RegExp[] = [
  /\b(kill\s+yourself|how\s+to\s+commit\s+suicide|how\s+to\s+make\s+a\s+bomb|build\s+an\s+explosive)\b/i,
];

/**
 * Checks prompts and messages against strict 21+ consensual-adult safety rules.
 * Consensual adult (21+) fictional content is allowed; CSAM/underage, non-consensual
 * violence, and self-harm instructions are strictly blocked.
 */
export function checkContentSafety(text: string): SafetyCheckResult {
  const sample = (text || "").trim();
  if (!sample) return { allowed: true };

  for (const rx of MINOR_SAFETY_PATTERNS) {
    if (rx.test(sample)) {
      return {
        allowed: false,
        category: "minor-safety",
        reason:
          "Blocked by 21+ Safety Policy: VelvetMotion AI strictly permits consenting fictional adults (21+) only.",
      };
    }
  }

  for (const rx of NON_CONSENSUAL_PATTERNS) {
    if (rx.test(sample)) {
      return {
        allowed: false,
        category: "non-consensual",
        reason:
          "Blocked by Safety Policy: Non-consensual violence and illegal content are strictly prohibited.",
      };
    }
  }

  for (const rx of SEVERE_HARM_PATTERNS) {
    if (rx.test(sample)) {
      return {
        allowed: false,
        category: "self-harm-or-violence",
        reason: "Blocked by Safety Policy: Self-harm or dangerous weapon instructions are not permitted.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Strips null bytes, control chars, and raw HTML script/iframe tags from user strings.
 */
export function sanitizeUserText(raw: string, maxLen = 1000): string {
  return String(raw || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style)[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim()
    .slice(0, maxLen);
}

const BLOCKED_METADATA_HOSTS = new Set([
  "169.254.169.254",
  "169.254.170.2",
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "0.0.0.0",
  "[::]",
  "fd00:ec2::254",
  "[fd00:ec2::254]",
]);

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") return true;
  if (h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  return false;
}

/**
 * Validates external/local worker URLs (ComfyUI, Forge, Ollama) against SSRF attacks.
 * Always blocks non-HTTP(S) schemes and cloud metadata / link-local addresses.
 * On hosted serverless platforms (`VERCEL=1`), blocks private/loopback targets unless explicitly env-configured.
 */
export function validateSafeEndpointUrl(
  rawUrl: string,
  options?: { allowLoopback?: boolean },
): UrlValidationResult {
  const trimmed = (rawUrl || "").trim().replace(/\/$/, "");
  if (!trimmed) return { ok: false, reason: "Empty endpoint URL" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Malformed endpoint URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// endpoints are allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    BLOCKED_METADATA_HOSTS.has(host) ||
    host.startsWith("169.254.") ||
    host.startsWith("fe80:")
  ) {
    return { ok: false, reason: "Blocked SSRF target: cloud metadata or link-local address" };
  }

  const allowLoopback = options?.allowLoopback ?? process.env.VERCEL !== "1";
  if (!allowLoopback && isPrivateOrLoopbackHost(host)) {
    return {
      ok: false,
      reason: "Private/loopback endpoint URLs are blocked in hosted cloud mode; use a public HTTPS tunnel.",
    };
  }

  return { ok: true, url: trimmed };
}

const rateBuckets = new Map<string, number[]>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || "local";
}

/**
 * In-memory sliding-window rate limiter per route bucket + client IP.
 */
export function checkRateLimit(
  bucket: string,
  req: Request,
  maxRequests = 45,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${getClientIp(req)}`;
  const hits = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);

  if (hits.length >= maxRequests) {
    const oldest = hits[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateBuckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  hits.push(now);
  rateBuckets.set(key, hits);

  // Periodic cleanup to keep memory bounded
  if (rateBuckets.size > 500) {
    for (const [k, list] of rateBuckets.entries()) {
      const fresh = list.filter((ts) => now - ts < windowMs);
      if (fresh.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, fresh);
    }
  }

  return {
    ok: true,
    remaining: Math.max(0, maxRequests - hits.length),
    retryAfterSec: 0,
  };
}
