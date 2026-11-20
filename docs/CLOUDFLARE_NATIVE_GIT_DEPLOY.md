# Cloudflare deployment verification and GitHub CI

VelvetMotion currently has two independent Cloudflare deployment paths:

1. **Cloudflare native Git integration** builds the `velvetmotion-ai` Worker and `velvetmotion-ai` Pages project directly from commits on GitHub `main`. Cloudflare reports independent commit-bound GitHub checks such as `Workers Builds: velvetmotion-ai` and `Cloudflare Pages: velvetmotion-ai`.
2. **GitHub Actions direct Wrangler deployment** is optional and requires both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets.

The previous `CI & Deploy Web` workflow always failed on `main` when the Wrangler secrets were absent, even if the native Cloudflare Git integration had already successfully built/deployed the exact commit. Its failures were misleading because the live Cloudflare infrastructure was independently receiving updates.

## New behavior

- Pull requests always run audit, lint, TypeScript and production export checks. Manual Wrangler preview is optional when both credentials exist.
- On `main`, if **both Wrangler secrets exist**, the workflow deploys via Wrangler as before.
- On `main`, if **neither exists**, `scripts/verify-cloudflare-git-deploy.mjs` polls the GitHub REST Checks API for the **exact `GITHUB_SHA`** using the ephemeral read-only `GITHUB_TOKEN`. A completed/successful `Workers Builds: velvetmotion-ai` check verifies the Worker Git integration. If no Worker success is available, the script can verify a successful `Cloudflare Pages: velvetmotion-ai` check instead and explicitly identifies it as Pages.
- If only one of the Wrangler secrets exists, the workflow fails with a configuration error.
- If Cloudflare checks remain missing, pending, or fail, the workflow exits nonzero. A green application build or an earlier deployment is **never** treated as proof of a production deployment.
- The GitHub step summary records which Cloudflare service/check verified the commit; a successful Pages fallback does not imply Workers deployed.

The `GITHUB_TOKEN` is provided automatically by GitHub Actions and receives `checks: read` for this workflow. No new Cloudflare API token is required just to verify the existing Git-connected build. The Cloudflare projects must remain connected to GitHub and have enabled automatic production deployment on the main branch.

## Owner-only setup for explicit Wrangler deployment

To enable a **second, direct Wrangler deploy** from GitHub Actions, configure these under Repository Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN` — least-privilege Cloudflare deployment API token (secret).
- `CLOUDFLARE_ACCOUNT_ID` — exact Cloudflare account ID (secret in the current workflow).

Do not commit either credential. The deployment verifier does not create a token, change the Cloudflare account configuration or bypass production controls.

## Scope of verification

A successful Cloudflare GitHub check verifies provider-reported deployment success for a particular commit. It is **not** a complete production browser smoke test. After a release, also test the canonical public URL, media and chat routes, and a real desktop installer. The live Worker's deployed version and Pages project are separate resources. A GitHub Pages preview check is not proof of a production Worker deploy.

Automated tests in `scripts/verify-cloudflare-git-deploy.test.mjs` cover exact-commit verification, native Workers preference, Pages fallback, pending checks and fail-closed behavior.
