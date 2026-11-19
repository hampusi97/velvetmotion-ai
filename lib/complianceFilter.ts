/**
 * VelvetMotion AI — Synchronous Safety & Acceptable-Hosting Guardrail
 *
 * Strictly fictional adults (18+) only.
 * Called synchronously before EVERY chat submission, image generation,
 * video generation, and character-creation save to block minors/CSAM and
 * non-consensual real-person deepfakes (NCII).
 */

import { checkContentSafety } from "./safety";

export type ComplianceResult =
  | { ok: true }
  | { ok: false; reason: string; category: "minor-safety" | "ncii" | "non-consensual" | "self-harm" };

const EXTRA_MINOR_PATTERNS: RegExp[] = [
  /\b(csam|csae|pedophil|paedophil|jailbait|barely\s*legal\s*teen|minor\s*attracted)\b/i,
  /\b(school\s*uniform\s*kid|under\s*18|age\s*1[0-7]|1[0-7]\s*yo)\b/i,
];

const NCII_DEEPFAKE_PATTERNS: RegExp[] = [
  /\b(deep\s*fake|deepfake|ncii|revenge\s*porn|leaked\s*nudes?|non[-\s]?consensual\s*(nude|porn|image|video|photo))\b/i,
  /\b(without\s+(her|his|their)\s+consent|real\s+person\s+nude|undress\s+my\s+(ex|coworker|classmate|teacher|friend|celebrity))\b/i,
  /\b(celebrity\s+(nude|porn|sex|explicit)|face\s*swap\s+porn)\b/i,
];

export const COMPLIANCE_POLICY_SUMMARY =
  "Fictional consenting adults (18+/21+) only. Zero tolerance for CSAM/minors, non-consensual real-person deepfakes (NCII), or non-consensual violence.";

export function assertCompliance(text: string): ComplianceResult {
  const sample = String(text || "").trim();
  if (!sample) return { ok: true };

  const base = checkContentSafety(sample);
  if (!base.allowed) {
    return {
      ok: false,
      category:
        base.category === "minor-safety"
          ? "minor-safety"
          : base.category === "self-harm-or-violence"
            ? "self-harm"
            : "non-consensual",
      reason: base.reason || "Blocked by 18+ Safety Policy.",
    };
  }

  for (const rx of EXTRA_MINOR_PATTERNS) {
    if (rx.test(sample)) {
      return {
        ok: false,
        category: "minor-safety",
        reason: "Blocked: VelvetMotion strictly permits consenting fictional adults (18+) only.",
      };
    }
  }

  for (const rx of NCII_DEEPFAKE_PATTERNS) {
    if (rx.test(sample)) {
      return {
        ok: false,
        category: "ncii",
        reason: "Blocked: Real-person deepfakes and non-consensual intimate imagery (NCII) are strictly prohibited.",
      };
    }
  }

  return { ok: true };
}

export function validateCharacterCompliance(input: {
  name?: string;
  age?: number;
  personality?: string;
  backstory?: string;
  tagline?: string;
  kink?: string;
  figure?: string;
}): ComplianceResult {
  if (typeof input.age === "number" && input.age < 18) {
    return {
      ok: false,
      category: "minor-safety",
      reason: "Blocked: Fictional companions must be 18 years or older.",
    };
  }
  const joined = [
    input.name,
    input.tagline,
    input.personality,
    input.backstory,
    input.kink,
    input.figure,
  ]
    .filter(Boolean)
    .join(" ");
  return assertCompliance(joined);
}
