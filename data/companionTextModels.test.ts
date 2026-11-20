import test from "node:test";
import assert from "node:assert/strict";
import { COMPANION_TEXT_MODELS, installedModelNames, isModelInstalled, isOfficialOllamaPreset } from "./companionTextModels";

test("catalog contains five unique models and only official Ollama tags offer a pull command", () => {
  assert.equal(COMPANION_TEXT_MODELS.length, 5);
  assert.equal(new Set(COMPANION_TEXT_MODELS.map(m => m.id)).size, 5);
  for (const model of COMPANION_TEXT_MODELS) {
    assert.match(model.modelPage, /^https:\/\/huggingface\.co\//);
    assert.ok(model.licenseNote.length > 4);
    assert.equal(Boolean(model.ollamaTag), Boolean(model.setupCommand));
  }
  assert.ok(isOfficialOllamaPreset("hermes3:8b"));
  assert.ok(!isOfficialOllamaPreset("unverified:8b"));
});

test("checks exact Ollama model names and rejects malformed tags data", () => {
  const tags = installedModelNames({ models: [{name: "hermes3:8b"}, {name: "yi:9b-v1.5"}, null, {name: 42}] });
  assert.deepEqual(tags, ["hermes3:8b", "yi:9b-v1.5"]);
  assert.ok(isModelInstalled("hermes3:8b", tags));
  assert.equal(isModelInstalled("hermes3:70b", tags), false);
  assert.deepEqual(installedModelNames({error: "offline"}), []);
});
