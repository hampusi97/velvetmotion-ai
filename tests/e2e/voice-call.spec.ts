import { test, expect } from "@playwright/test";

test("voice calls recover from mic denial and ignore replies after hangup", async ({ page }) => {
  const origin = "http://127.0.0.1:33003";
  const endpoint = "http://127.0.0.1:9189/v1/chat/completions";
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );

  let releaseReply!: () => void;
  const pendingReply = new Promise<void>((resolve) => { releaseReply = resolve; });
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
      return;
    }
    const oldTurn = route.request().postData()?.includes("first call");
    if (oldTurn) await pendingReply;
    await route.fulfill({
      ...(oldTurn ? { status: 200 } : { status: 503 }),
      headers: { "access-control-allow-origin": origin },
      json: oldTurn ? { choices: [{ message: { content: "This reply belongs to the old call." } }] } : {},
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem("velvet-age", "true");
    localStorage.setItem("vm-user", JSON.stringify({ username: "QA Guest", joinedAt: Date.now() }));
    localStorage.setItem("vm-voice-engine", "browser-speech");
    localStorage.setItem("velvetmotion_llm_settings", JSON.stringify({
      provider: "custom",
      customBaseUrl: "http://127.0.0.1:9189/v1",
    }));

    let denied = false;
    class Recognition {
      onerror?: (event: { error: string }) => void;
      onstart?: () => void;
      onresult?: (event: { results: { 0: { transcript: string }; isFinal: boolean }[] }) => void;
      onInput = (event: Event) => {
        this.onresult?.({
          results: [{ 0: { transcript: (event as CustomEvent<string>).detail }, isFinal: true }],
        });
      };
      abort() {
        window.removeEventListener("qa:voice-input", this.onInput);
      }
      start() {
        queueMicrotask(() => {
          if (!denied) {
            denied = true;
            this.onerror?.({ error: "not-allowed" });
            return;
          }
          window.addEventListener("qa:voice-input", this.onInput);
          this.onstart?.();
        });
      }
    }

    Object.defineProperty(window, "SpeechRecognition", { value: Recognition });
    // Use a matching utterance double so the native voice setter does not
    // reject the synthetic voice returned by the speech engine double.
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class { constructor(public text: string) {} },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel: () => {},
        getVoices: () => [{ name: "Test voice", lang: "en-US" }],
        speak: (utterance: SpeechSynthesisUtterance) => {
          window.dispatchEvent(new CustomEvent("qa:voice-output", { detail: utterance.text }));
          queueMicrotask(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent));
        },
      },
    });
    window.addEventListener("qa:voice-output", (event) => {
      const text = (event as CustomEvent<string>).detail;
      const spoken = JSON.parse(sessionStorage.getItem("qa:spoken") || "[]");
      sessionStorage.setItem("qa:spoken", JSON.stringify([...spoken, text]));
    });
  });

  await page.goto("/companions/");
  await page.getByRole("button", { name: /Meet Chloe/ }).first().click();
  await page.getByRole("button", { name: "Start a conversation", exact: true }).click();
  const start = page.getByRole("button", { name: "Start Voice Call" });
  const dialog = page.getByRole("dialog", { name: /Voice call with Chloe/ });
  await start.click();
  await expect(dialog.getByText(/Microphone access was denied/)).toBeVisible();
  await dialog.getByRole("button", { name: "Retry mic" }).click();
  await expect(dialog.getByText("Listening…", { exact: true })).toBeVisible();

  const sendSpeech = (detail: string) =>
    page.evaluate((text) => window.dispatchEvent(new CustomEvent("qa:voice-input", { detail: text })), detail);
  const requested = page.waitForRequest((request) => request.url() === endpoint && request.method() === "POST");
  await sendSpeech("Please tell me about your first call.");
  await requested;
  await expect(dialog.getByText("Waiting for AI…")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(start).toBeFocused();

  await start.click();
  await expect(dialog.getByText("Listening…", { exact: true })).toBeVisible();
  const response = page.waitForResponse((reply) => reply.url() === endpoint && reply.status() === 200);
  releaseReply();
  await response;
  await sendSpeech("How is your evening going?");
  await expect(dialog.getByText(/The AI model isn't responding/)).toBeVisible();
  await expect(dialog.getByText(/belongs to the old call/)).toHaveCount(0);
  const spoken = await page.evaluate(() => JSON.parse(sessionStorage.getItem("qa:spoken") || "[]"));
  expect(spoken).toHaveLength(2);
  expect(spoken[0]).toBeTruthy();
  expect(spoken[1]).toBe(spoken[0]);
});
