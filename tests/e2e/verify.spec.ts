import { test, expect } from "@playwright/test";

test("tools index lists effects", async ({ page }) => {
  await page.goto("/tools/");
  await expect(page.getByText("Photo Tools")).toBeVisible();
  await expect(page.getByText("Nudify")).toBeVisible();
});

test("effect page renders", async ({ page }) => {
  await page.goto("/tools/nudify/");
  await expect(page.getByRole("heading", { name: "Nudify" })).toBeVisible();
});
