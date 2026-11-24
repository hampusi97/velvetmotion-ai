import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const imported = {
  id: "backup-noor",
  name: "Noor",
  age: 33,
  tagline: "A fictional observatory engineer",
  category: "Intellectual",
  avatar:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  voiceIntro: "Hello",
  initialMessage: "The telescope is ready.",
  tags: ["Science"],
  intimacy: 0,
  voice: { label: "Calm", pitch: 1, rate: 1, style: "Thoughtful" },
  personality: "Thoughtful and kind",
  traits: ["Curious"],
  background: "A fictional adult observatory engineer.",
  figure: "Adult portrait",
  kink: "Romance",
  reply: "Hello",
};
const fixture = () => ({
  schema: "velvetmotion-backup-v3",
  exportedAt: new Date().toISOString(),
  localStorage: {
    "vm-imported-cards": JSON.stringify([imported]),
    "vm:favorite-companions": '["backup-noor"]',
    "vm_prog_backup-noor": '{"xp":40}',
    "vm-ui-sound": "false",
  },
  indexedDb: {
    chats: [],
    memory: [],
    matches: [],
    gallery: [],
    progression: [],
    companions: [],
    settings: [],
    branches: [
      {
        id: "backup-noor-alt",
        characterId: "backup-noor",
        branchId: "alt",
        label: "Alternate",
        messages: [{ role: "user", content: "Hello from the other branch" }],
        createdAt: 12,
      },
    ],
  },
});

test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) =>
    route.request().url().startsWith("http://127.0.0.1:33003")
      ? route.continue()
      : route.abort(),
  );
  await context.addInitScript(() => {
    if (localStorage.getItem("qa-backup-ready")) return;
    localStorage.setItem("qa-backup-ready", "true");
    localStorage.setItem("velvet-age", "true");
    localStorage.setItem(
      "vm-user",
      JSON.stringify({ username: "Backup QA", joinedAt: Date.now() }),
    );
    localStorage.setItem("vm-ui-sound", "true");
    localStorage.setItem(
      "velvetmotion_llm_settings",
      JSON.stringify({ customApiKey: "qa-provider-secret" }),
    );
  });
});
async function openSettings(page: import("@playwright/test").Page) {
  await page.goto("/companions/");
  await page
    .getByRole("button", { name: "Open Settings & Backup", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Settings and backup" });
}

test("backup preview does not write data, restore merges a character and exports portrait, progression and branch content", async ({
  page,
}, info) => {
  const dialog = await openSettings(page);
  await dialog
    .getByLabel("Choose content backup")
    .setInputFiles({
      name: "private-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture())),
    });
  await expect(
    dialog.getByRole("heading", {
      name: "Restore preview: private-backup.json",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("vm-imported-cards")),
  ).toBeNull();
  await dialog
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(
    dialog.getByRole("status").filter({ hasText: "Restored" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("vm-ui-sound"))).toBe(
    "true",
  );
  const pending = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Export content backup", exact: true })
    .click();
  const download = await pending;
  const json = await readFile((await download.path())!, "utf8");
  const restored = JSON.parse(json);
  expect(restored.schema).toBe("velvetmotion-backup-v3");
  expect(restored.localStorage["vm-imported-cards"]).toContain(imported.avatar);
  expect(restored.localStorage["vm_prog_backup-noor"]).toBe('{"xp":40}');
  expect(restored.indexedDb.branches[0].label).toBe("Alternate");
  expect(json).not.toContain("qa-provider-secret");
  await page.screenshot({ path: info.outputPath("backup-restored.png") });
  await dialog
    .getByRole("button", { name: "Close Settings", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Search companions" }).fill("Noor");
  await expect(page.getByRole("button", { name: /Meet Noor/ })).toBeVisible();
});

test("invalid backups fail before writing and matching settings require explicit backup priority", async ({
  page,
}) => {
  const dialog = await openSettings(page);
  const bad = fixture();
  bad.indexedDb.branches[0].messages[0].role = "system";
  await dialog
    .getByLabel("Choose content backup")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bad)),
    });
  await expect(dialog.getByRole("alert")).toContainText("Invalid record");
  expect(
    await page.evaluate(() => localStorage.getItem("vm-imported-cards")),
  ).toBeNull();
  await dialog
    .getByLabel("Choose content backup")
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture())),
    });
  await dialog.getByLabel("Backup conflict policy").selectOption("use-backup");
  await dialog
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(
    dialog.getByRole("status").filter({ hasText: "Restored" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("vm-ui-sound"))).toBe(
    "false",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("velvetmotion_llm_settings") || "{}")
          .customApiKey,
    ),
  ).toBe("qa-provider-secret");
});
