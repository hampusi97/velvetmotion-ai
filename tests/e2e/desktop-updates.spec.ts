import { expect, test } from "@playwright/test";

test("desktop checks share one request and failed installs and restarts remain actionable", async ({ page }) => {
  const origin = "http://127.0.0.1:33003";
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  await page.addInitScript(() => {
    localStorage.setItem("velvet-age", "true");
    localStorage.setItem("vm-user", JSON.stringify({ username: "QA Guest", joinedAt: Date.now() }));
    localStorage.setItem("vm:auto-signed-desktop-updates", "off");

    const count = (kind: string) => {
      const key = `qa:${kind}-count`;
      const next = Number(sessionStorage.getItem(key) || 0) + 1;
      sessionStorage.setItem(key, String(next));
      return next;
    };
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {
        invoke: async (command: string) => {
          switch (command) {
            case "desktop_signed_updates_enabled":
              return true;
            case "desktop_app_version":
              return "1.2.0";
            case "check_signed_desktop_update":
              count("check");
              if (!sessionStorage.getItem("qa:update-ready")) return { enabled: true, available: false };
              await new Promise<void>((resolve) =>
                window.addEventListener("qa:release-update-check", () => resolve(), { once: true }),
              );
              return { enabled: true, available: true, version: "1.2.3" };
            case "install_signed_desktop_update":
              if (count("install") === 1) throw new Error("Connection dropped");
              return "Installed signed VelvetMotion update 1.2.4. Restart to use the new version.";
            case "restart_desktop_after_update":
              count("restart");
              throw new Error("Restart unavailable");
            default:
              return {};
          }
        },
      },
    });
  });

  await page.goto("/download/");
  const checks = () => page.evaluate(() => Number(sessionStorage.getItem("qa:check-count") || 0));
  await expect.poll(checks).toBeGreaterThan(0);
  const checkCount = await checks();
  await page.evaluate(() => sessionStorage.setItem("qa:update-ready", "true"));

  const checkButton = page.getByRole("button", { name: "Check for updates now" });
  await checkButton.click();
  await expect.poll(checks).toBe(checkCount + 1);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("qa:release-update-check"));
  });
  await expect(page.getByText("A signed update 1.2.3 is available.")).toBeVisible();
  expect(await checks()).toBe(checkCount + 1);

  await page.getByRole("button", { name: "Install verified update" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not install the signed update." })).toBeVisible();
  await page.getByRole("button", { name: "Retry verified update" }).click();
  await expect(page.getByText("VelvetMotion desktop update 1.2.4")).toBeVisible();

  await page.getByRole("button", { name: "Dismiss update notice" }).click();
  await expect(page.getByRole("button", { name: "Restart desktop app" })).toHaveCount(0);
  await checkButton.click();
  expect(await checks()).toBe(checkCount + 1);
  await page.getByRole("button", { name: "Restart desktop app" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Close and reopen the desktop app" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart desktop app" })).toBeEnabled();
});
