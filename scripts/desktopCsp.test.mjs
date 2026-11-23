import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Tauri permits only the expected local ComfyUI media source", () => {
  const cfg = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const csp = cfg.app?.security?.csp;
  assert.equal(typeof csp, "string");
  const media = csp.split(";").map(s=>s.trim()).find(s=>s.startsWith("media-src ")) || "";
  const connect = csp.split(";").map(s=>s.trim()).find(s=>s.startsWith("connect-src ")) || "";
  assert.ok(media.includes("http://127.0.0.1:8188"), "video playback needs local :8188 in media-src");
  assert.ok(connect.includes("http://127.0.0.1:8188"), "video workflow API needs local :8188 in connect-src");
  assert.ok(connect.includes("http://127.0.0.1:7860"), "A1111 / Forge API needs local :7860 in connect-src");
  assert.ok(!media.split(/\s+/).includes("http:"), "never open media-src to every insecure HTTP origin");
  assert.ok(!media.includes("unsafe-eval"), "media-src should not permit executable code");
});

test("Tauri desktop startup avoids CSP hash lockout and Service Worker hijacking", () => {
  const cfg = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const disabled = cfg.app?.security?.dangerousDisableAssetCspModification;
  assert.ok(
    Array.isArray(disabled) && disabled.includes("script-src") && disabled.includes("style-src"),
    "Tauri must disable script-src/style-src hash modification so Next.js inline hydration scripts are not blocked",
  );
  const csp = cfg.app?.security?.csp || "";
  assert.ok(csp.includes("worker-src 'self' blob:"), "CSP should permit same-origin and blob workers");

  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.ok(layout.includes("tauri.localhost"), "layout.tsx must detect Tauri desktop host before registering SW");
  assert.ok(layout.includes("vm-boot-fallback"), "layout.tsx must wire startup watchdog recovery UI");

  const sw = readFileSync("public/sw.js", "utf8");
  assert.ok(sw.includes("tauri.localhost"), "sw.js must never intercept Tauri desktop origin");
  assert.ok(!sw.includes('PRECACHE = ["/"'), "sw.js must not precache / HTML with rotating chunk hashes");

  const pwa = readFileSync("lib/pwaProactive.ts", "utf8");
  assert.ok(pwa.includes("tauri.localhost"), "pwaProactive.ts must skip SW registration inside Tauri");

  const shell = readFileSync("components/AppShell.tsx", "utf8");
  assert.ok(shell.includes('id="vm-boot-shell"'), "AppShell must render a visible boot shell before hydration");
  assert.ok(shell.includes("__VM_HYDRATED__"), "AppShell must signal client hydration completion");

  const mainWin = cfg.app?.windows?.[0] || {};
  assert.ok(
    typeof mainWin.additionalBrowserArgs === "string" &&
      mainWin.additionalBrowserArgs.includes("--disable-gpu-compositing") &&
      mainWin.additionalBrowserArgs.includes("CalculateNativeWinOcclusion"),
    "Windows WebView2 config must disable DirectComposition GPU compositing and native occlusion by default",
  );

  const mainRs = readFileSync("src-tauri/src/main.rs", "utf8");
  assert.ok(
    mainRs.includes("additional_browser_args") && mainRs.includes("webview-v3-safe"),
    "main.rs must pass browser args directly to WebviewWindowBuilder with an isolated v3 WebView2 data directory",
  );
});
