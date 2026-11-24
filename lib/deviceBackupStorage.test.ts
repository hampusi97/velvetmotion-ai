import "fake-indexeddb/auto";
import { IDBObjectStore as FakeObjectStore } from "fake-indexeddb";
import Dexie from "dexie";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyBackup, previewDeviceBackup } from "./deviceBackup";
import { exportFullBackupJson, importFullBackupJson } from "./db";

const values = new Map<string, string>();
let failKey = "";
const storage = {
  get length() {
    return values.size;
  },
  key: (index: number) => [...values.keys()][index] || null,
  getItem: (key: string) => values.get(key) ?? null,
  removeItem: (key: string) => {
    values.delete(key);
  },
  setItem: (key: string, value: string) => {
    if (key === failKey) {
      failKey = "";
      throw new Error("Simulated quota");
    }
    values.set(key, value);
  },
};
const windowFixture = Object.assign(new EventTarget(), {
  localStorage: storage,
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: windowFixture,
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
});
let probe: Dexie;

test.before(async () => {
  await exportFullBackupJson();
  probe = new Dexie("velvetmotion");
  await probe.open();
});
test.beforeEach(async () => {
  values.clear();
  failKey = "";
  for (const table of probe.tables) await table.clear();
});
test.after(() => {
  probe.close();
});

test("exports every content table, preserves portraits and omits provider credentials from both stores", async () => {
  values.set(
    "vm-imported-cards",
    '[{"id":"noor","name":"Noor","age":33,"avatar":"data:image/png;base64,AQID"}]',
  );
  values.set("vm:favorite-companions", '["noor"]');
  values.set("vm_prog_noor", '{"xp":40}');
  values.set("velvetmotion_llm_settings", '{"customApiKey":"private"}');
  await probe
    .table("settings")
    .put({
      key: "vm-advanced-config",
      value: { telegramBotToken: "private" },
      updatedAt: 2,
    });
  await probe
    .table("branches")
    .put({
      id: "noor-alt",
      characterId: "noor",
      branchId: "alt",
      label: "Alternate",
      messages: [{ role: "user", content: "Hi" }],
      createdAt: 1,
    });
  const json = await exportFullBackupJson();
  const result = previewDeviceBackup(json);
  assert.equal(result.source, "v3");
  assert.equal(result.rows, 1);
  assert.ok(json.includes("data:image/png;base64,AQID"));
  assert.ok(json.includes("vm_prog_noor"));
  assert.ok(!json.includes("private"));
});
test("preview makes no changes; restore adds new records and preserves existing conversations by default", async () => {
  values.set("vm-coins", "50");
  values.set(
    "vm-chat-local-only",
    '[{"role":"user","content":"Current local"}]',
  );
  await probe
    .table("chats")
    .put({
      id: "existing",
      messages: [{ role: "user", content: "Current DB" }],
      updatedAt: 2,
    });
  const b = emptyBackup();
  b.localStorage["vm-coins"] = "900";
  b.localStorage["vm-chat-existing"] = '[{"role":"user","content":"Backup"}]';
  b.indexedDb.chats = [
    { id: "existing", messages: [], updatedAt: 1 },
    { id: "local-only", messages: [], updatedAt: 1 },
    { id: "new", messages: [], updatedAt: 1 },
  ];
  previewDeviceBackup(JSON.stringify(b));
  assert.equal(values.get("vm-coins"), "50");
  const result = await importFullBackupJson(JSON.stringify(b));
  assert.equal(result.restoredRows, 1);
  assert.equal(values.get("vm-coins"), "50");
  assert.equal(values.has("vm-chat-existing"), false);
  assert.equal(
    (await probe.table("chats").get("existing")).messages[0].content,
    "Current DB",
  );
  assert.equal(await probe.table("chats").get("local-only"), undefined);
});
test("explicit backup priority replaces matching records and keeps unrelated records", async () => {
  values.set("vm-coins", "50");
  values.set("vm-chat-one", "[]");
  await probe.table("chats").bulkPut([
    { id: "one", messages: [], updatedAt: 1 },
    { id: "keep", messages: [], updatedAt: 1 },
  ]);
  const b = emptyBackup();
  b.localStorage["vm-coins"] = "900";
  b.localStorage["vm-chat-one"] = '[{"role":"user","content":"Backup"}]';
  b.indexedDb.chats = [
    {
      id: "one",
      messages: [{ role: "user", content: "Backup" }],
      updatedAt: 2,
    },
  ];
  await importFullBackupJson(JSON.stringify(b), "use-backup");
  assert.equal(values.get("vm-coins"), "900");
  assert.equal(
    (await probe.table("chats").get("one")).messages[0].content,
    "Backup",
  );
  assert.ok(await probe.table("chats").get("keep"));
});
test("local storage failure rolls back earlier writes and leaves IndexedDB unchanged", async () => {
  values.set("vm-coins", "50");
  failKey = "vm-ui-sound";
  const b = emptyBackup();
  b.localStorage = { "vm-coins": "900", "vm-ui-sound": "false" };
  b.indexedDb.chats = [{ id: "new", messages: [], updatedAt: 1 }];
  await assert.rejects(
    importFullBackupJson(JSON.stringify(b), "use-backup"),
    /rolled back/,
  );
  assert.equal(values.get("vm-coins"), "50");
  assert.equal(values.has("vm-ui-sound"), false);
  assert.equal(await probe.table("chats").count(), 0);
});
test("late database failure rolls back all database writes and restores local values", async (t) => {
  values.set("vm-coins", "50");
  const b = emptyBackup();
  b.localStorage["vm-coins"] = "900";
  b.indexedDb.chats = [{ id: "new", messages: [], updatedAt: 1 }];
  b.indexedDb.branches = [
    {
      id: "b",
      characterId: "new",
      branchId: "alt",
      label: "Alternate",
      messages: [],
      createdAt: 1,
    },
  ];
  const original = FakeObjectStore.prototype.put;
  FakeObjectStore.prototype.put = function (value, key) {
    if (this.name === "branches") throw new Error("Simulated database quota");
    return original.call(this, value, key);
  };
  t.after(() => {
    FakeObjectStore.prototype.put = original;
  });
  await assert.rejects(
    importFullBackupJson(JSON.stringify(b), "use-backup"),
    /rolled back/,
  );
  assert.equal(values.get("vm-coins"), "50");
  assert.equal(await probe.table("chats").count(), 0);
  assert.equal(await probe.table("branches").count(), 0);
});
