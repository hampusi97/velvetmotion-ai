/**
 * Verifies the public Cloudflare production origin is actually serving this
 * GitHub commit, rather than accepting a successful provider build/check.
 * build-meta.json currently emits exactly seven hex characters; a full SHA
 * is also accepted for future builds, but shorter/longer prefixes are not.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_WORKERS_PRODUCTION_URL = "https://velvetmotion-ai.hampusi97.workers.dev";
export const DEFAULT_PAGES_PRODUCTION_URL = "https://velvetmotion-ai-git.pages.dev";

export function resolveProductionSiteUrl(env = process.env) {
  const provider = env.VERIFIED_PROVIDER === "pages" ? "pages" : "workers";
  const siteUrl = provider === "pages"
    ? (env.PAGES_PRODUCTION_URL || DEFAULT_PAGES_PRODUCTION_URL)
    : (env.WORKERS_PRODUCTION_URL || DEFAULT_WORKERS_PRODUCTION_URL);
  return { provider, siteUrl };
}

export function expectedProductionShaMatches(actual, expected) {
  if (typeof actual !== "string" || !/^[a-f0-9]{40}$/i.test(expected || "")) return false;
  const normalized = actual.trim().toLowerCase();
  const full = expected.toLowerCase();
  return (normalized.length === 7 && normalized === full.slice(0, 7)) ||
    (normalized.length === 40 && normalized === full);
}

export function productionMetaUrl(siteUrl, sha, attempt = 1) {
  if (!/^[a-f0-9]{40}$/i.test(sha || "")) throw new Error("A full commit SHA is required");
  const base = new URL(siteUrl);
  if (base.protocol !== "https:" || base.username || base.password ||
      base.search || base.hash || (base.pathname !== "/" && base.pathname !== "")) {
    throw new Error("Production site must be an HTTPS origin with no credentials, path, or query");
  }
  const result = new URL("/build-meta.json", base);
  result.searchParams.set("commit", sha);
  result.searchParams.set("attempt", String(attempt));
  return result;
}

export async function probeProductionCommit({
  siteUrl,
  sha,
  attempt = 1,
  fetcher = fetch,
}) {
  const url = productionMetaUrl(siteUrl, sha, attempt);
  const response = await fetcher(url.toString(), {
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "application/json", "Cache-Control": "no-cache", Pragma: "no-cache" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response?.ok) throw new Error(`Production metadata returned HTTP ${response?.status ?? "no response"}`);
  if (response.url) {
    const final = new URL(response.url);
    if (final.protocol !== "https:" || final.origin !== url.origin) {
      throw new Error("Production metadata redirected to an untrusted origin");
    }
  }
  const type = response.headers?.get("content-type")?.toLowerCase() || "";
  if (!/^application\/(?:json|[\w.+-]+\+json)(?:;|$)/.test(type)) {
    throw new Error(`Production metadata has an unexpected content type: ${type || "(missing)"}`);
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Production metadata is not valid JSON"); }
  if (!data || typeof data !== "object" || !expectedProductionShaMatches(data.commitSha, sha)) {
    throw new Error(`Production is serving ${typeof data?.commitSha === "string" ? data.commitSha.slice(0, 40) : "(unknown)"} instead of ${sha.slice(0, 7)}`);
  }
  return { commitSha: data.commitSha, version: data.version, url: url.origin };
}

export async function verifyPublicProductionCommit({
  siteUrl,
  sha,
  fetcher = fetch,
  attempts = 18,
  delayMs = 10000,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log = console.log,
}) {
  // Reject invalid URLs/SHA before attempting HTTP or waiting.
  productionMetaUrl(siteUrl, sha);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 30) {
    throw new Error("Production verification attempts must be between 1 and 30");
  }
  let errorText = "no successful probe";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await probeProductionCommit({ siteUrl, sha, attempt, fetcher });
      log(`Public production verified on attempt ${attempt}/${attempts}: ${result.url} serves ${result.commitSha}`);
      return { ...result, attempt };
    } catch (error) {
      errorText = error instanceof Error ? error.message : String(error);
      log(`Public production not ready (${attempt}/${attempts}): ${errorText}`);
      if (attempt < attempts) await wait(delayMs);
    }
  }
  throw new Error(`Public production was not verified for commit ${sha.slice(0, 7)}: ${errorText}`);
}

async function main() {
  const { GITHUB_SHA, GITHUB_STEP_SUMMARY } = process.env;
  const { provider, siteUrl } = resolveProductionSiteUrl(process.env);
  if (!siteUrl) throw new Error(`Missing production URL for Cloudflare ${provider}`);
  const result = await verifyPublicProductionCommit({ siteUrl, sha: GITHUB_SHA });
  if (GITHUB_STEP_SUMMARY) {
    appendFileSync(GITHUB_STEP_SUMMARY, [
      "### Public production HTTP verification",
      `- Origin: ${result.url}`,
      `- Exact commit: \`${GITHUB_SHA}\``,
      `- Served metadata: \`${result.commitSha}\``,
      `- Attempts: ${result.attempt}`,
      "",
    ].join("\n") + "\n");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
