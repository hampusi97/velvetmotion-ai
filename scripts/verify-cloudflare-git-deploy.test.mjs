import test from "node:test";
import assert from "node:assert/strict";
import { WORKER_CHECK, PAGES_CHECK, evaluateDeployChecks, fetchChecks, verifyGitConnectedDeployment } from "./verify-cloudflare-git-deploy.mjs";

const success = name => ({ name, status:"completed", conclusion:"success", details_url:"https://dash.cloudflare.com/a/build" });
const pending = name => ({ name, status:"in_progress", conclusion:null });

test("requires a successful exact Cloudflare Git check, not generic passing CI", () => {
  assert.equal(evaluateDeployChecks([success("build"), success("CodeQL")]).state, "pending");
  assert.equal(evaluateDeployChecks([success(WORKER_CHECK)]).provider, "workers");
  const pages = evaluateDeployChecks([success(PAGES_CHECK)]);
  assert.equal(pages.provider, "pages");
  assert.match(pages.warning, /No successful Workers/);
  assert.equal(evaluateDeployChecks([pending(WORKER_CHECK), success(PAGES_CHECK)]).state, "pending");
  assert.equal(evaluateDeployChecks([{name:WORKER_CHECK,status:"completed",conclusion:"failure"}]).state, "failed");
});

test("treats Pages as fallback only when the Workers Git check has failed or is missing", () => {
  const result = evaluateDeployChecks([{ name:WORKER_CHECK, status:"completed", conclusion:"failure" }, success(PAGES_CHECK)]);
  assert.equal(result.state, "verified");
  assert.equal(result.provider, "pages");
  assert.match(result.warning, /Workers native build did not succeed/);
});

test("fetches check runs for the exact commit with read-only GitHub authorization", async () => {
  const sha = "a".repeat(40);
  const checks = await fetchChecks({
    repository:"org/repo",sha,token:"test-token",fetcher:async (url, options) => {
      assert.match(url,new RegExp(`/commits/${sha}/check-runs\\?per_page=100$`));
      assert.equal(options.headers.Authorization,"Bearer test-token");
      return {ok:true,json:async()=>({check_runs:[success(WORKER_CHECK)]})};
    },
  });
  assert.equal(checks.length,1);
});

test("polls unfinished checks and accepts success only on the same SHA", async () => {
  let count = 0;
  let waits = 0;
  const result = await verifyGitConnectedDeployment({
    repository:"org/repo",sha:"b".repeat(40),token:"test-token",maxAttempts:3,delayMs:0,
    wait:async()=>{waits++;},
    fetcher:async()=>({ok:true,json:async()=>({
      check_runs: count++ === 0 ? [pending(WORKER_CHECK)] : [success(WORKER_CHECK)],
    })}),
  });
  assert.equal(result.provider,"workers");
  assert.equal(count,2);
  assert.equal(waits,1);
});

test("fails closed if no native deployment check succeeds before deadline", async () => {
  await assert.rejects(() => verifyGitConnectedDeployment({
    repository:"org/repo",sha:"c".repeat(40),token:"test-token",maxAttempts:2,delayMs:0,
    wait:async()=>{},
    fetcher:async()=>({ok:true,json:async()=>({check_runs:[success("build")]})}),
  }),/could not be verified/);
});

test("refuses to verify without a full GitHub commit SHA or token", async () => {
  await assert.rejects(() => fetchChecks({
    repository:"org/repo",sha:"short",token:"anything",
    fetcher:async()=>{throw new Error("should not fetch");},
  }),/are required/);
});
