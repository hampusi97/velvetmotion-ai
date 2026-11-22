import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) =>
    route.request().url().startsWith("http://127.0.0.1:33003")
      ? route.continue()
      : route.abort(),
  );
  await context.addInitScript(() => {
    if (localStorage.getItem("status-e2e-init")) return;
    localStorage.setItem("status-e2e-init", "true");
    localStorage.setItem("velvet-age", "true");
  });
});

test("standing status and SPH tier persist across reload on a companion profile", async ({ page }) => {
  await page.goto("/?view=profile&companion=chloe-parker");
  await expect(page.getByRole("heading", { name: "Chloe", exact: true })).toBeVisible();

  const cuckoldBtn = page.getByRole("button", { name: "Cuckold", exact: true });
  const tier3Btn = page.getByRole("button", { name: "3", exact: true });
  await cuckoldBtn.click();
  await tier3Btn.click();

  await expect(cuckoldBtn).toHaveAttribute("aria-pressed", "true");
  await expect(tier3Btn).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByRole("button", { name: "Cuckold", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "3", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("legacy goon streak migrates once into relationshipState and removes legacy key", async ({
  page,
}) => {
  await page.goto("/companions/");
  await page.evaluate(() => {
    localStorage.removeItem("velvet:migrated:v1");
    localStorage.removeItem("velvet:rel:__legacy__");
    localStorage.setItem("vm-goon-streak", "12");
  });
  await page.reload();

  const result = await page.evaluate(() => {
    const raw = localStorage.getItem("velvet:rel:__legacy__");
    const parsed = raw ? (JSON.parse(raw) as { streak?: { current?: number } }) : null;
    return {
      streak: parsed?.streak?.current ?? 0,
      legacyKey: localStorage.getItem("vm-goon-streak"),
      migrated: localStorage.getItem("velvet:migrated:v1"),
    };
  });

  expect(result.streak).toBe(12);
  expect(result.legacyKey).toBeNull();
  expect(result.migrated).toBe("1");
});

test("day-7 milestone nudge fires once, dismisses, and does not fire again after reload", async ({
  page,
}) => {
  await page.goto("/?view=profile&companion=chloe-parker");
  await expect(page.getByRole("heading", { name: "Chloe", exact: true })).toBeVisible();

  await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      "velvet:rel:chloe-parker",
      JSON.stringify({
        v: 1,
        companionId: "chloe-parker",
        status: "pussyfree",
        sphTier: 2,
        streak: { current: 7, best: 7, lastDay: today },
        milestones: [],
        sessions: [],
        unlocks: [],
      }),
    );
  });

  await page.reload();
  await expect(page.getByText("A week. You actually did it.")).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByText("A week. You actually did it.")).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("A week. You actually did it.")).toHaveCount(0);
});

test("first-run onboarding appears once and never again after dismissal", async ({ page }) => {
  await page.goto("/companions/");
  const onboarding = page.getByRole("region", { name: "Standing setup" });
  await expect(onboarding).toBeVisible();

  await onboarding.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(onboarding).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("region", { name: "Standing setup" })).toHaveCount(0);
});
