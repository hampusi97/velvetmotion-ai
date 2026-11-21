import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const portrait = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOo9loKAAKuAWt79VQzAAAAAElFTkSuQmCC",
  "base64",
);

test("Studio keeps a ComfyUI photo downloadable on quota failure and saves it once on retry", async ({ page }) => {
  const origin = "http://127.0.0.1:33003";
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  await page.route("http://127.0.0.1:8188/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else if (path === "/object_info/CheckpointLoaderSimple") {
      await route.fulfill({ headers, json: {
        CheckpointLoaderSimple: { input: { required: { ckpt_name: [["qa-portrait.safetensors"]] } } },
      } });
    } else if (path === "/prompt") {
      await route.fulfill({ headers, json: { prompt_id: "qa-portrait" } });
    } else if (path === "/history/qa-portrait") {
      await route.fulfill({ headers, json: {
        "qa-portrait": { outputs: { "9": { images: [{ filename: "portrait.png", type: "output" }] } } },
      } });
    } else if (path === "/view") {
      await route.fulfill({ headers, contentType: "image/png", body: portrait });
    } else {
      await route.fulfill({ status: 404, headers });
    }
  });
  await page.addInitScript(() => {
    localStorage.setItem("velvet-age", "true");
    localStorage.setItem("vm-user", JSON.stringify({ username: "QA Guest", joinedAt: Date.now() }));
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === "vm-gallery" && !sessionStorage.getItem("qa:allow-gallery")) {
        throw new DOMException("Test quota exceeded", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });

  await page.goto("/studio/");
  await expect(page.getByLabel(/choose an installed checkpoint/)).toHaveValue("qa-portrait.safetensors");
  const companionId = await page.getByLabel("Companion", { exact: true }).inputValue();
  await page.getByLabel(/Negative prompt/).fill("");
  await page.getByRole("button", { name: "Generate Photo", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Collection could not save this file" })).toBeVisible();
  const preview = page.getByRole("img", { name: "Generated studio photo" });
  await expect(preview).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.getByText("Saved to Collection.", { exact: true })).toHaveCount(0);

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download photo" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`velvetmotion-${companionId}.png`);
  expect(await readFile((await download.path())!)).toEqual(portrait);

  await page.evaluate(() => sessionStorage.setItem("qa:allow-gallery", "true"));
  const save = page.getByRole("button", { name: "Save to Collection", exact: true });
  await save.click();
  await expect(page.getByText("Saved to Collection.", { exact: true })).toBeVisible();
  await save.click();
  await page.goto("/collection/");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("vm-gallery") || "[]"));
  expect(saved).toHaveLength(1);
  expect(saved[0].characterId).toBe(companionId);
  expect(saved[0].url).toBe(`data:image/png;base64,${portrait.toString("base64")}`);
  const photo = page.getByRole("img", { name: / · Neon Noir$/ });
  await expect(photo).toHaveCount(1);
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
});
