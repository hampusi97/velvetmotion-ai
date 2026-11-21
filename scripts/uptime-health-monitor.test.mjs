import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(new URL("../.github/workflows/uptime-health-monitor.yml",import.meta.url),"utf8");
test("scheduled health checks hit the canonical Cloudflare site and enforce source SHA",()=>{
  assert.match(workflow,/0 \*\/6 \* \* \*/);
  assert.match(workflow,/ref: main/);
  assert.match(workflow,/git rev-parse HEAD/);
  assert.match(workflow,/verify-cloudflare-public-commit\.mjs/);
  assert.match(workflow,/velvetmotion-ai\.hampusi97\.workers\.dev/);
});
test("health checks fail visibly on bad HTTP rather than only reporting a notice",()=>{
  assert.match(workflow,/curl --fail --silent --show-error/);
  assert.doesNotMatch(workflow,/\|\|\s*(?:echo|true)/);
  assert.doesNotMatch(workflow,/may still be deploying|Notice:/i);
});
