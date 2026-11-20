import test from "node:test";
import assert from "node:assert/strict";
import { detectVoiceAction } from "./voiceCommands";

test("detects explicit in-call voice controls", () => {
  assert.equal(detectVoiceAction("Jarvis, end the call."), "end-call");
  assert.equal(detectVoiceAction("stop listening"), "pause-listening");
  assert.equal(detectVoiceAction("Resume listening!"), "resume-listening");
});
test("does not interpret general conversation or arbitrary system commands", () => {
  assert.equal(detectVoiceAction("Tell me a story about Jarvis ending a call"), null);
  assert.equal(detectVoiceAction("delete all my files"), null);
  assert.equal(detectVoiceAction("stop listening to that song"), null);
});
