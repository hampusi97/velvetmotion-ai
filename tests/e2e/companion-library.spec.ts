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

test("Settings shares the current engine status and can refresh it", async ({ page }) => {
  let probes = 0;
  await page.route("http://127.0.0.1:8787/api/health", (route) => {
    probes += 1;
    return route.fulfill({
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { totalRamGb: 32, cpuCores: 8, engines: {} },
    });
  });

  await page.goto("/?view=obsolete-view");
  await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
  await expect.poll(() => probes).toBe(1);
  await page.getByRole("button", { name: "Open Settings & Backup" }).click();
  await expect(page.getByText(/HW: 32 GB RAM/)).toBeVisible();
  expect(probes).toBe(1);
  await page.getByRole("button", { name: "Test Local Connection" }).click();
  await expect(page.getByText(/Probed :5001/)).toBeVisible();
  expect(probes).toBe(2);
});

test("Explore search is visible and opens the matching catalog profile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find your companion", exact: true })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search companions" });
  await expect(search).toBeVisible();
  await search.fill("Chloe");
  const cards = page.getByRole("list", { name: "Companion portraits" });
  const chat = cards.getByRole("link", { name: "Chat with Chloe, 22", exact: true });
  await expect(chat).toHaveAttribute("href", "/chat/?companion=chloe-parker");
  await chat.click();
  await expect(page.getByPlaceholder("Message Chloe...", { exact: true })).toBeVisible();
});

test("Library links restore search and discrete filters through browser history", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Companion Library", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search companions" });
  const personality = page.getByRole("group", { name: "Personality" });
  const sweetheart = personality.getByRole("button", { name: "Sweetheart", exact: true });
  await search.fill("Chloe");
  await sweetheart.click();
  await expect(search).toHaveValue("Chloe");
  await expect(sweetheart).toHaveAttribute("aria-pressed", "true");
  const saved = page.getByRole("button", { name: /^Saved/ });
  await saved.click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(saved).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(saved).toHaveAttribute("aria-pressed", "false");
  await expect(search).toHaveValue("Chloe");
  await expect(sweetheart).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(saved).toHaveAttribute("aria-pressed", "true");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy filter link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Filter link copied." })).toBeVisible();
  const shareUrl = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(shareUrl.pathname).toBe("/companions/");
  expect(Object.fromEntries(shareUrl.searchParams)).toEqual({ q: "Chloe", category: "Sweetheart", saved: "1" });
  await page.goto(shareUrl.href);
  await expect(search).toHaveValue("Chloe");
  await expect(sweetheart).toHaveAttribute("aria-pressed", "true");
  await expect(saved).toHaveAttribute("aria-pressed", "true");
  await saved.click();
  await page.getByRole("button", { name: /Meet Chloe/ }).first().click();
  await page.getByRole("button", { name: "Sweetheart", exact: true }).click();
  await expect(page).toHaveURL(/tag=Sweetheart/);
  await expect(sweetheart).toHaveAttribute("aria-pressed", "false");
  await expect(search).toHaveValue("Chloe");
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
  await expect(page).toHaveURL(/\?saved=1/);
  await page.reload();
  await expect(page.getByRole("button", { name: /Saved 1/ })).toHaveAttribute("aria-pressed", "true");
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
  await page.evaluate(() => window.scrollTo(0, 0));
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
  await expect(
    page.getByRole("alert").filter({ hasText: "ComfyUI offline" }),
  ).toBeVisible();
  await expect(
    page.getByAltText("Portrait of Chloe", { exact: true }),
  ).toHaveAttribute("src", originalPortrait!);
  await page.getByRole("button", { name: "Their story", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
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

  await page.evaluate(() => localStorage.removeItem("vm-chat-chloe-parker"));
  await page.goto("/");
  const shelf = page.getByRole("region", { name: "Continue chatting" });
  await expect(shelf.getByRole("link", { name: "Continue chat with Chloe" })).toBeVisible();
  await expect(shelf.getByText("How is your evening going?")).toHaveCount(0);
  await shelf.getByRole("link", { name: "Continue chat with Chloe" }).click();
  await expect(page.getByText("How is your evening going?", { exact: true }).first()).toBeVisible();
});

test("Explore resumes legacy conversations and skips unopened threads", async ({ page }) => {
  await page.goto("/");
  const shelf = page.getByRole("region", { name: "Continue chatting" });
  await expect(page.getByRole("button", { name: "Open Settings & Backup" })).toBeVisible();
  await expect(shelf).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem("vm-chat-chloe-parker", JSON.stringify([{ role: "assistant", content: "An opening greeting" }]));
    localStorage.setItem("vm-chat-maya-solis", JSON.stringify([{ role: "user", content: "Can we pick up our weekend plans?" }]));
  });
  await page.reload();
  await expect(shelf.getByRole("link", { name: "Continue chat with Maya" })).toBeVisible();
  await expect(shelf.getByRole("link", { name: "Continue chat with Chloe" })).toHaveCount(0);
  await expect(shelf.getByText("Can we pick up our weekend plans?")).toHaveCount(0);
});
