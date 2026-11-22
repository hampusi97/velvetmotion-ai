import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) =>
    route.request().url().startsWith("http://127.0.0.1:33003/")
      ? route.continue()
      : route.abort(),
  );
});

test("Interracial stories stay age-gated and support branching and direct links", async ({ page }) => {
  await page.goto("/?view=packs&theme=interracial");
  await expect(page.getByRole("button", { name: /The Last Seat/ })).toHaveCount(0);
  await page.getByRole("button", { name: /I am 18\+/ }).click();

  await expect(page.getByRole("button", { name: "Interracial romance", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /The Print Exchange/ })).toBeVisible();
  await page.getByRole("button", { name: /The Last Seat/ }).click();
  await expect(page.getByRole("heading", { name: "Two mugs" })).toBeVisible();
  const portrait = page.locator('img[src="/portraits/romance-nia.webp"]');
  await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Say you felt jealous" }).click();
  await expect(page.getByRole("heading", { name: "The part you rehearsed" })).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await page.getByRole("button", { name: "Take ten minutes" }).click();
  await page.getByRole("button", { name: "Leave it here tonight" }).click();
  await expect(page.getByRole("heading", { name: "The porch light" })).toBeVisible();
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByRole("heading", { name: "Two mugs" })).toBeVisible();

  await page.goto("/?view=packs&pack=the-print-exchange");
  await expect(page.getByRole("heading", { name: "The Print Exchange", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The last hour of the show" })).toBeVisible();
});

test("Guided romance links open quiet sessions with a pausable timer", async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem("velvet-age", "true"));
  await page.goto("/?view=packs&theme=interracial");
  await page.getByRole("link", { name: "Browse guided romance sessions" }).click();

  await expect(page).toHaveURL(/\/joi\/?\?theme=interracial$/);
  await expect(page.getByRole("button", { name: "Interracial romance", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /After the Second Bell/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Instant Dirty Talk/ })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("link", { name: "Browse guided romance sessions" })).toBeVisible();

  await page.goto("/joi/?session=last-track-debrief");
  await expect(page.getByRole("heading", { name: "Last Track Debrief" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Room on the sofa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Auto-Voice Off" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Voice Countdown/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Start timer" }).click();
  await expect(page.getByText(/\d+s remaining/)).toBeVisible();
  await page.getByRole("button", { name: "Pause session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Session paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Speak Step" })).toBeDisabled();
  await page.getByRole("button", { name: "Resume session" }).click();
  await expect(page.getByText(/\d+s remaining/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Speak Step" })).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The good table" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
});

test("Kink stories are discoverable and keep their optional and stop branches distinct", async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem("velvet-age", "true"));
  await page.goto("/");
  await page.getByRole("link", { name: "Kink roleplay", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kink roleplay", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /The Missed Call/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /The Last Seat/ })).toHaveCount(0);
  await page.getByRole("button", { name: /After the Final Cue/ }).click();
  await expect(page.getByRole("heading", { name: "Under the work light" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voice Off", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Opt in to the staged cuckold scene" }).click();
  await page.getByRole("button", { name: "Say curtain and stop" }).click();
  await expect(page.getByRole("heading", { name: "The house lights come up" })).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await page.getByRole("button", { name: /Request the agreed size humiliation/ }).click();
  await expect(page.getByRole("heading", { name: "One agreed tease" })).toBeVisible();
  await page.getByRole("button", { name: "Ask how the fictional breeding scene would work" }).click();
  await page.getByRole("button", { name: "Opt in to the imaginary pregnancy line" }).click();
  await expect(page.getByRole("heading", { name: "An imagined future" })).toBeVisible();

  await page.goto("/?view=packs&theme=kink&pack=the-missed-call");
  await expect(page.getByRole("heading", { name: "The Missed Call" })).toBeVisible();
  await page.getByRole("button", { name: "End the relationship", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Separate keys" })).toBeVisible();
});

test("Guided kink cues support opt-in, skip, and Back through visited steps", async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem("velvet-age", "true"));
  await page.goto("/?view=packs&theme=kink");
  await page.getByRole("link", { name: "Browse guided kink sessions" }).click();
  await expect(page.getByRole("button", { name: "Kink roleplay", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Sunday in Five Years/ })).toBeVisible();
  await page.getByRole("button", { name: /The Spare Key/ }).click();
  await expect(page.getByRole("button", { name: "Auto-Voice Off" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The key on the table" })).toBeVisible();

  const next = page.getByRole("button", { name: "Next", exact: true });
  const back = page.getByRole("button", { name: "Back", exact: true });
  for (const title of ["The last table", "Stay for another", "Choose the tone"]) {
    await next.click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  await page.getByRole("button", { name: "Skip optional step" }).click();
  await expect(page.getByRole("heading", { name: "In the doorway" })).toBeVisible();
  await back.click();
  await expect(page.getByRole("heading", { name: "Choose the tone" })).toBeVisible();
  await page.getByRole("button", { name: "Opt in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Optional size tease" })).toBeVisible();
  await page.getByRole("button", { name: "Skip to check-in" }).click();
  await expect(page.getByRole("heading", { name: "Out of character" })).toBeVisible();
  await back.click();
  await expect(page.getByRole("heading", { name: "Optional size tease" })).toBeVisible();
});
