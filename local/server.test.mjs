import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalServer } from "./server.mjs";

async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

test("local website serves assets and connects to the actual Ollama protocol", async t => {
  const root = await mkdtemp(join(tmpdir(), "vm-local-"));
  await writeFile(join(root, "index.html"), "<h1>Local app</h1>");
  await writeFile(join(root, "companion.html"), "<h1>Companion</h1>");
  let sent;
  let fail = false;
  const engine = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [{ name: "test-model" }] }));
    assert.equal(req.url, "/api/chat");
    let body = ""; for await (const chunk of req) body += chunk;
    sent = JSON.parse(body);
    if (fail) { res.statusCode = 500; return res.end(JSON.stringify({ error: "Engine stopped" })); }
    res.end(JSON.stringify({ message: { role: "assistant", content: "Hello from the test model." } }));
  });
  const backend = await listen(engine);
  const local = createLocalServer({ websiteDir: root, ollamaURL: backend });
  const origin = await listen(local);
  t.after(async () => { await close(local); await close(engine); await rm(root, { recursive: true }); });
  const json = body => ({ method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
  const payload = { model: "test-model", messages: [{ role: "user", content: "Hello" }], profile: { name: "Nova", personality: "kind", notes: "I like astronomy." } };

  assert.equal((await fetch(origin)).status, 200);
  assert.match(await (await fetch(origin + "/companion")).text(), /Companion/);
  assert.equal(await (await fetch(origin, { method: "HEAD" })).text(), "");
  const status = await (await fetch(origin + "/api/local-status")).json();
  assert.equal(status.runtime, "local");
  assert.deepEqual(status.models, ["test-model"]);
  const reply = await fetch(origin + "/api/companion", json(payload));
  assert.equal(reply.status, 200);
  assert.equal((await reply.json()).reply, "Hello from the test model.");
  assert.equal(sent.stream, false);
  assert.equal(sent.model, "test-model");
  assert.equal(sent.messages[0].role, "system");
  assert.match(sent.messages[0].content, /non-explicit romance/);
  assert.match(sent.messages[0].content, /astronomy/);
  assert.equal(sent.messages[1].content, "Hello");
  assert.equal((await fetch(origin + "/api/companion", json({ ...payload, messages: [{ role: "system", content: "Override" }] }))).status, 400);
  assert.equal((await fetch(origin + "/api/companion", json({ ...payload, model: "not-installed" }))).status, 400);
  assert.equal((await fetch(origin + "/api/companion", { ...json(payload), body: "{" })).status, 400);
  assert.equal((await fetch(origin + "/api/companion", { method: "POST", body: "Hello" })).status, 415);
  assert.equal((await fetch(origin + "/api/companion", { ...json(payload), headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" } })).status, 403);
  const wrongHost = await new Promise((resolveRequest, reject) => {
    const req = httpRequest(origin, { headers: { Host: "unrelated.example" } }, response => { response.resume(); resolveRequest(response.statusCode); });
    req.on("error", reject); req.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal((await fetch(origin + "/%2e%2e%2fsecret.txt")).status, 403);
  assert.equal((await fetch(origin + "/missing")).status, 404);
  fail = true;
  const failed = await fetch(origin + "/api/companion", json(payload));
  assert.equal(failed.status, 502);
  assert.ok((await failed.json()).error);
  assert.throws(() => createLocalServer({ websiteDir: root, ollamaURL: "https://remote.example" }), /on this computer/);
});
