import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ context }) => {
  // Test-only local profiles. Never contact account, analytics, or inference services.
  await context.route("**/*", (route) =>
    route.request().url().startsWith("http://127.0.0.1:33003")
      ? route.continue()
      : route.abort(),
  );
  await context.addInitScript(() => {
    if (localStorage.getItem("qa-initialized")) return;
    localStorage.setItem("qa-initialized", "true");
    localStorage.setItem("velvet-age", "true");
    localStorage.setItem(
      "vm-user",
      JSON.stringify({ username: "QA Guest", joinedAt: Date.now() }),
    );
    localStorage.setItem(
      "vm-media-backend",
      JSON.stringify({
        localImageMode: "comfy",
        localImageBase: "http://127.0.0.1:9189",
      }),
    );
  });
});

test("discovery filters and favorites persist, with an actionable empty state", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/companions/");
  await expect(
    page.getByRole("heading", { name: /Extraordinary characters/ }),
  ).toBeVisible();
  await expect(page.locator("article.girl-card")).toHaveCount(47);
  await page
    .getByRole("button", { name: /Save .* to favorites/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Saved 1/ }).click();
  await expect(page.locator("article.girl-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Saved 1/ }).click();
  await expect(page.locator("article.girl-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear all filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Interests", { exact: true }).selectOption("Music");
  await expect(page.locator("article.girl-card").first()).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search companions" })
    .fill("zzzzzzzz");
  await expect(
    page.getByRole("heading", { name: "A different kind of connection?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore all companions", exact: true })
    .click();
  await expect(page.locator("article.girl-card")).toHaveCount(47);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("companions.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("profile edits survive reload and failed portrait generation keeps the previous portrait", async ({
  page,
}, info) => {
  await page.goto("/companions/");
  await page
    .getByRole("button", { name: /Meet Chloe/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Chloe", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page
    .getByLabel("Introduction", { exact: true })
    .fill("A thoughtful fictional companion for the next chapter.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved." }),
  ).toBeVisible();
  const originalPortrait = await page
    .getByAltText("Portrait of Chloe", { exact: true })
    .getAttribute("src");
  await page
    .getByRole("button", { name: "Generate locally", exact: true })
    .click();
  await expect(page.getByRole("alert").filter({ hasText: "ComfyUI offline" })).toBeVisible();
  await expect(
    page.getByAltText("Portrait of Chloe", { exact: true }),
  ).toHaveAttribute("src", originalPortrait!);
  await page.getByRole("button", { name: "Their story", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("profile.png"),
    fullPage: true,
  });
  await page.goto("/companions/");
  await page
    .getByRole("searchbox", { name: "Search companions" })
    .fill("thoughtful next chapter");
  await expect(page.locator("article.girl-card")).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("searchbox", { name: "Search companions" })
    .fill("thoughtful next chapter");
  await expect(page.locator("article.girl-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("original starter is discoverable, exports V3 and stays selected in Studio", async ({
  page,
}) => {
  await page.goto("/?view=import");
  await expect(
    page.getByRole("heading", {
      name: "Original starter companions",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add companion", exact: true }),
  ).toHaveCount(10);
  await page
    .getByRole("button", { name: "Add companion", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Added Vivienne Ash" }),
  ).toBeVisible();
  await page.goto("/companions/");
  await page
    .getByRole("searchbox", { name: "Search companions" })
    .fill("Vivienne");
  await expect(page.locator("article.girl-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Meet Vivienne/ }).click();
  await expect(
    page.getByRole("heading", { name: "Vivienne Ash", exact: true }),
  ).toBeVisible();
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "V3 JSON", exact: true }).click();
  const download = await pendingDownload;
  const card = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(card.spec).toBe("chara_card_v3");
  expect(card.data.name).toBe("Vivienne Ash");
  expect(card.data.extensions.velvetmotion.age).toBe(32);
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(
    page.getByText("About You", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Studio", exact: true }).click();
  await expect(page.getByLabel("Companion", { exact: true })).toHaveValue(
    "original-vivienne",
  );
  await page.goto("/?view=my-girls");
  await expect(
    page.getByRole("group", { name: "Vivienne Ash", exact: true }),
  ).toBeVisible();
  await expect(page.locator("button button")).toHaveCount(0);
});

test("offline chat keeps the user message and retries without fabricated replies or duplicate turns", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    localStorage.setItem(
      "velvetmotion_llm_settings",
      JSON.stringify({
        provider: "custom",
        customBaseUrl: "http://127.0.0.1:9189/v1",
      }),
    ),
  );
  await page.goto("/companions/");
  await page
    .getByRole("button", { name: /Meet Chloe/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start a conversation", exact: true })
    .click();
  await expect(page.getByText(/Can.t sleep again/).first()).toBeVisible();
  await page
    .getByPlaceholder("Message Chloe...", { exact: true })
    .fill("How is your evening going?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The AI model isn't responding" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry message", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry message", exact: true }),
  ).toBeEnabled();
  const messages = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("vm-chat-chloe-parker") || "[]",
      ) as Array<{ role: string; content: string }>,
  );
  expect(
    messages.filter(
      (m) => m.role === "user" && m.content === "How is your evening going?",
    ),
  ).toHaveLength(1);
  expect(
    messages.filter(
      (m) =>
        m.role === "assistant" &&
        m.content.includes("AI model isn't responding"),
    ),
  ).toHaveLength(0);
  expect(messages.filter((m) => m.role === "assistant")).toHaveLength(1); // The declared opening line only.
});
