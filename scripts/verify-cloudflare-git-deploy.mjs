/**
 * Verify Cloudflare's Git-connected production deployment for exactly this
 * GitHub commit when a second Wrangler deploy isn't configured.
 *
 * This does not consider passing application tests, preview builds, or a
 * successful deployment of a different commit proof of production delivery.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const WORKER_CHECK = "Workers Builds: velvetmotion-ai";
export const PAGES_CHECK = "Cloudflare Pages: velvetmotion-ai";

export function evaluateDeployChecks(checks) {
  if (!Array.isArray(checks)) return { state: "pending", reason: "Check-run results are unavailable" };
  // GitHub may retain multiple check runs when a provider reruns the same SHA.
  // Always trust the newest check run ID, not an old successful attempt.
  const get = name => checks.filter(c => c && c.name === name)
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)).at(-1);
  const worker = get(WORKER_CHECK);
  const pages = get(PAGES_CHECK);
  if (worker?.status === "completed" && worker.conclusion === "success") {
    return { state: "verified", provider: "workers", check: WORKER_CHECK, url: worker.details_url };
  }
  if (worker && worker.status !== "completed") {
    return { state: "pending", reason: "Cloudflare Workers Git build is still running" };
  }
  if (pages?.status === "completed" && pages.conclusion === "success") {
    return {
      state: "verified", provider: "pages", check: PAGES_CHECK, url: pages.details_url,
      warning: worker && worker.conclusion !== "success"
        ? "Workers native build did not succeed; Pages deployed this commit instead"
        : "No successful Workers native build check was reported; Pages deployed this commit",
    };
  }
  if (pages && pages.status !== "completed") {
    return { state: "pending", reason: "Cloudflare Pages deployment is still running" };
  }
  if (worker?.status === "completed" && worker.conclusion !== "success") {
    return { state: "failed", reason: `Cloudflare Workers Git check finished with ${worker.conclusion}` };
  }
  if (pages?.status === "completed" && pages.conclusion !== "success") {
    return { state: "failed", reason: `Cloudflare Pages Git check finished with ${pages.conclusion}` };
  }
  return { state: "pending", reason: "Waiting for Cloudflare Git deployment checks" };
}

export async function fetchChecks({ repository, sha, token, fetcher = fetch, apiUrl = "https://api.github.com" }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[0-9a-f]{40}$/.test(sha) || !token) {
    throw new Error("GitHub repository, commit SHA and Actions token are required to verify a deployment.");
  }
  const response = await fetcher(`${apiUrl}/repos/${repository}/commits/${sha}/check-runs?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`GitHub check verification HTTP ${response.status}`);
  const body = await response.json();
  if (!body || !Array.isArray(body.check_runs)) throw new Error("Invalid GitHub checks response.");
  return body.check_runs;
}

export async function verifyGitConnectedDeployment({
  repository, sha, token, fetcher = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxAttempts = 36, delayMs = 10000,
}) {
  let last = { state: "pending", reason: "No checks fetched yet" };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const checks = await fetchChecks({ repository, sha, token, fetcher });
    last = evaluateDeployChecks(checks);
    if (last.state === "verified") return last;
    if (last.state === "failed") throw new Error(last.reason);
    if (attempt < maxAttempts) await wait(delayMs);
  }
  throw new Error(`Cloudflare Git deployment could not be verified for commit ${sha.slice(0,12)}: ${last.reason}`);
}

async function main() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY } = process.env;
  if (!GITHUB_REPOSITORY || !GITHUB_SHA || !GITHUB_TOKEN) {
    throw new Error("Required GitHub Actions context is missing; refusing to claim a deploy.");
  }
  console.log(`Verifying native Cloudflare Git deployment for ${GITHUB_REPOSITORY}@${GITHUB_SHA}`);
  const result = await verifyGitConnectedDeployment({
    repository: GITHUB_REPOSITORY, sha: GITHUB_SHA, token: GITHUB_TOKEN,
  });
  const message = `Verified Cloudflare ${result.provider} Git deployment for exact SHA ${GITHUB_SHA} through ${result.check}`;
  console.log(message);
  if (result.warning) console.warn(`::warning::${result.warning}`);
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `provider=${result.provider}\n`);
  if (GITHUB_STEP_SUMMARY) {
    appendFileSync(GITHUB_STEP_SUMMARY, [
      "### VelvetMotion Cloudflare Git deployment",
      `- Commit: \`${GITHUB_SHA}\``,
      `- Verified by: ${result.check} (completed: success)`,
      `- Deployment type: ${result.provider === "workers" ? "Cloudflare Workers" : "Cloudflare Pages"}`,
      result.url ? `- Details: ${result.url}` : "",
      result.warning ? `- Note: ${result.warning}` : "",
      "- Direct Wrangler deployment was skipped because its separate GitHub credentials are not configured.",
      "",
    ].filter(Boolean).join("\n") + "\n");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
