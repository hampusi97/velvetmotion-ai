import test from "node:test";
import assert from "node:assert/strict";
import { checkHardwareReadiness } from "./hardwareCheck";

test("checkHardwareReadiness returns safe defaults in non-browser environment", async () => {
  const result = await checkHardwareReadiness();
  assert.deepEqual(result, { gpu: false, memory: false, audio: false });
});
